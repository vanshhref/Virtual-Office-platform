// Backend/src/services/Database.ts
import sqlite3 from 'sqlite3';
import { open, Database } from 'sqlite';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

class DatabaseService {
  private db: Database | null = null;

  async init() {
    if (this.db) return this.db;

    const dbPath = process.env.DATABASE_URL || path.join(__dirname, '../../database.sqlite');
    console.log(`📂 Using database at: ${dbPath}`);
    this.db = await open({
      filename: dbPath,
      driver: sqlite3.Database
    });

    await this.createTables();
    return this.db;
  }

  private async createTables() {
    if (!this.db) return;

    await this.db.exec(`
      CREATE TABLE IF NOT EXISTS users (
        id TEXT PRIMARY KEY,
        username TEXT UNIQUE NOT NULL,
        email TEXT UNIQUE,
        password TEXT NOT NULL,
        avatar_sprite TEXT DEFAULT 'worker-yellow',
        avatar_color TEXT DEFAULT '#ffffff',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
  }

  getDb() {
    if (!this.db) throw new Error('Database not initialized');
    return this.db;
  }
}

export const dbService = new DatabaseService();
