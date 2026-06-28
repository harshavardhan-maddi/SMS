import { Router } from 'express';
import { db } from '../db/db';
import { authenticateJWT } from '../middleware/auth';

const router = Router();

// Helper to format notification row
function formatNotification(row: any) {
  return {
    id: row.id,
    message: row.message,
    type: row.type,
    readStatus: row.read_status === 1 || row.read_status === true || row.read_status === 'true',
    userId: row.user_id,
    createdAt: row.created_at,
  };
}

// 1. Get all notifications for user
router.get('/', authenticateJWT, async (req, res) => {
  const { userId } = req.query;
  if (!userId) {
    return res.status(400).send('Missing userId query parameter');
  }

  try {
    const rows = await db.all(
      'SELECT * FROM notifications WHERE user_id = ? ORDER BY created_at DESC',
      [userId]
    );
    res.json(rows.map(formatNotification));
  } catch (err) {
    console.error('Get notifications error:', err);
    res.status(500).send('Internal server error');
  }
});

// 2. Get unread notifications for user
router.get('/unread', authenticateJWT, async (req, res) => {
  const { userId } = req.query;
  if (!userId) {
    return res.status(400).send('Missing userId query parameter');
  }

  try {
    const unreadVal = db.getDialect() === 'postgres' ? false : 0;
    const rows = await db.all(
      'SELECT * FROM notifications WHERE user_id = ? AND read_status = ? ORDER BY created_at DESC',
      [userId, unreadVal]
    );
    res.json(rows.map(formatNotification));
  } catch (err) {
    console.error('Get unread notifications error:', err);
    res.status(500).send('Internal server error');
  }
});

// 3. Get unread notifications count
router.get('/unread/count', authenticateJWT, async (req, res) => {
  const { userId } = req.query;
  if (!userId) {
    return res.status(400).send('Missing userId query parameter');
  }

  try {
    const unreadVal = db.getDialect() === 'postgres' ? false : 0;
    const row = await db.get(
      'SELECT COUNT(*) as count FROM notifications WHERE user_id = ? AND read_status = ?',
      [userId, unreadVal]
    );
    res.json({ count: row ? parseInt(row.count) : 0 });
  } catch (err) {
    console.error('Get unread count error:', err);
    res.status(500).send('Internal server error');
  }
});

// 4. Mark single notification as read
router.put('/:id/read', authenticateJWT, async (req, res) => {
  const { id } = req.params;
  try {
    const notif = await db.get('SELECT id FROM notifications WHERE id = ?', [id]);
    if (!notif) {
      return res.status(404).send('Notification not found');
    }

    const readVal = db.getDialect() === 'postgres' ? true : 1;
    await db.run('UPDATE notifications SET read_status = ? WHERE id = ?', [readVal, id]);
    res.sendStatus(200);
  } catch (err) {
    console.error('Mark read error:', err);
    res.status(400).send((err as Error).message);
  }
});

// 5. Mark all notifications for a user as read
router.put('/read-all', authenticateJWT, async (req, res) => {
  const { userId } = req.query;
  if (!userId) {
    return res.status(400).send('Missing userId query parameter');
  }

  try {
    const unreadVal = db.getDialect() === 'postgres' ? false : 0;
    const readVal = db.getDialect() === 'postgres' ? true : 1;

    await db.run(
      'UPDATE notifications SET read_status = ? WHERE user_id = ? AND read_status = ?',
      [readVal, userId, unreadVal]
    );
    res.sendStatus(200);
  } catch (err) {
    console.error('Mark all read error:', err);
    res.status(400).send((err as Error).message);
  }
});

export default router;
