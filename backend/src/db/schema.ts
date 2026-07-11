import fs from 'fs';
import path from 'path';
import { db } from './db';

const sqliteSchema = `
CREATE TABLE IF NOT EXISTS roles (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT UNIQUE NOT NULL
);

CREATE TABLE IF NOT EXISTS departments (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    code TEXT UNIQUE NOT NULL,
    hod_id INTEGER
);

CREATE TABLE IF NOT EXISTS labs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    lab_number TEXT NOT NULL,
    department_id INTEGER REFERENCES departments(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL,
    password TEXT NOT NULL,
    role_id INTEGER REFERENCES roles(id) ON DELETE SET NULL,
    department_id INTEGER REFERENCES departments(id) ON DELETE SET NULL,
    lab_id INTEGER REFERENCES labs(id) ON DELETE SET NULL,
    active INTEGER DEFAULT 1,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS inventory (
    id TEXT PRIMARY KEY,
    department_id INTEGER REFERENCES departments(id) ON DELETE CASCADE,
    lab_id INTEGER REFERENCES labs(id) ON DELETE SET NULL,
    workstation_number INTEGER DEFAULT 1,
    type TEXT NOT NULL,
    brand TEXT,
    model TEXT,
    serial_number TEXT UNIQUE,
    purchase_date TEXT,
    warranty_months INTEGER,
    status TEXT NOT NULL DEFAULT 'Working'
);

CREATE TABLE IF NOT EXISTS repair_requests (
    id TEXT PRIMARY KEY,
    inventory_id TEXT REFERENCES inventory(id) ON DELETE CASCADE,
    requester_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
    assigned_to_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
    title TEXT NOT NULL,
    description TEXT,
    priority TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'Initiated',
    initiated_date TEXT,
    initiated_time TEXT,
    device_count INTEGER DEFAULT 1,
    completed_date TEXT,
    completed_time TEXT
);

CREATE TABLE IF NOT EXISTS repair_history (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    request_id TEXT REFERENCES repair_requests(id) ON DELETE CASCADE,
    status TEXT NOT NULL,
    status_date TEXT,
    status_time TEXT,
    description TEXT,
    updated_by_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
    parts_replaced TEXT,
    expected_completion_days INTEGER,
    required_parts TEXT,
    problem_found TEXT,
    solution TEXT,
    reason_for_delay TEXT,
    remarks TEXT
);

CREATE TABLE IF NOT EXISTS notifications (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    message TEXT NOT NULL,
    type TEXT NOT NULL,
    read_status INTEGER DEFAULT 0,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS finalized_hardware_counts (
    department_id INTEGER REFERENCES departments(id) ON DELETE CASCADE,
    lab_id INTEGER DEFAULT 0,
    type TEXT NOT NULL,
    total INTEGER NOT NULL DEFAULT 0,
    working INTEGER NOT NULL DEFAULT 0,
    not_working INTEGER NOT NULL DEFAULT 0,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (department_id, lab_id, type)
);
`;

export async function initSchema() {
  const dialect = db.getDialect();
  if (dialect === 'postgres') {
    const schemaPath = path.join(__dirname, '../../../database/schema.sql');
    if (fs.existsSync(schemaPath)) {
      const sql = fs.readFileSync(schemaPath, 'utf8');
      console.log('Initializing PostgreSQL schema from schema.sql');
      await db.exec(sql);
      try {
        await db.exec(`
          ALTER TABLE users ADD COLUMN IF NOT EXISTS lab_id INTEGER REFERENCES labs(id) ON DELETE SET NULL;
          ALTER TABLE repair_requests ADD COLUMN IF NOT EXISTS device_count INTEGER DEFAULT 1;
          ALTER TABLE repair_requests ADD COLUMN IF NOT EXISTS completed_date DATE;
          ALTER TABLE repair_requests ADD COLUMN IF NOT EXISTS completed_time TIME;
          CREATE INDEX IF NOT EXISTS idx_inventory_dept ON inventory(department_id);
          CREATE INDEX IF NOT EXISTS idx_inventory_lab ON inventory(lab_id);
          CREATE INDEX IF NOT EXISTS idx_inventory_status ON inventory(status);
          CREATE INDEX IF NOT EXISTS idx_repairs_dept ON repair_requests(inventory_id);
          CREATE INDEX IF NOT EXISTS idx_repairs_status ON repair_requests(status);
          CREATE INDEX IF NOT EXISTS idx_repairs_requester ON repair_requests(requester_id);
          CREATE INDEX IF NOT EXISTS idx_repairs_assigned ON repair_requests(assigned_to_id);
          CREATE INDEX IF NOT EXISTS idx_history_request ON repair_history(request_id);
        `);
      } catch (e) {}
    } else {
      throw new Error(`PostgreSQL schema file not found at ${schemaPath}`);
    }
  } else {
    console.log('Initializing SQLite schema');
    await db.exec(sqliteSchema);
    await db.exec('PRAGMA foreign_keys = ON;');

    // Automated lightweight migration for SQLite tables if created under older schema
    try {
      await db.exec('ALTER TABLE users ADD COLUMN lab_id INTEGER REFERENCES labs(id) ON DELETE SET NULL;');
    } catch (e) { /* Column already exists */ }

    try {
      await db.exec('ALTER TABLE inventory ADD COLUMN lab_id INTEGER REFERENCES labs(id) ON DELETE SET NULL;');
    } catch (e) { /* Column already exists */ }

    try {
      await db.exec('ALTER TABLE inventory ADD COLUMN workstation_number INTEGER DEFAULT 1;');
    } catch (e) { /* Column already exists */ }

    try {
      await db.exec('ALTER TABLE repair_requests ADD COLUMN device_count INTEGER DEFAULT 1;');
    } catch (e) { /* Column already exists */ }

    try {
      await db.exec('ALTER TABLE repair_requests ADD COLUMN completed_date TEXT;');
    } catch (e) { /* Column already exists */ }

    try {
      await db.exec('ALTER TABLE repair_requests ADD COLUMN completed_time TEXT;');
    } catch (e) { /* Column already exists */ }

    try {
      await db.exec(`
        CREATE TABLE IF NOT EXISTS finalized_hardware_counts_new (
            department_id INTEGER REFERENCES departments(id) ON DELETE CASCADE,
            lab_id INTEGER DEFAULT 0,
            type TEXT NOT NULL,
            total INTEGER NOT NULL DEFAULT 0,
            working INTEGER NOT NULL DEFAULT 0,
            not_working INTEGER NOT NULL DEFAULT 0,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            PRIMARY KEY (department_id, lab_id, type)
        );
      `);
      
      const tableInfo = await db.all("PRAGMA table_info(finalized_hardware_counts);");
      const hasLabId = tableInfo && tableInfo.some((col: any) => col.name === 'lab_id');
      if (!hasLabId) {
        await db.exec(`
          INSERT INTO finalized_hardware_counts_new (department_id, lab_id, type, total, working, not_working, updated_at)
          SELECT department_id, 0, type, total, working, not_working, updated_at FROM finalized_hardware_counts;
          DROP TABLE finalized_hardware_counts;
          ALTER TABLE finalized_hardware_counts_new RENAME TO finalized_hardware_counts;
        `);
      } else {
        // If lab_id column was added without PK change, refresh table
        const pkCols = tableInfo.filter((col: any) => col.pk > 0);
        if (pkCols.length < 3) {
          await db.exec(`
            INSERT OR REPLACE INTO finalized_hardware_counts_new (department_id, lab_id, type, total, working, not_working, updated_at)
            SELECT department_id, COALESCE(lab_id, 0), type, total, working, not_working, updated_at FROM finalized_hardware_counts;
            DROP TABLE finalized_hardware_counts;
            ALTER TABLE finalized_hardware_counts_new RENAME TO finalized_hardware_counts;
          `);
        } else {
          await db.exec(`DROP TABLE finalized_hardware_counts_new;`);
        }
      }
    } catch (e) { /* Migration completed or table fresh */ }


    try {
      await db.exec('CREATE INDEX IF NOT EXISTS idx_inventory_dept_status ON inventory(department_id, status);');
      await db.exec('CREATE INDEX IF NOT EXISTS idx_inventory_lab ON inventory(lab_id);');
      await db.exec('CREATE INDEX IF NOT EXISTS idx_repairs_assigned_status ON repair_requests(assigned_to_id, status);');
    } catch (e) { /* Index already exists or column pending */ }

    // Ensure 0 devices at initial startup until HOD finalizes counts
    try {
      const finCount = await db.get('SELECT COUNT(*) as count FROM finalized_hardware_counts');
      if (!finCount || finCount.count === 0) {
        await db.exec('DELETE FROM inventory;');
      }
    } catch (e) { /* Table fresh or initialized */ }
  }

  // Backfill completed_date and completed_time for existing Resolved or Dead Stock requests
  try {
    await db.exec(`
      UPDATE repair_requests 
      SET 
        completed_date = (SELECT MIN(status_date) FROM repair_history WHERE request_id = repair_requests.id AND (status = 'Resolved' OR status = 'Dead Stock')),
        completed_time = (SELECT MIN(status_time) FROM repair_history WHERE request_id = repair_requests.id AND (status = 'Resolved' OR status = 'Dead Stock'))
      WHERE (status = 'Resolved' OR status = 'Dead Stock') AND completed_date IS NULL;
    `);
  } catch (e) {
    console.error('Migration backfill error:', e);
  }

  // One-time hardware cleanup reset
  try {
    await db.exec(`
      CREATE TABLE IF NOT EXISTS settings (key VARCHAR(100) PRIMARY KEY, value VARCHAR(100));
    `);
    const resetDone = await db.get("SELECT value FROM settings WHERE key = 'hardware_reset_done'");
    if (!resetDone) {
      await db.exec(`
        DELETE FROM repair_history;
        DELETE FROM repair_requests;
        DELETE FROM inventory;
        DELETE FROM finalized_hardware_counts;
        DELETE FROM notifications;
        INSERT INTO settings (key, value) VALUES ('hardware_reset_done', 'true');
      `);
      console.log("Database reset completed successfully: cleared all hardware, repairs, and notifications.");
    }
  } catch (e) {
    console.error("Cleanup reset error:", e);
  }
}



