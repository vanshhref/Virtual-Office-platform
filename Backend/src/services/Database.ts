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
        google_id TEXT UNIQUE,
        microsoft_id TEXT UNIQUE,
        avatar_sprite TEXT DEFAULT 'worker-yellow',
        avatar_color TEXT DEFAULT '#ffffff',
        avatar_profile TEXT,
        avatar_customized INTEGER DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    await this.ensureColumnExists('users', 'avatar_customized', "INTEGER DEFAULT 0");
    await this.ensureColumnExists('users', 'google_id', "TEXT");
    await this.ensureColumnExists('users', 'microsoft_id', "TEXT");
    await this.ensureColumnExists('users', 'avatar_profile', "TEXT");
    await this.db.exec('CREATE UNIQUE INDEX IF NOT EXISTS idx_users_google_id ON users (google_id)');
    await this.db.exec('CREATE UNIQUE INDEX IF NOT EXISTS idx_users_microsoft_id ON users (microsoft_id)');
  }

  private async ensureColumnExists(table: string, column: string, definition: string) {
    if (!this.db) return;
    const columns = await this.db.all(`PRAGMA table_info(${table})`);
    const exists = columns.some((col: { name: string }) => col.name === column);
    if (!exists) {
      await this.db.exec(`ALTER TABLE ${table} ADD COLUMN ${column} ${definition}`);
    }
  }

  getDb() {
    if (!this.db) throw new Error('Database not initialized');
    return this.db;
  }
}

export const dbService = new DatabaseService();
