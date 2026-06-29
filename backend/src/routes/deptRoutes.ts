import { Router } from 'express';
import { db } from '../db/db';
import { authenticateJWT, authorizeRoles } from '../middleware/auth';

const router = Router();

// 1. Get all departments
router.get('/', authenticateJWT, async (req, res) => {
  try {
    const rows = await db.all(
      `SELECT d.id, d.name, d.code, d.hod_id, u.id as hod_user_id, u.name as hod_name, u.email as hod_email 
       FROM departments d 
       LEFT JOIN users u ON d.hod_id = u.id`
    );
    
    const depts = rows.map((row) => ({
      id: row.id,
      name: row.name,
      code: row.code,
      hod: row.hod_id
        ? { id: row.hod_user_id, name: row.hod_name, email: row.hod_email }
        : null,
    }));
    
    res.json(depts);
  } catch (err) {
    console.error('Get departments error:', err);
    res.status(500).send('Internal server error');
  }
});

// 2. Get department by ID
router.get('/:id', authenticateJWT, async (req, res) => {
  const { id } = req.params;
  try {
    const row = await db.get(
      `SELECT d.id, d.name, d.code, d.hod_id, u.id as hod_user_id, u.name as hod_name, u.email as hod_email 
       FROM departments d 
       LEFT JOIN users u ON d.hod_id = u.id 
       WHERE d.id = ?`,
      [id]
    );

    if (!row) {
      return res.status(404).send('Department not found');
    }

    res.json({
      id: row.id,
      name: row.name,
      code: row.code,
      hod: row.hod_id
        ? { id: row.hod_user_id, name: row.hod_name, email: row.hod_email }
        : null,
    });
  } catch (err) {
    console.error('Get department error:', err);
    res.status(500).send('Internal server error');
  }
});

// 3. Create Department
router.post('/', authenticateJWT, authorizeRoles('ROLE_PRINCIPAL'), async (req, res) => {
  const { name, code, hod } = req.body;
  if (!name || !code) {
    return res.status(400).send('Missing name or code');
  }

  try {
    let hodId: number | null = null;
    if (hod && hod.id) {
      const user = await db.get('SELECT id FROM users WHERE id = ?', [hod.id]);
      if (!user) {
        return res.status(400).send('HOD user not found');
      }
      hodId = hod.id;
    }

    const result = await db.run(
      'INSERT INTO departments (name, code, hod_id) VALUES (?, ?, ?)',
      [name, code, hodId]
    );

    const newId = result.lastID;
    
    // Fetch and return the created department
    const created = await db.get(
      `SELECT d.id, d.name, d.code, d.hod_id, u.id as hod_user_id, u.name as hod_name, u.email as hod_email 
       FROM departments d 
       LEFT JOIN users u ON d.hod_id = u.id 
       WHERE d.id = ?`,
      [newId || result.lastID]
    );

    res.json({
      id: created.id,
      name: created.name,
      code: created.code,
      hod: created.hod_id
        ? { id: created.hod_user_id, name: created.hod_name, email: created.hod_email }
        : null,
    });
  } catch (err) {
    console.error('Create department error:', err);
    res.status(400).send((err as Error).message);
  }
});

// 4. Update Department
router.put('/:id', authenticateJWT, authorizeRoles('ROLE_PRINCIPAL'), async (req, res) => {
  const { id } = req.params;
  const { name, code, hod } = req.body;

  if (!name || !code) {
    return res.status(400).send('Missing name or code');
  }

  try {
    const dept = await db.get('SELECT id FROM departments WHERE id = ?', [id]);
    if (!dept) {
      return res.status(404).send('Department not found');
    }

    let newHodId: number | null = null;
    if (hod && hod.id) {
      const user = await db.get('SELECT id FROM users WHERE id = ?', [hod.id]);
      if (!user) {
        return res.status(400).send('HOD user not found');
      }
      newHodId = hod.id;
    }

    await db.transaction(async () => {
      if (newHodId) {
        // Clear this HOD from any other department first
        await db.run('UPDATE departments SET hod_id = NULL WHERE hod_id = ? AND id != ?', [newHodId, id]);
        
        // Link the user's department reference
        await db.run('UPDATE users SET department_id = ? WHERE id = ?', [id, newHodId]);
      }
      
      // Update department details
      await db.run(
        'UPDATE departments SET name = ?, code = ?, hod_id = ? WHERE id = ?',
        [name, code, newHodId, id]
      );
    });

    const updated = await db.get(
      `SELECT d.id, d.name, d.code, d.hod_id, u.id as hod_user_id, u.name as hod_name, u.email as hod_email 
       FROM departments d 
       LEFT JOIN users u ON d.hod_id = u.id 
       WHERE d.id = ?`,
      [id]
    );

    res.json({
      id: updated.id,
      name: updated.name,
      code: updated.code,
      hod: updated.hod_id
        ? { id: updated.hod_user_id, name: updated.hod_name, email: updated.hod_email }
        : null,
    });
  } catch (err) {
    console.error('Update department error:', err);
    res.status(400).send((err as Error).message);
  }
});

// 5. Delete Department
router.delete('/:id', authenticateJWT, authorizeRoles('ROLE_PRINCIPAL'), async (req, res) => {
  const { id } = req.params;
  try {
    const dept = await db.get('SELECT hod_id FROM departments WHERE id = ?', [id]);
    if (!dept) {
      return res.status(404).send('Department not found');
    }

    await db.transaction(async () => {
      // 1. Clear linked users
      try { await db.run('UPDATE users SET department_id = NULL WHERE department_id = ?', [id]); } catch(e){}
      if (dept.hod_id) {
        try { await db.run('UPDATE users SET department_id = NULL WHERE id = ?', [dept.hod_id]); } catch(e){}
      }
      try { await db.run('UPDATE departments SET hod_id = NULL WHERE id = ?', [id]); } catch(e){}

      // 2. Delete repair history linked to requests in this department
      try {
        await db.run('DELETE FROM repair_history WHERE request_id IN (SELECT id FROM repair_requests WHERE inventory_id IN (SELECT id FROM inventory WHERE department_id = ?))', [id]);
      } catch (e) {}

      // 3. Delete repair requests linked to inventory in this department
      try {
        await db.run('DELETE FROM repair_requests WHERE inventory_id IN (SELECT id FROM inventory WHERE department_id = ?)', [id]);
      } catch (e) {}

      // 4. Delete inventory items
      try { await db.run('DELETE FROM inventory WHERE department_id = ?', [id]); } catch(e){}

      // 5. Delete finalized hardware counts & labs
      try { await db.run('DELETE FROM finalized_hardware_counts WHERE department_id = ?', [id]); } catch(e){}
      try { await db.run('DELETE FROM labs WHERE department_id = ?', [id]); } catch(e){}

      // 6. Delete the department record itself
      await db.run('DELETE FROM departments WHERE id = ?', [id]);
    });

    const { notificationService } = require('../services/notificationService');
    notificationService.broadcastDashboardUpdate();

    res.sendStatus(200);
  } catch (err) {
    console.error('Delete department error:', err);
    res.status(400).send((err as Error).message);
  }
});

// 6. Assign HOD
router.put('/:id/assign-hod', authenticateJWT, authorizeRoles('ROLE_PRINCIPAL'), async (req, res) => {
  const { id } = req.params;
  const userId = req.query.userId || req.body.userId;

  if (!userId) {
    return res.status(400).send('Missing userId');
  }

  try {
    const dept = await db.get('SELECT id FROM departments WHERE id = ?', [id]);
    if (!dept) {
      return res.status(404).send('Department not found');
    }

    const user = await db.get('SELECT id FROM users WHERE id = ?', [userId]);
    if (!user) {
      return res.status(400).send('User not found');
    }

    await db.transaction(async () => {
      // Set HOD on department
      await db.run('UPDATE departments SET hod_id = ? WHERE id = ?', [userId, id]);
      // Set department on user
      await db.run('UPDATE users SET department_id = ? WHERE id = ?', [id, userId]);
    });

    const updated = await db.get(
      `SELECT d.id, d.name, d.code, d.hod_id, u.id as hod_user_id, u.name as hod_name, u.email as hod_email 
       FROM departments d 
       LEFT JOIN users u ON d.hod_id = u.id 
       WHERE d.id = ?`,
      [id]
    );

    res.json({
      id: updated.id,
      name: updated.name,
      code: updated.code,
      hod: updated.hod_id
        ? { id: updated.hod_user_id, name: updated.hod_name, email: updated.hod_email }
        : null,
    });
  } catch (err) {
    console.error('Assign HOD error:', err);
    res.status(400).send((err as Error).message);
  }
});

// 7. Get Labs (All or by departmentId)
router.get('/labs/all', authenticateJWT, async (req, res) => {
  try {
    const departmentId = req.query.departmentId;
    let query = `
      SELECT l.id, l.name, l.lab_number as labNumber, l.department_id as departmentId, d.name as deptName, d.code as deptCode
      FROM labs l
      LEFT JOIN departments d ON l.department_id = d.id
    `;
    const params: any[] = [];
    if (departmentId) {
      query += ' WHERE l.department_id = ?';
      params.push(departmentId);
    }
    query += ' ORDER BY l.lab_number ASC, l.name ASC';
    const rows = await db.all(query, params);
    res.json(rows);
  } catch (err) {
    console.error('Get labs error:', err);
    res.status(500).send('Internal server error');
  }
});

router.get('/:deptId/labs', authenticateJWT, async (req, res) => {
  const { deptId } = req.params;
  const authUser = (req as any).user;
  let numericDeptId = (deptId && deptId !== 'undefined' && deptId !== 'null') ? parseInt(deptId) : 0;

  if (!numericDeptId && authUser?.id) {
    const userRow = await db.get('SELECT department_id FROM users WHERE id = ?', [authUser.id]);
    if (userRow && userRow.department_id) {
      numericDeptId = parseInt(userRow.department_id);
    } else {
      const deptRow = await db.get('SELECT id FROM departments WHERE hod_id = ?', [authUser.id]);
      if (deptRow) {
        numericDeptId = parseInt(deptRow.id);
      }
    }
  }

  try {
    let rows = [];
    if (numericDeptId > 0) {
      rows = await db.all(
        `SELECT l.id, l.name, l.lab_number as labNumber, l.department_id as departmentId, d.name as deptName, d.code as deptCode
         FROM labs l
         LEFT JOIN departments d ON l.department_id = d.id
         WHERE l.department_id = ?
         ORDER BY l.lab_number ASC, l.name ASC`,
        [numericDeptId]
      );

      // Auto-create default labs if department currently has 0 labs
      if (!rows || rows.length === 0) {
        const dept = await db.get('SELECT code FROM departments WHERE id = ?', [numericDeptId]);
        const code = dept ? dept.code : 'DEPT';
        const defaultLabs = [
          { name: `${code} Systems & Computing Lab`, labNumber: '101' },
          { name: `${code} Hardware & Simulation Lab`, labNumber: '102' }
        ];
        for (const dl of defaultLabs) {
          try {
            await db.run('INSERT INTO labs (name, lab_number, department_id) VALUES (?, ?, ?)', [dl.name, dl.labNumber, numericDeptId]);
          } catch (e) {}
        }
        rows = await db.all(
          `SELECT l.id, l.name, l.lab_number as labNumber, l.department_id as departmentId, d.name as deptName, d.code as deptCode
           FROM labs l
           LEFT JOIN departments d ON l.department_id = d.id
           WHERE l.department_id = ?
           ORDER BY l.lab_number ASC, l.name ASC`,
          [numericDeptId]
        );
      }
    } else {
      rows = await db.all(
        `SELECT l.id, l.name, l.lab_number as labNumber, l.department_id as departmentId, d.name as deptName, d.code as deptCode
         FROM labs l
         LEFT JOIN departments d ON l.department_id = d.id
         ORDER BY l.lab_number ASC, l.name ASC`
      );
    }

    res.json(rows);
  } catch (err) {
    console.error('Get department labs error:', err);
    res.status(500).send('Internal server error');
  }
});

// 8. Create Lab
router.post('/:deptId/labs', authenticateJWT, async (req, res) => {
  const { deptId } = req.params;
  const { name, labNumber } = req.body;

  if (!name || !labNumber) {
    return res.status(400).send('Missing name or labNumber');
  }

  try {
    const result = await db.run(
      'INSERT INTO labs (name, lab_number, department_id) VALUES (?, ?, ?)',
      [name, labNumber, deptId]
    );

    const newLab = await db.get(
      `SELECT l.id, l.name, l.lab_number as labNumber, l.department_id as departmentId, d.name as deptName, d.code as deptCode
       FROM labs l
       LEFT JOIN departments d ON l.department_id = d.id
       WHERE l.id = ?`,
      [result.lastID]
    );
    res.json(newLab);
  } catch (err) {
    console.error('Create lab error:', err);
    res.status(400).send((err as Error).message);
  }
});

// 9. Delete Lab
router.delete('/labs/:id', authenticateJWT, async (req, res) => {
  const { id } = req.params;
  try {
    await db.run('DELETE FROM labs WHERE id = ?', [id]);
    res.sendStatus(200);
  } catch (err) {
    console.error('Delete lab error:', err);
    res.status(400).send((err as Error).message);
  }
});

export default router;

