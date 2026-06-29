import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { db } from '../db/db';
import { authenticateJWT, authorizeRoles } from '../middleware/auth';

const router = Router();

// Helper to format user row
function formatUser(row: any) {
  if (!row) return null;
  return {
    id: row.id,
    name: row.name,
    email: row.email,
    active: row.active === 1 || row.active === true || row.active === 'true',
    createdAt: row.created_at,
    role: row.role_id ? { id: row.role_id, name: row.role_name } : null,
    department: row.dept_id
      ? { id: row.dept_id, name: row.dept_name, code: row.dept_code }
      : null,
  };
}

// 1. Get all technicians (narrow access for Deans)
router.get('/technicians', authenticateJWT, authorizeRoles('ROLE_PRINCIPAL', 'ROLE_DEAN'), async (req, res) => {
  try {
    const rows = await db.all(
      `SELECT u.id, u.name, u.email 
       FROM users u
       LEFT JOIN roles r ON u.role_id = r.id
       WHERE (r.name = 'ROLE_TECHNICIAN' OR u.role_id = 4)`
    );
    res.json(rows);
  } catch (err) {
    console.error('Get technicians error:', err);
    res.status(500).send('Internal server error');
  }
});

// 2. Get all users (Principal & Dean)
router.get('/', authenticateJWT, authorizeRoles('ROLE_PRINCIPAL', 'ROLE_DEAN'), async (req, res) => {
  try {
    const rows = await db.all(
      `SELECT u.id, u.name, u.email, u.active, u.created_at, r.id as role_id, r.name as role_name, d.id as dept_id, d.name as dept_name, d.code as dept_code 
       FROM users u
       LEFT JOIN roles r ON u.role_id = r.id
       LEFT JOIN departments d ON u.department_id = d.id`
    );
    res.json(rows.map(formatUser));
  } catch (err) {
    console.error('Get all users error:', err);
    res.status(500).send('Internal server error');
  }
});

// 3. Change own password (all logged in users)
router.put('/change-password', authenticateJWT, async (req, res) => {
  const { currentPassword, newPassword } = req.body;
  const userReq = (req as any).user;

  if (!currentPassword || !newPassword) {
    return res.status(400).send('Missing currentPassword or newPassword');
  }

  try {
    const userRow = await db.get('SELECT id, password FROM users WHERE email = ?', [userReq.sub]);
    if (!userRow) {
      return res.status(404).send('User not found');
    }

    const match = await bcrypt.compare(currentPassword, userRow.password);
    if (!match) {
      return res.status(400).send('Incorrect current password');
    }

    const hashedPwd = await bcrypt.hash(newPassword, 10);
    await db.run('UPDATE users SET password = ? WHERE id = ?', [hashedPwd, userRow.id]);

    res.json({ message: 'Password updated successfully!' });
  } catch (err) {
    console.error('Change password error:', err);
    res.status(400).send((err as Error).message);
  }
});

// 4. Get user by ID
router.get('/:id', authenticateJWT, authorizeRoles('ROLE_PRINCIPAL', 'ROLE_DEAN'), async (req, res) => {
  const { id } = req.params;
  try {
    const row = await db.get(
      `SELECT u.id, u.name, u.email, u.active, u.created_at, r.id as role_id, r.name as role_name, d.id as dept_id, d.name as dept_name, d.code as dept_code 
       FROM users u
       LEFT JOIN roles r ON u.role_id = r.id
       LEFT JOIN departments d ON u.department_id = d.id
       WHERE u.id = ?`,
      [id]
    );

    if (!row) {
      return res.status(404).send('User not found');
    }

    res.json(formatUser(row));
  } catch (err) {
    console.error('Get user by ID error:', err);
    res.status(500).send('Internal server error');
  }
});

// 5. Create User (Principal & Dean)
router.post('/', authenticateJWT, authorizeRoles('ROLE_PRINCIPAL', 'ROLE_DEAN'), async (req, res) => {
  const { name, email, password, roleName, departmentId } = req.body;
  const userReq = (req as any).user;

  if (!name || !email || !password || !roleName) {
    return res.status(400).send('Missing required fields');
  }

  // If Dean is creating a user, ensure it is a Hardware Technician
  if (userReq.role === 'ROLE_DEAN' && roleName !== 'ROLE_TECHNICIAN') {
    return res.status(403).send('Deans are authorized to register Hardware Technicians only');
  }

  try {
    // Check if user already exists
    const existing = await db.get('SELECT id FROM users WHERE email = ?', [email]);
    if (existing) {
      return res.status(400).send(`User with email ${email} already exists`);
    }

    // Get role ID
    const role = await db.get('SELECT id FROM roles WHERE name = ?', [roleName]);
    if (!role) {
      return res.status(400).send(`Role ${roleName} not found`);
    }

    // Verify department if provided
    if (departmentId) {
      const dept = await db.get('SELECT id FROM departments WHERE id = ?', [departmentId]);
      if (!dept) {
        return res.status(400).send('Department not found');
      }
    }

    const hashedPwd = await bcrypt.hash(password, 10);
    
    let createdUserId: number;
    const activeVal = db.getDialect() === 'postgres' ? true : 1;

    await db.transaction(async () => {
      const result = await db.run(
        `INSERT INTO users (name, email, password, role_id, department_id, active) 
         VALUES (?, ?, ?, ?, ?, ?)`,
        [name, email, hashedPwd, role.id, departmentId || null, activeVal]
      );
      
      createdUserId = result.lastID;

      // Circular link if HOD and department is set
      if (roleName === 'ROLE_HOD' && departmentId) {
        await db.run('UPDATE departments SET hod_id = ? WHERE id = ?', [createdUserId, departmentId]);
      }
    });

    const created = await db.get(
      `SELECT u.id, u.name, u.email, u.active, u.created_at, r.id as role_id, r.name as role_name, d.id as dept_id, d.name as dept_name, d.code as dept_code 
       FROM users u
       LEFT JOIN roles r ON u.role_id = r.id
       LEFT JOIN departments d ON u.department_id = d.id
       WHERE u.id = ?`,
      [createdUserId!]
    );

    res.json(formatUser(created));
  } catch (err) {
    console.error('Create user error:', err);
    res.status(400).send((err as Error).message);
  }
});

// 5. Reset Password
router.put('/:id/reset-password', authenticateJWT, authorizeRoles('ROLE_PRINCIPAL'), async (req, res) => {
  const { id } = req.params;
  const { newPassword } = req.body;

  if (!newPassword) {
    return res.status(400).send('Missing newPassword');
  }

  try {
    const user = await db.get(
      `SELECT u.id, r.name as role_name FROM users u 
       LEFT JOIN roles r ON u.role_id = r.id 
       WHERE u.id = ?`, 
      [id]
    );
    if (!user) {
      return res.status(404).send('User not found');
    }

    const hashedPwd = await bcrypt.hash(newPassword, 10);
    await db.run('UPDATE users SET password = ? WHERE id = ?', [hashedPwd, id]);

    const updated = await db.get(
      `SELECT u.id, u.name, u.email, u.active, u.created_at, r.id as role_id, r.name as role_name, d.id as dept_id, d.name as dept_name, d.code as dept_code 
       FROM users u
       LEFT JOIN roles r ON u.role_id = r.id
       LEFT JOIN departments d ON u.department_id = d.id
       WHERE u.id = ?`,
      [id]
    );

    res.json(formatUser(updated));
  } catch (err) {
    console.error('Reset password error:', err);
    res.status(400).send((err as Error).message);
  }
});

// 6. Update active status
router.put('/:id/active', authenticateJWT, authorizeRoles('ROLE_PRINCIPAL'), async (req, res) => {
  const { id } = req.params;
  // Get active query parameter
  const active = req.query.active === 'true' || req.query.active === '1';

  try {
    const user = await db.get(
      `SELECT u.id, r.name as role_name FROM users u 
       LEFT JOIN roles r ON u.role_id = r.id 
       WHERE u.id = ?`, 
      [id]
    );
    if (!user) {
      return res.status(404).send('User not found');
    }

    const activeVal = db.getDialect() === 'postgres' ? active : (active ? 1 : 0);
    await db.run('UPDATE users SET active = ? WHERE id = ?', [activeVal, id]);

    const updated = await db.get(
      `SELECT u.id, u.name, u.email, u.active, u.created_at, r.id as role_id, r.name as role_name, d.id as dept_id, d.name as dept_name, d.code as dept_code 
       FROM users u
       LEFT JOIN roles r ON u.role_id = r.id
       LEFT JOIN departments d ON u.department_id = d.id
       WHERE u.id = ?`,
      [id]
    );

    res.json(formatUser(updated));
  } catch (err) {
    console.error('Set active state error:', err);
    res.status(400).send((err as Error).message);
  }
});

// 7. Delete User
router.delete('/:id', authenticateJWT, authorizeRoles('ROLE_PRINCIPAL'), async (req, res) => {
  const { id } = req.params;
  try {
    const user = await db.get(
      `SELECT u.id, u.department_id, r.name as role_name FROM users u 
       LEFT JOIN roles r ON u.role_id = r.id 
       WHERE u.id = ?`, 
      [id]
    );
    if (!user) {
      return res.status(404).send('User not found');
    }

    await db.transaction(async () => {
      // Clear HOD link from departments table if this user was the HOD
      if (user.department_id) {
        await db.run('UPDATE departments SET hod_id = NULL WHERE hod_id = ? AND id = ?', [id, user.department_id]);
      }
      await db.run('DELETE FROM users WHERE id = ?', [id]);
    });

    res.sendStatus(200);
  } catch (err) {
    console.error('Delete user error:', err);
    res.status(400).send((err as Error).message);
  }
});

export default router;
