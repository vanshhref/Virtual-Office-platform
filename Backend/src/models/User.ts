// Backend/src/models/User.ts
import { dbService } from '../services/Database.js';
import { v4 as uuidv4 } from 'uuid';

export interface User {
  id: string;
  username: string;
  email?: string;
  password?: string;
  google_id?: string;
  microsoft_id?: string;
  avatar_sprite: string;
  avatar_color: string;
  avatar_profile?: string;
  avatar_customized: number;
  created_at: string;
}

export class UserModel {
  static async findByUsername(username: string): Promise<User | undefined> {
    const db = dbService.getDb();
    return await db.get('SELECT * FROM users WHERE username = ?', [username]);
  }

  static async findByEmail(email: string): Promise<User | undefined> {
    const db = dbService.getDb();
    return await db.get('SELECT * FROM users WHERE email = ?', [email]);
  }

  static async findById(id: string): Promise<User | undefined> {
    const db = dbService.getDb();
    return await db.get('SELECT * FROM users WHERE id = ?', [id]);
  }

  static async findByGoogleId(googleId: string): Promise<User | undefined> {
    const db = dbService.getDb();
    return await db.get('SELECT * FROM users WHERE google_id = ?', [googleId]);
  }

  static async findByMicrosoftId(microsoftId: string): Promise<User | undefined> {
    const db = dbService.getDb();
    return await db.get('SELECT * FROM users WHERE microsoft_id = ?', [microsoftId]);
  }

  static async create(userData: any): Promise<User> {
    const db = dbService.getDb();
    const id = uuidv4();
    const {
      username,
      email,
      password,
      avatar_sprite,
      avatar_color,
      avatar_profile,
      avatar_customized,
      google_id,
      microsoft_id
    } = userData;

    await db.run(
      `INSERT INTO users (id, username, email, password, google_id, microsoft_id, avatar_sprite, avatar_color, avatar_profile, avatar_customized) 
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        id,
        username,
        email || null,
        password,
        google_id || null,
        microsoft_id || null,
        avatar_sprite || 'worker-yellow',
        avatar_color || '#ffffff',
        avatar_profile || null,
        avatar_customized ?? 0
      ]
    );

    const newUser = await this.findById(id);
    return newUser!;
  }

  static async updateAvatar(id: string, sprite: string, color: string, profile?: string): Promise<void> {
    const db = dbService.getDb();
    await db.run(
      'UPDATE users SET avatar_sprite = ?, avatar_color = ?, avatar_profile = ?, avatar_customized = 1 WHERE id = ?',
      [sprite, color, profile || null, id]
    );
  }

  static async attachGoogleId(userId: string, googleId: string): Promise<void> {
    const db = dbService.getDb();
    await db.run('UPDATE users SET google_id = ? WHERE id = ?', [googleId, userId]);
  }

  static async attachMicrosoftId(userId: string, microsoftId: string): Promise<void> {
    const db = dbService.getDb();
    await db.run('UPDATE users SET microsoft_id = ? WHERE id = ?', [microsoftId, userId]);
  }
}
