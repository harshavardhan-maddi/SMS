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
    // 2. Ensure Departments Exist
    const dept1 = await db.get("SELECT id FROM departments WHERE id = 1");
    if (!dept1) {
      await db.run("INSERT INTO departments (id, name, code) VALUES (1, 'Computer Science Engineering', 'CSE')");
      await db.run("INSERT INTO departments (id, name, code) VALUES (2, 'Electronics & Communication', 'ECE')");
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
    if (existing) {
      await db.run("UPDATE users SET password = ?, active = true, role_id = ? WHERE email = ?", [hashedPwd, u.roleId, u.email]);
    } else {
      await db.run(
        "INSERT INTO users (id, name, email, password, role_id, department_id, active) VALUES (?, ?, ?, ?, ?, ?, true)",
        [u.id, u.name, u.email, hashedPwd, u.roleId, u.deptId]
      );
    }
  }

  try {
    await db.run("UPDATE departments SET hod_id = 2 WHERE id = 1");
    await db.run("UPDATE departments SET hod_id = 3 WHERE id = 2");
  } catch (e) {}

  console.log('Demo user accounts synchronized successfully.');
}
