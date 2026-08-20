import { db } from './db';
import bcrypt from 'bcryptjs';

export async function seedData() {
  console.log('Verifying and seeding demo user accounts...');

  try {
    // 1. Ensure Roles Exist
    await db.run("INSERT INTO roles (id, name) VALUES (1, 'ROLE_PRINCIPAL') ON CONFLICT (id) DO NOTHING");
    await db.run("INSERT INTO roles (id, name) VALUES (2, 'ROLE_HOD') ON CONFLICT (id) DO NOTHING");
    await db.run("INSERT INTO roles (id, name) VALUES (3, 'ROLE_DEAN') ON CONFLICT (id) DO NOTHING");
    await db.run("INSERT INTO roles (id, name) VALUES (4, 'ROLE_TECHNICIAN') ON CONFLICT (id) DO NOTHING");
    await db.run("INSERT INTO roles (id, name) VALUES (5, 'ROLE_PROGRAMMER') ON CONFLICT (id) DO NOTHING");
    await db.run("INSERT INTO roles (id, name) VALUES (6, 'ROLE_EEE_ASSET_MANAGER') ON CONFLICT (id) DO NOTHING");
    await db.run("INSERT INTO roles (id, name) VALUES (7, 'ROLE_ELEC_COMPLAINTER') ON CONFLICT (id) DO NOTHING");
  } catch (e) {
    // SQLite fallback for ON CONFLICT
    try {
      await db.run("INSERT OR IGNORE INTO roles (id, name) VALUES (1, 'ROLE_PRINCIPAL')");
      await db.run("INSERT OR IGNORE INTO roles (id, name) VALUES (2, 'ROLE_HOD')");
      await db.run("INSERT OR IGNORE INTO roles (id, name) VALUES (3, 'ROLE_DEAN')");
      await db.run("INSERT OR IGNORE INTO roles (id, name) VALUES (4, 'ROLE_TECHNICIAN')");
      await db.run("INSERT OR IGNORE INTO roles (id, name) VALUES (5, 'ROLE_PROGRAMMER')");
      await db.run("INSERT OR IGNORE INTO roles (id, name) VALUES (6, 'ROLE_EEE_ASSET_MANAGER')");
      await db.run("INSERT OR IGNORE INTO roles (id, name) VALUES (7, 'ROLE_ELEC_COMPLAINTER')");
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

  try {
    // 2b. Initial Labs Seeding
    const labCountRow = await db.get("SELECT COUNT(*) as count FROM labs");
    const lCount = labCountRow ? parseInt(labCountRow.count) : 0;
    if (lCount === 0) {
      console.log('Seeding initial labs catalog...');
      const demoLabs = [
        { name: 'Systems & Software Lab', labNumber: '101', deptId: 1 },
        { name: 'Advanced AI & Data Lab', labNumber: '102', deptId: 1 },
        { name: 'Networks & Security Lab', labNumber: '103', deptId: 1 },
        { name: 'VLSI & Microprocessors Lab', labNumber: '201', deptId: 2 },
        { name: 'Embedded Systems Lab', labNumber: '202', deptId: 2 },
        { name: 'Power Electronics Lab', labNumber: '301', deptId: 3 },
        { name: 'CAD/CAM Simulation Lab', labNumber: '401', deptId: 4 },
        { name: 'Structural Testing Lab', labNumber: '501', deptId: 5 },
        { name: 'Web Development & Cloud Lab', labNumber: '601', deptId: 6 }
      ];
      for (const lab of demoLabs) {
        try {
          await db.run(
            "INSERT INTO labs (name, lab_number, department_id) VALUES (?, ?, ?)",
            [lab.name, lab.labNumber, lab.deptId]
          );
        } catch (errLab) {}
      }
    }
  } catch (e) {}

  // 3. Initial Demo Users Seeding
  try {
    const hashedPwd = await bcrypt.hash('password', 10);

    // Always ensure EEE HOD and EEE Asset Manager exist
    const eeeDept = await db.get("SELECT id FROM departments WHERE code = 'EEE' OR id = 3");
    const eeeDeptId = eeeDept ? eeeDept.id : 3;

    const demoUsers = [
      { id: 1, name: 'Dr. Robert Carter', email: 'principal@sms.edu', roleId: 1, deptId: null },
      { id: 2, name: 'Dr. Alan Turing', email: 'hod.cse@sms.edu', roleId: 2, deptId: 1 },
      { id: 3, name: 'Dr. Shannon Porter', email: 'hod.ece@sms.edu', roleId: 2, deptId: 2 },
      { id: 4, name: 'Prof. Charles Babbage', email: 'dean@sms.edu', roleId: 3, deptId: null },
      { id: 5, name: 'Hardware Technician', email: 'tech@sms.edu', roleId: 4, deptId: null },
      { id: 6, name: 'Dr. Nikola Tesla', email: 'hod.eee@sms.edu', roleId: 2, deptId: eeeDeptId },
      { id: 7, name: 'EEE Asset Manager', email: 'eee.manager@sms.edu', roleId: 6, deptId: eeeDeptId },
      { id: 8, name: 'Electrical Complainter', email: 'elec.complainter@sms.edu', roleId: 7, deptId: null }
    ];

    for (const u of demoUsers) {
      const existingUser = await db.get("SELECT id FROM users WHERE email = ?", [u.email]);
      if (!existingUser) {
        try {
          await db.run(
            "INSERT INTO users (name, email, password, role_id, department_id, active) VALUES (?, ?, ?, ?, ?, true)",
            [u.name, u.email, hashedPwd, u.roleId, u.deptId]
          );
        } catch (err) {}
      }
    }
  } catch (e) {}

  console.log('Database initialization check complete.');
}
