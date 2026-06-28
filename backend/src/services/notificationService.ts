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
      
      const notifId = result.lastID;
      const savedNotif = await db.get(
        'SELECT id, message, type, read_status as readStatus, user_id as userId, created_at as createdAt FROM notifications WHERE id = ?',
        [notifId]
      );
      
      if (savedNotif) {
        // Format to match frontend Notification interface
        const formatted = {
          id: savedNotif.id,
          message: savedNotif.message,
          type: savedNotif.type,
          readStatus: savedNotif.readStatus === 1 || savedNotif.readStatus === true,
          userId: savedNotif.userId,
          createdAt: savedNotif.createdAt
        };
        sendToTopic(`/topic/notifications/${userId}`, formatted);
      }
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
      
      for (const u of users) {
        await this.sendToUser(u.id, message, type);
      }
    } catch (err) {
      console.error('Failed to send notification to role:', err);
    }
  },

  // Broadcast sync trigger to all active dashboards
  broadcastDashboardUpdate() {
    sendToTopic('/topic/dashboard', 'REFRESH');
  }
};
