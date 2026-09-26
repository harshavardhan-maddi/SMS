import { db } from './db';
import bcrypt from 'bcryptjs';
import { STATIONARY_CATALOG } from './stationaryCatalog';

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
    await db.run("INSERT INTO roles (id, name) VALUES (8, 'ROLE_SEMINAR_HALL_ALLOCATOR') ON CONFLICT (id) DO NOTHING");
    await db.run("INSERT INTO roles (id, name) VALUES (9, 'ROLE_AO') ON CONFLICT (id) DO NOTHING");
    await db.run("INSERT INTO roles (id, name) VALUES (10, 'ROLE_STATIONARY') ON CONFLICT (id) DO NOTHING");
    const existingAcRole = await db.get("SELECT id FROM roles WHERE name = 'ROLE_AC_TECHNICIAN'");
    if (!existingAcRole) {
      const maxRole = await db.get("SELECT MAX(id) as max_id FROM roles");
      const nextRoleId = ((maxRole?.max_id || maxRole?.maxId || 12) as number) + 1;
      await db.run("INSERT INTO roles (id, name) VALUES (?, 'ROLE_AC_TECHNICIAN') ON CONFLICT (id) DO NOTHING", [nextRoleId]);
    }
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
      await db.run("INSERT OR IGNORE INTO roles (id, name) VALUES (8, 'ROLE_SEMINAR_HALL_ALLOCATOR')");
      await db.run("INSERT OR IGNORE INTO roles (id, name) VALUES (9, 'ROLE_AO')");
      await db.run("INSERT OR IGNORE INTO roles (id, name) VALUES (10, 'ROLE_STATIONARY')");
      const existingAcRole = await db.get("SELECT id FROM roles WHERE name = 'ROLE_AC_TECHNICIAN'");
      if (!existingAcRole) {
        await db.run("INSERT INTO roles (name) VALUES ('ROLE_AC_TECHNICIAN')");
      }
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
    const hashedPwd = await bcrypt.hash('nrtec@nec', 10);

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
      { id: 8, name: 'Electrical Complainter', email: 'elec.complainter@sms.edu', roleId: 7, deptId: null },
      { id: 9, name: 'Administrative Officer', email: 'ao@sms.edu', roleId: 9, deptId: null },
      { id: 10, name: 'Stationary Incharge', email: 'stationary@sms.edu', roleId: 10, deptId: null },
      { id: 11, name: 'AC Repair Technician', email: 'actech@sms.edu', roleId: 11, deptId: null }
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

    // Ensure AC Repair Technician role and user always exist
    try {
      let acRole = await db.get("SELECT id FROM roles WHERE name = 'ROLE_AC_TECHNICIAN'");
      if (!acRole) {
        await db.run("INSERT INTO roles (name) VALUES ('ROLE_AC_TECHNICIAN')");
        acRole = await db.get("SELECT id FROM roles WHERE name = 'ROLE_AC_TECHNICIAN'");
      }
      const acRoleId = acRole ? acRole.id : 11;
      const acUser = await db.get("SELECT id FROM users WHERE email = 'actech@sms.edu'");
      if (!acUser) {
        await db.run(
          "INSERT INTO users (name, email, password, role_id, department_id, active) VALUES (?, ?, ?, ?, null, true)",
          ['AC Repair Technician', 'actech@sms.edu', hashedPwd, acRoleId]
        );
      } else {
        await db.run("UPDATE users SET role_id = ? WHERE email = 'actech@sms.edu'", [acRoleId]);
      }
    } catch (eAc) {}
  } catch (e) {}

  // 4. Initial Seminar Halls Seeding
  try {
    const hallCountRow = await db.get("SELECT COUNT(*) as count FROM seminar_halls");
    const hCount = hallCountRow ? parseInt(hallCountRow.count) : 0;
    if (hCount === 0) {
      console.log('Seeding initial seminar halls catalog...');
      const demoHalls = [
        { name: 'Block-3 seminar hall', code: 'HALL-B3', block: 'Block-3', capacity: 150, facilities: 'High-res projector, 7.1 surround sound, motorized podium screen, central AC' },
        { name: 'Tech Hub Seminar hall', code: 'HALL-TH', block: 'Tech Hub', capacity: 250, facilities: 'Dual 4K Laser projectors, wireless lavalier mics, stage lighting, live broadcast rack' },
        { name: 'Block-4 Seminar Hall', code: 'HALL-B4', block: 'Block-4', capacity: 180, facilities: 'Full HD projector, smart acoustic audio system, conference webcam, AC' }
      ];

      for (const h of demoHalls) {
        try {
          await db.run(
            "INSERT INTO seminar_halls (name, code, block, capacity, facilities, active) VALUES (?, ?, ?, ?, ?, true)",
            [h.name, h.code, h.block, h.capacity, h.facilities]
          );
        } catch (err) {}
      }
    }

    // 5. Seed Allocator Demo Accounts for the 3 Halls
    const hashedPwd = await bcrypt.hash('nrtec@nec', 10);
    const halls = await db.all("SELECT id, name FROM seminar_halls ORDER BY id ASC");
    
    if (halls && halls.length > 0) {
      const allocatorAccounts = [
        { name: 'Block-3 Hall Allocator', email: 'allocator.block3@sms.edu', hallId: halls[0]?.id },
        { name: 'Tech Hub Allocator', email: 'allocator.techhub@sms.edu', hallId: halls[1]?.id || halls[0]?.id },
        { name: 'Block-4 Hall Allocator', email: 'allocator.block4@sms.edu', hallId: halls[2]?.id || halls[0]?.id },
      ];

      for (const alloc of allocatorAccounts) {
        if (!alloc.hallId) continue;
        const exists = await db.get("SELECT id FROM users WHERE email = ?", [alloc.email]);
        if (!exists) {
          try {
            await db.run(
              "INSERT INTO users (name, email, password, role_id, seminar_hall_id, active) VALUES (?, ?, ?, 8, ?, true)",
              [alloc.name, alloc.email, hashedPwd, alloc.hallId]
            );
          } catch (eAlloc) {}
        }
      }
    }
  } catch (eHalls) {
    console.error('Error seeding seminar halls and allocators:', eHalls);
  }

  // 6. Initial Stationary Items Seeding
  try {
    const itemCountRow = await db.get("SELECT COUNT(*) as count FROM stationary_items");
    const iCount = itemCountRow ? parseInt(itemCountRow.count) : 0;
    if (iCount !== STATIONARY_CATALOG.length) {
      console.log(`Syncing stationary items catalog to exact ${STATIONARY_CATALOG.length} items (current count: ${iCount})...`);
      // Remove old stationary items to ensure only the new catalog is active
      await db.run("DELETE FROM stationary_items");
      if (db.getDialect() === 'postgres') {
        try {
          await db.run("ALTER SEQUENCE IF EXISTS stationary_items_id_seq RESTART WITH 1");
        } catch (seqErr) {}
      } else {
        try {
          await db.run("DELETE FROM sqlite_sequence WHERE name = 'stationary_items'");
        } catch (seqErr) {}
      }

      for (const item of STATIONARY_CATALOG) {
        try {
          await db.run(
            "INSERT INTO stationary_items (name, category, unit, active) VALUES (?, ?, ?, true)",
            [item.name, item.category, item.unit]
          );
        } catch (eItem) {
          console.error('Failed to insert stationary item:', item.name, eItem);
        }
      }
      console.log(`Successfully populated ${STATIONARY_CATALOG.length} stationary items.`);
    }
  } catch (eCat) {
    console.error('Error seeding stationary catalog:', eCat);
  }

  console.log('Database initialization check complete.');
}

