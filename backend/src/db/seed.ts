import { db } from './db';
import bcrypt from 'bcryptjs';

export async function seedData() {
  console.log('Verifying and seeding demo user accounts...');

  const hashedPwd = await bcrypt.hash('password', 10);

  try {
    // 1. Ensure Roles Exist
    await db.run("INSERT INTO roles (id, name) VALUES (1, 'ROLE_PRINCIPAL') ON CONFLICT (id) DO NOTHING");
    await db.run("INSERT INTO roles (id, name) VALUES (2, 'ROLE_HOD') ON CONFLICT (id) DO NOTHING");
    await db.run("INSERT INTO roles (id, name) VALUES (3, 'ROLE_DEAN') ON CONFLICT (id) DO NOTHING");
    await db.run("INSERT INTO roles (id, name) VALUES (4, 'ROLE_TECHNICIAN') ON CONFLICT (id) DO NOTHING");
  } catch (e) {
    // SQLite fallback for ON CONFLICT
    try {
      await db.run("INSERT OR IGNORE INTO roles (id, name) VALUES (1, 'ROLE_PRINCIPAL')");
      await db.run("INSERT OR IGNORE INTO roles (id, name) VALUES (2, 'ROLE_HOD')");
      await db.run("INSERT OR IGNORE INTO roles (id, name) VALUES (3, 'ROLE_DEAN')");
      await db.run("INSERT OR IGNORE INTO roles (id, name) VALUES (4, 'ROLE_TECHNICIAN')");
    } catch (e2) {}
  }

  try {
    // 2. Initial Departments Seeding (ONLY on fresh database with 0 departments)
    const deptCountRow = await db.get("SELECT COUNT(*) as count FROM departments");
    const count = deptCountRow ? parseInt(deptCountRow.count) : 0;
    if (count === 0) {
      console.log('Seeding initial department catalog...');
      await db.run("INSERT INTO departments (id, name, code) VALUES (1, 'Computer Science Engineering', 'CSE')");
      await db.run("INSERT INTO departments (id, name, code) VALUES (2, 'Electronics & Communication', 'ECE')");
      await db.run("INSERT INTO departments (id, name, code) VALUES (3, 'Electrical & Electronics', 'EEE')");
      await db.run("INSERT INTO departments (id, name, code) VALUES (4, 'Mechanical Engineering', 'MECH')");
      await db.run("INSERT INTO departments (id, name, code) VALUES (5, 'Civil Engineering', 'CIVIL')");
      await db.run("INSERT INTO departments (id, name, code) VALUES (6, 'Information Technology', 'IT')");
    }
  } catch (e) {}

  // 3. Ensure Demo Users Exist and Passwords Match 'password'
  const demoUsers = [
    { id: 1, name: 'Dr. Robert Carter', email: 'principal@sms.edu', roleId: 1, deptId: null },
    { id: 2, name: 'Dr. Alan Turing', email: 'hod.cse@sms.edu', roleId: 2, deptId: 1 },
    { id: 3, name: 'Dr. Shannon Porter', email: 'hod.ece@sms.edu', roleId: 2, deptId: 2 },
    { id: 4, name: 'Prof. Charles Babbage', email: 'dean@sms.edu', roleId: 3, deptId: null },
    { id: 5, name: 'Hardware Technician', email: 'tech@sms.edu', roleId: 4, deptId: null }
  ];

  for (const u of demoUsers) {
    const existing = await db.get("SELECT id FROM users WHERE email = ?", [u.email]);
    
    // Check if assigned deptId actually exists in DB before linking
    let targetDeptId = u.deptId;
    if (targetDeptId) {
      const deptExists = await db.get("SELECT id FROM departments WHERE id = ?", [targetDeptId]);
      if (!deptExists) targetDeptId = null;
    }

    if (existing) {
      await db.run("UPDATE users SET password = ?, active = true, role_id = ? WHERE email = ?", [hashedPwd, u.roleId, u.email]);
    } else {
      await db.run(
        "INSERT INTO users (id, name, email, password, role_id, department_id, active) VALUES (?, ?, ?, ?, ?, ?, true)",
        [u.id, u.name, u.email, hashedPwd, u.roleId, targetDeptId]
      );
    }
  }

  try {
    const dept1 = await db.get("SELECT id FROM departments WHERE id = 1");
    if (dept1) await db.run("UPDATE departments SET hod_id = 2 WHERE id = 1");
    const dept2 = await db.get("SELECT id FROM departments WHERE id = 2");
    if (dept2) await db.run("UPDATE departments SET hod_id = 3 WHERE id = 2");
  } catch (e) {}

  console.log('Demo user accounts synchronized successfully.');
}
