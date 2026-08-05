import express from 'express';
import { db } from '../db/db';
import { authenticateJWT, authorizeRoles } from '../middleware/auth';

const router = express.Router();

async function ensureElectriciansTable() {
  try {
    const isPg = db.getDialect() === 'postgres';
    if (isPg) {
      await db.exec(`
        CREATE TABLE IF NOT EXISTS electricians (
          id SERIAL PRIMARY KEY,
          name VARCHAR(255) NOT NULL,
          phone VARCHAR(50),
          specialization VARCHAR(255),
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
      `);
    } else {
      await db.exec(`
        CREATE TABLE IF NOT EXISTS electricians (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          name TEXT NOT NULL,
          phone TEXT,
          specialization TEXT,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
      `);
    }
  } catch (err) {
    // Ignore if table exists
  }
}

// 1. Get all electricians
router.get('/', authenticateJWT, async (req, res) => {
  try {
    await ensureElectriciansTable();
    const rows = await db.all('SELECT id, name, created_at FROM electricians ORDER BY name ASC');
    res.json(rows);
  } catch (err) {
    console.error('Get electricians error:', err);
    res.status(500).send('Failed to fetch electricians');
  }
});

// 2. Add a new electrician (Authorized for EEE Asset Manager, Principal, HOD, Dean)
router.post('/', authenticateJWT, authorizeRoles('ROLE_EEE_ASSET_MANAGER', 'ROLE_PRINCIPAL', 'ROLE_HOD', 'ROLE_DEAN'), async (req, res) => {
  const { name } = req.body;

  if (!name || !name.trim()) {
    return res.status(400).send('Electrician name is required');
  }

  try {
    await ensureElectriciansTable();
    const result = await db.run(
      'INSERT INTO electricians (name) VALUES (?)',
      [name.trim()]
    );

    const newId = result.lastID || (result as any).id;
    const created = await db.get('SELECT id, name, created_at FROM electricians WHERE id = ?', [newId]);
    res.json(created || { id: newId, name: name.trim() });
  } catch (err) {
    console.error('Create electrician error:', err);
    res.status(400).send((err as Error).message);
  }
});

// 3. Delete an electrician
router.delete('/:id', authenticateJWT, authorizeRoles('ROLE_EEE_ASSET_MANAGER', 'ROLE_PRINCIPAL', 'ROLE_HOD', 'ROLE_DEAN'), async (req, res) => {
  const { id } = req.params;
  try {
    await ensureElectriciansTable();
    await db.run('DELETE FROM electricians WHERE id = ?', [id]);
    res.json({ message: 'Electrician deleted successfully' });
  } catch (err) {
    console.error('Delete electrician error:', err);
    res.status(500).send('Failed to delete electrician');
  }
});

export default router;
