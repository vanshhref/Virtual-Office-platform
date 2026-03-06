// Backend/src/models/User.ts
import { dbService } from '../services/Database.js';
import { v4 as uuidv4 } from 'uuid';
export class UserModel {
    static async findByUsername(username) {
        const db = dbService.getDb();
        return await db.get('SELECT * FROM users WHERE username = ?', [username]);
    }
    static async findById(id) {
        const db = dbService.getDb();
        return await db.get('SELECT * FROM users WHERE id = ?', [id]);
    }
    static async create(userData) {
        const db = dbService.getDb();
        const id = uuidv4();
        const { username, email, password, avatar_sprite, avatar_color } = userData;
        await db.run(`INSERT INTO users (id, username, email, password, avatar_sprite, avatar_color) 
       VALUES (?, ?, ?, ?, ?, ?)`, [id, username, email, password, avatar_sprite || 'worker-yellow', avatar_color || '#ffffff']);
        const newUser = await this.findById(id);
        return newUser;
    }
    static async updateAvatar(id, sprite, color) {
        const db = dbService.getDb();
        await db.run('UPDATE users SET avatar_sprite = ?, avatar_color = ? WHERE id = ?', [sprite, color, id]);
    }
}
//# sourceMappingURL=User.js.map