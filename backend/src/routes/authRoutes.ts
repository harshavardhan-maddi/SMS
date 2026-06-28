import { Router } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { db } from '../db/db';

const router = Router();
const JWT_SECRET = process.env.JWT_SECRET || '404E635266556A586E3272357538782F413F4428472B4B6250645367566B5970';

router.post('/login', async (req, res) => {
  const { email, password, role } = req.body;

  if (!email || !password || !role) {
    return res.status(400).send('Authentication failed: Missing required fields.');
  }

  try {
    const user = await db.get(
      `SELECT u.id, u.name, u.email, u.password, u.active, u.department_id, r.name as role_name, d.code as dept_code 
       FROM users u 
       LEFT JOIN roles r ON u.role_id = r.id 
       LEFT JOIN departments d ON u.department_id = d.id 
       WHERE u.email = ?`,
      [email]
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

    // Role mapping compatibility checks
    let expectedRolePrefix = `ROLE_${role.replace(/\s+/g, '_').toUpperCase()}`;
    if (role.toLowerCase() === 'computer dean') {
      expectedRolePrefix = 'ROLE_DEAN';
    }
    if (role.toLowerCase() === 'hardware technician') {
      expectedRolePrefix = 'ROLE_TECHNICIAN';
    }

    if (!user.role_name || user.role_name.toUpperCase() !== expectedRolePrefix.toUpperCase()) {
      return res.status(403).send('Access Denied: Incompatible role selected.');
    }

    const token = jwt.sign(
      {
        sub: user.email,
        role: user.role_name,
        name: user.name,
        userId: user.id,
        departmentCode: user.dept_code,
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
      departmentCode: user.dept_code || null,
      departmentId: user.department_id || null,
    });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).send('Internal server error during authentication.');
  }
});

export default router;
