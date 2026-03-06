import sqlite3 from 'sqlite3';
import { Database } from 'sqlite';
declare class DatabaseService {
    private db;
    init(): Promise<Database<sqlite3.Database, sqlite3.Statement>>;
    private createTables;
    getDb(): Database<sqlite3.Database, sqlite3.Statement>;
}
export declare const dbService: DatabaseService;
export {};
//# sourceMappingURL=Database.d.ts.map