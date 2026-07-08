import { db } from '../db/db';
import { sendToTopic } from '../ws/broker';

export const notificationService = {
  // Send notification to a specific user ID
  async sendToUser(userId: number, message: string, type: string) {
    try {
      const result = await db.run(
        `INSERT INTO notifications (message, type, read_status, user_id)
         VALUES (?, ?, 0, ?)`,
        [message, type, userId]
      );
      
      // Construct notification client payload immediately without secondary db query
      const formatted = {
        id: result.lastID,
        message: message,
        type: type,
        readStatus: false,
        userId: userId,
        createdAt: new Date().toISOString()
      };
      
      sendToTopic(`/topic/notifications/${userId}`, formatted);
    } catch (err) {
      console.error('Failed to send notification to user:', err);
    }
  },

  // Send notification to all users holding a specific role
  async sendToRole(roleName: string, message: string, type: string) {
    try {
      const users = await db.all(
        `SELECT u.id 
         FROM users u 
         JOIN roles r ON u.role_id = r.id 
         WHERE r.name = ?`,
        [roleName]
      );
      
      if (users.length === 0) return;

      // Batch insert all notifications in a single transaction write lock
      const placeholders = users.map(() => '(?, ?, 0, ?)').join(', ');
      const params: any[] = [];
      users.forEach(u => {
        params.push(message, type, u.id);
      });

      const result = await db.run(
        `INSERT INTO notifications (message, type, read_status, user_id) VALUES ${placeholders}`,
        params
      );

      const lastId = result.lastID || 0;
      const count = users.length;
      const firstId = lastId - count + 1;
      const now = new Date().toISOString();

      // Dispatch WebSockets in parallel
      users.forEach((u, index) => {
        const formatted = {
          id: firstId + index,
          message: message,
          type: type,
          readStatus: false,
          userId: u.id,
          createdAt: now
        };
        sendToTopic(`/topic/notifications/${u.id}`, formatted);
      });
    } catch (err) {
      console.error('Failed to send notification to role:', err);
    }
  },

  // Broadcast sync trigger to all active dashboards
  broadcastDashboardUpdate() {
    sendToTopic('/topic/dashboard', 'REFRESH');
  }
};
