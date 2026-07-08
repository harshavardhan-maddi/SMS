import { Router } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { db } from '../db/db';

const router = Router();
const JWT_SECRET = process.env.JWT_SECRET || '404E635266556A586E3272357538782F413F4428472B4B6250645367566B5970';

router.post('/login', async (req, res) => {
  const { email, password } = req.body;

  const cleanEmail = (email || '').trim().toLowerCase();

  if (!cleanEmail || !password) {
    return res.status(400).send('Authentication failed: Missing required fields.');
  }

  try {
    const user = await db.get(
      `SELECT u.id, u.name, u.email, u.password, u.active, u.department_id, u.lab_id, r.name as role_name, d.code as dept_code 
       FROM users u 
       LEFT JOIN roles r ON u.role_id = r.id 
       LEFT JOIN departments d ON u.department_id = d.id 
       WHERE LOWER(u.email) = ?`,
      [cleanEmail]
    );

    if (!user) {
      return res.status(401).send('Authentication failed: Invalid credentials.');
    }

    const isActive = user.active === 1 || user.active === true || user.active === 'true';
    if (!isActive) {
      return res.status(401).send('Authentication failed: User account is inactive.');
    }

    const passwordMatch = await bcrypt.compare(password, user.password);
    if (!passwordMatch) {
      return res.status(401).send('Authentication failed: Invalid credentials.');
    }

    let deptId = user.department_id;
    let deptCode = user.dept_code;

    if (!deptId) {
      const deptRow = await db.get('SELECT id, code FROM departments WHERE hod_id = ?', [user.id]);
      if (deptRow) {
        deptId = deptRow.id;
        deptCode = deptRow.code;
        try {
          await db.run('UPDATE users SET department_id = ? WHERE id = ?', [deptId, user.id]);
        } catch (e) {}
      }
    }

    const token = jwt.sign(
      {
        sub: user.email,
        role: user.role_name,
        name: user.name,
        userId: user.id,
        departmentCode: deptCode || null,
        departmentId: deptId || null,
        labId: user.lab_id || null,
      },
      JWT_SECRET,
      { expiresIn: '24h' }
    );

    res.json({
      token,
      role: user.role_name,
      email: user.email,
      name: user.name,
      userId: user.id,
      departmentCode: deptCode || null,
      departmentId: deptId || null,
      labId: user.lab_id || null,
    });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).send('Internal server error during authentication.');
  }
});

export default router;
