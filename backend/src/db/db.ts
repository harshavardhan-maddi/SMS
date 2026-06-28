import { Pool } from 'pg';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config();

const dbType = process.env.DB_TYPE || 'sqlite';
const sqliteDbPath = process.env.SQLITE_DB_PATH || path.join(__dirname, '../../../database/sms_db.sqlite');

let pgPool: Pool | null = null;
let sqliteDb: any = null;

if (dbType === 'postgres') {
  if (process.env.DATABASE_URL) {
    pgPool = new Pool({
      connectionString: process.env.DATABASE_URL,
      ssl: { rejectUnauthorized: false }
    });
    console.log('Using PostgreSQL connection pool via DATABASE_URL (Supabase)');
  } else {
    pgPool = new Pool({
      host: process.env.PG_HOST || 'localhost',
      port: parseInt(process.env.PG_PORT || '5432'),
      database: process.env.PG_DATABASE || 'sms_db',
      user: process.env.PG_USER || 'postgres',
      password: process.env.PG_PASSWORD || 'postgres',
      ssl: process.env.PG_SSL === 'true' ? { rejectUnauthorized: false } : false
    });
    console.log('Using PostgreSQL database connection pool');
  }
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
        query += ' RETURNING id';
      }
      const res = await pgPool!.query(query, params);
      let lastID = null;
      if (res.rows.length > 0) {
        lastID = res.rows[0].id !== undefined ? res.rows[0].id : res.rows[0][Object.keys(res.rows[0])[0]];
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
      await pgPool!.query(sql);
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
