import type { Player } from '../types/Player.js';
export declare class RoomManager {
    private rooms;
    private roomMicSpeakers;
    /**
     * Add a player to a room
     */
    addPlayerToRoom(roomId: string, player: Player): void;
    /**
     * Remove a player from their current room
     */
    removePlayer(playerId: string): string | null;
    /**
     * Update a player's position
     */
    updatePlayerPosition(playerId: string, x: number, y: number, direction: 'up' | 'down' | 'left' | 'right', animation: string): Player | null;
    /**
     * Update avatar data for a player.
     */
    updatePlayerAvatar(playerId: string, avatarSprite: string, avatarColor: string, avatarProfile?: Player['avatarProfile']): Player | null;
    /**
     * Get all players in a specific room
     */
    getPlayersInRoom(roomId: string): Player[];
    /**
     * Get players within specific bounds (e.g. conference room)
     */
    getPlayersInBounds(roomId: string, bounds: {
        x: number;
        y: number;
        width: number;
        height: number;
    }): Player[];
    /**
     * Get players within a certain proximity (radius) of a point
     */
    getPlayersNear(roomId: string, x: number, y: number, radius: number): Player[];
    /**
     * Set the active mic speaker for a room
     */
    setMicSpeaker(roomId: string, playerId: string | null): void;
    /**
     * Get the active mic speaker for a room
     */
    getMicSpeaker(roomId: string): string | null;
    /**
     * Get a specific player by ID
     */
    getPlayer(playerId: string): Player | null;
    /**
     * Get which room a player is in
     */
    getPlayerRoom(playerId: string): string | null;
    /**
     * Get stats for monitoring
     */
    getStats(): {
        totalRooms: number;
        totalPlayers: number;
    };
}
//# sourceMappingURL=RoomManager.d.ts.map