import type { Player } from '../types/Player.js';
export declare class RoomManager {
    private rooms;
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
     * Get all players in a specific room
     */
    getPlayersInRoom(roomId: string): Player[];
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