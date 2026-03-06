export interface PlayerPosition {
    x: number;
    y: number;
}
export interface Player {
    id: string;
    userId?: string;
    username: string;
    x: number;
    y: number;
    direction: 'up' | 'down' | 'left' | 'right';
    animation: string;
    roomId: string;
    lastUpdate: number;
    avatarSprite: string;
    avatarColor: string;
    status: 'online' | 'away' | 'offline';
}
export interface PlayerMovementData {
    x: number;
    y: number;
    direction: 'up' | 'down' | 'left' | 'right';
    animation: string;
    status?: 'online' | 'away';
}
export interface JoinRoomData {
    roomId: string;
    username: string;
    x: number;
    y: number;
    userId?: string;
    avatarSprite: string;
    avatarColor: string;
}
//# sourceMappingURL=Player.d.ts.map