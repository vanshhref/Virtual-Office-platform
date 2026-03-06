export interface User {
    id: string;
    username: string;
    email?: string;
    password?: string;
    avatar_sprite: string;
    avatar_color: string;
    created_at: string;
}
export declare class UserModel {
    static findByUsername(username: string): Promise<User | undefined>;
    static findById(id: string): Promise<User | undefined>;
    static create(userData: any): Promise<User>;
    static updateAvatar(id: string, sprite: string, color: string): Promise<void>;
}
//# sourceMappingURL=User.d.ts.map