// Backend/src/services/RoomManager.ts
export class RoomManager {
    // Map of roomId -> Map of playerId -> Player
    rooms = new Map();
    /**
     * Add a player to a room
     */
    addPlayerToRoom(roomId, player) {
        // Create room if it doesn't exist
        if (!this.rooms.has(roomId)) {
            this.rooms.set(roomId, new Map());
            console.log(`? Created new room: ${roomId}`);
        }
        // Add player to room
        const room = this.rooms.get(roomId);
        room.set(player.id, player);
        console.log(`?? Player ${player.username} (${player.id}) joined room ${roomId}`);
        console.log(`   Room now has ${room.size} player(s)`);
    }
    /**
     * Remove a player from their current room
     */
    removePlayer(playerId) {
        for (const [roomId, players] of this.rooms.entries()) {
            if (players.has(playerId)) {
                const player = players.get(playerId);
                players.delete(playerId);
                console.log(`?? Player ${player.username} left room ${roomId}`);
                // Delete room if empty
                if (players.size === 0) {
                    this.rooms.delete(roomId);
                    console.log(`??? Deleted empty room: ${roomId}`);
                }
                else {
                    console.log(`   Room now has ${players.size} player(s)`);
                }
                return roomId;
            }
        }
        return null;
    }
    /**
     * Update a player's position
     */
    updatePlayerPosition(playerId, x, y, direction, animation) {
        for (const players of this.rooms.values()) {
            if (players.has(playerId)) {
                const player = players.get(playerId);
                player.x = x;
                player.y = y;
                player.direction = direction;
                player.animation = animation;
                player.lastUpdate = Date.now();
                return player;
            }
        }
        return null;
    }
    /**
     * Get all players in a specific room
     */
    getPlayersInRoom(roomId) {
        const room = this.rooms.get(roomId);
        if (!room)
            return [];
        return Array.from(room.values());
    }
    /**
     * Get a specific player by ID
     */
    getPlayer(playerId) {
        for (const players of this.rooms.values()) {
            if (players.has(playerId)) {
                return players.get(playerId);
            }
        }
        return null;
    }
    /**
     * Get which room a player is in
     */
    getPlayerRoom(playerId) {
        for (const [roomId, players] of this.rooms.entries()) {
            if (players.has(playerId)) {
                return roomId;
            }
        }
        return null;
    }
    /**
     * Get stats for monitoring
     */
    getStats() {
        let totalPlayers = 0;
        for (const players of this.rooms.values()) {
            totalPlayers += players.size;
        }
        return {
            totalRooms: this.rooms.size,
            totalPlayers,
        };
    }
}
//# sourceMappingURL=RoomManager.js.map