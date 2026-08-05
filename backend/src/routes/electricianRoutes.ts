import express from 'express';
import { db } from '../db/db';
import { authenticateJWT, authorizeRoles } from '../middleware/auth';

const router = express.Router();

// 1. Get all electricians
router.get('/', authenticateJWT, async (req, res) => {
  try {
    const rows = await db.all('SELECT id, name, phone, specialization, created_at FROM electricians ORDER BY name ASC');
    res.json(rows);
  } catch (err) {
    console.error('Get electricians error:', err);
    res.status(500).send('Failed to fetch electricians');
  }
});

// 2. Add a new electrician (Authorized for EEE Asset Manager, Principal, Dean)
router.post('/', authenticateJWT, authorizeRoles('ROLE_EEE_ASSET_MANAGER', 'ROLE_PRINCIPAL'), async (req, res) => {
  const { name, phone, specialization } = req.body;

  if (!name || !name.trim()) {
    return res.status(400).send('Electrician name is required');
  }

  try {
    const result = await db.run(
      'INSERT INTO electricians (name, phone, specialization) VALUES (?, ?, ?)',
      [name.trim(), phone ? phone.trim() : null, specialization ? specialization.trim() : 'Electrical Fixtures']
    );

    const created = await db.get('SELECT id, name, phone, specialization, created_at FROM electricians WHERE id = ?', [result.lastID]);
    res.json(created);
  } catch (err) {
    console.error('Create electrician error:', err);
    res.status(400).send((err as Error).message);
  }
});

// 3. Delete an electrician
router.delete('/:id', authenticateJWT, authorizeRoles('ROLE_EEE_ASSET_MANAGER', 'ROLE_PRINCIPAL'), async (req, res) => {
  const { id } = req.params;
  try {
    await db.run('DELETE FROM electricians WHERE id = ?', [id]);
    res.json({ message: 'Electrician deleted successfully' });
  } catch (err) {
    console.error('Delete electrician error:', err);
    res.status(500).send('Failed to delete electrician');
  }
});

export default router;
