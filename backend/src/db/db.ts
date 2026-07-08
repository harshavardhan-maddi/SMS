import { Pool } from 'pg';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config();

const DEFAULT_DATABASE_URL = 'postgresql://postgres.oacwpbvtbqzbcyvfoitk:25475A4603%40l3@aws-1-ap-south-1.pooler.supabase.com:6543/postgres';
const dbType = process.env.DB_TYPE || (process.env.VERCEL || process.env.DATABASE_URL ? 'postgres' : 'sqlite');
const sqliteDbPath = process.env.SQLITE_DB_PATH || path.join(__dirname, '../../../database/sms_db.sqlite');

let pgPool: Pool | null = null;
let sqliteDb: any = null;

if (dbType === 'postgres') {
  const connectionString = process.env.DATABASE_URL || DEFAULT_DATABASE_URL;
  pgPool = new Pool({
    connectionString,
    ssl: { rejectUnauthorized: false },
    max: 20,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 3000,
    keepAlive: true
  });
  console.log('Using PostgreSQL connection pool via DATABASE_URL (Supabase)');
} else {
  // Ensure the directory exists
  const fs = require('fs');
  const dir = path.dirname(sqliteDbPath);
  if (!fs.existsSync(dir)){
    fs.mkdirSync(dir, { recursive: true });
  }

  // Load Node's built-in SQLite module
  try {
    const { DatabaseSync } = require('node:sqlite');
    sqliteDb = new DatabaseSync(sqliteDbPath);
    sqliteDb.exec('PRAGMA journal_mode = WAL;');
    sqliteDb.exec('PRAGMA foreign_keys = ON;');
    console.log('Opened SQLite database using node:sqlite at:', sqliteDbPath);
  } catch (err) {
    console.error('Failed to load built-in node:sqlite module. Make sure you are using Node.js v22.5.0 or later.', err);
    throw err;
  }
}

// Translate placeholder ? to $1, $2, etc. for PostgreSQL
function translateSql(sql: string): string {
  if (dbType === 'postgres') {
    let index = 1;
    return sql.replace(/\?/g, () => `$${index++}`);
  }
  return sql;
}

export const db = {
  getDialect(): 'sqlite' | 'postgres' {
    return dbType as 'sqlite' | 'postgres';
  },

  async all(sql: string, params: any[] = []): Promise<any[]> {
    const query = translateSql(sql);
    if (dbType === 'postgres') {
      const res = await pgPool!.query(query, params);
      return res.rows;
    } else {
      const stmt = sqliteDb.prepare(query);
      return stmt.all(...params);
    }
  },

  async get(sql: string, params: any[] = []): Promise<any | null> {
    const query = translateSql(sql);
    if (dbType === 'postgres') {
      const res = await pgPool!.query(query, params);
      return res.rows.length > 0 ? res.rows[0] : null;
    } else {
      const stmt = sqliteDb.prepare(query);
      const row = stmt.get(...params);
      return row !== undefined ? row : null;
    }
  },

  async run(sql: string, params: any[] = []): Promise<{ changes: number; lastID: any }> {
    let query = translateSql(sql);
    if (dbType === 'postgres') {
      if (query.trim().toUpperCase().startsWith('INSERT') && !query.toUpperCase().includes('RETURNING')) {
        query += ' RETURNING *';
      }
      const res = await pgPool!.query(query, params);
      let lastID = null;
      if (res.rows && res.rows.length > 0) {
        const row = res.rows[0];
        lastID = row.id !== undefined ? row.id : (row.department_id !== undefined ? row.department_id : Object.values(row)[0]);
      }
      return { changes: res.rowCount || 0, lastID };
    } else {
      const stmt = sqliteDb.prepare(query);
      const res = stmt.run(...params);
      return { 
        changes: res.changes, 
        lastID: res.lastInsertRowid 
      };
    }
  },

  async exec(sql: string): Promise<void> {
    if (dbType === 'postgres') {
      const statements = sql.split(';').map(s => s.trim()).filter(s => s.length > 0);
      for (const stmt of statements) {
        try {
          await pgPool!.query(stmt);
        } catch (err) {
          // Ignore individual DDL warning errors during initialization
        }
      }
    } else {
      sqliteDb.exec(sql);
    }
  },

  async transaction<T>(callback: () => Promise<T>): Promise<T> {
    if (dbType === 'postgres') {
      const client = await pgPool!.connect();
      try {
        await client.query('BEGIN');
        const result = await callback();
        await client.query('COMMIT');
        return result;
      } catch (err) {
        await client.query('ROLLBACK');
        throw err;
      } finally {
        client.release();
      }
    } else {
      await this.exec('BEGIN TRANSACTION;');
      try {
        const result = await callback();
        await this.exec('COMMIT;');
        return result;
      } catch (err) {
        await this.exec('ROLLBACK;');
        throw err;
      }
    }
  }
};
