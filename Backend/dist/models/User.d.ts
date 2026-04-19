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
export declare class UserModel {
    static findByUsername(username: string): Promise<User | undefined>;
    static findByEmail(email: string): Promise<User | undefined>;
    static findById(id: string): Promise<User | undefined>;
    static findByGoogleId(googleId: string): Promise<User | undefined>;
    static findByMicrosoftId(microsoftId: string): Promise<User | undefined>;
    static create(userData: any): Promise<User>;
    static updateAvatar(id: string, sprite: string, color: string, profile?: string): Promise<void>;
    static attachGoogleId(userId: string, googleId: string): Promise<void>;
    static attachMicrosoftId(userId: string, microsoftId: string): Promise<void>;
}
//# sourceMappingURL=User.d.ts.map