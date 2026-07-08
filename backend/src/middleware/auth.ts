import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { db } from '../db/db';

const JWT_SECRET = process.env.JWT_SECRET || '404E635266556A586E3272357538782F413F4428472B4B6250645367566B5970';

export interface AuthRequest extends Request {
  user?: {
    id: number;
    email: string;
    name: string;
    role: string;
    departmentId: number | null;
    departmentCode: string | null;
    labId: number | null;
  };
}

export const authenticateJWT = async (req: AuthRequest, res: Response, next: NextFunction) => {
  const authHeader = req.headers.authorization;
  
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.split(' ')[1];
    
    try {
      const decoded = jwt.verify(token, JWT_SECRET) as {
        userId: number;
        sub?: string;
        email?: string;
      };
      
      const userId = decoded.userId;
      
      // Fetch user details from DB
      const user = await db.get(
        `SELECT u.id, u.name, u.email, u.active, u.department_id, u.lab_id, r.name as role_name, d.code as dept_code 
         FROM users u 
         LEFT JOIN roles r ON u.role_id = r.id 
         LEFT JOIN departments d ON u.department_id = d.id 
         WHERE u.id = ?`,
        [userId]
      );
      
      if (!user) {
        return res.status(401).json({ message: 'Unauthorized: User not found.' });
      }

      // Check active state (evaluates sqlite 1/0 or postgres true/false)
      const isActive = user.active === 1 || user.active === true || user.active === 'true';
      if (!isActive) {
        return res.status(401).json({ message: 'Unauthorized: User account is inactive.' });
      }

      req.user = {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role_name,
        departmentId: user.department_id,
        departmentCode: user.dept_code,
        labId: user.lab_id || null,
      };
      
      next();
    } catch (err) {
      console.error('JWT Verification Error:', err);
      return res.status(401).json({ message: 'Unauthorized: Invalid token.' });
    }
  } else {
    return res.status(401).json({ message: 'Unauthorized: Token missing.' });
  }
};

export const authorizeRoles = (...roles: string[]) => {
  return (req: AuthRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({ message: 'Unauthorized: Authentication required.' });
    }
    
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ message: `Forbidden: Access denied. Requires one of: ${roles.join(', ')}` });
    }
    
    next();
  };
};
