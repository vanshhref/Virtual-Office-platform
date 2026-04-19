// Backend/src/services/RoomManager.ts

import type { Player } from '../types/Player.js';

export class RoomManager {
  // Map of roomId -> Map of playerId -> Player
  private rooms: Map<string, Map<string, Player>> = new Map();

  // Track who is actively speaking on the mic per room (roomId -> playerId)
  private roomMicSpeakers: Map<string, string> = new Map();

  /**
   * Add a player to a room
   */
  addPlayerToRoom(roomId: string, player: Player): void {
    // Create room if it doesn't exist
    if (!this.rooms.has(roomId)) {
      this.rooms.set(roomId, new Map());
      console.log(`? Created new room: ${roomId}`);
    }

    // Add player to room
    const room = this.rooms.get(roomId)!;
    room.set(player.id, player);

    console.log(`?? Player ${player.username} (${player.id}) joined room ${roomId}`);
    console.log(`   Room now has ${room.size} player(s)`);
  }

  /**
   * Remove a player from their current room
   */
  removePlayer(playerId: string): string | null {
    for (const [roomId, players] of this.rooms.entries()) {
      if (players.has(playerId)) {
        const player = players.get(playerId)!;
        players.delete(playerId);

        console.log(`?? Player ${player.username} left room ${roomId}`);

        // Delete room if empty
        if (players.size === 0) {
          this.rooms.delete(roomId);
          console.log(`??? Deleted empty room: ${roomId}`);
        } else {
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
  updatePlayerPosition(
    playerId: string,
    x: number,
    y: number,
    direction: 'up' | 'down' | 'left' | 'right',
    animation: string
  ): Player | null {
    for (const players of this.rooms.values()) {
      if (players.has(playerId)) {
        const player = players.get(playerId)!;
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
   * Update avatar data for a player.
   */
  updatePlayerAvatar(
    playerId: string,
    avatarSprite: string,
    avatarColor: string,
    avatarProfile?: Player['avatarProfile']
  ): Player | null {
    for (const players of this.rooms.values()) {
      if (players.has(playerId)) {
        const player = players.get(playerId)!;
        player.avatarSprite = avatarSprite;
        player.avatarColor = avatarColor;
        if (avatarProfile) {
          player.avatarProfile = avatarProfile;
        }
        player.lastUpdate = Date.now();
        return player;
      }
    }
    return null;
  }

  /**
   * Get all players in a specific room
   */
  getPlayersInRoom(roomId: string): Player[] {
    const room = this.rooms.get(roomId);
    if (!room) return [];
    return Array.from(room.values());
  }

  /**
   * Get players within specific bounds (e.g. conference room)
   */
  getPlayersInBounds(roomId: string, bounds: { x: number; y: number; width: number; height: number }): Player[] {
    const players = this.getPlayersInRoom(roomId);
    return players.filter(p => 
      p.x >= bounds.x && p.x <= bounds.x + bounds.width &&
      p.y >= bounds.y && p.y <= bounds.y + bounds.height
    );
  }

  /**
   * Get players within a certain proximity (radius) of a point
   */
  getPlayersNear(roomId: string, x: number, y: number, radius: number): Player[] {
    const players = this.getPlayersInRoom(roomId);
    return players.filter(p => {
      const dist = Math.sqrt(Math.pow(p.x - x, 2) + Math.pow(p.y - y, 2));
      return dist <= radius;
    });
  }

  /**
   * Set the active mic speaker for a room
   */
  setMicSpeaker(roomId: string, playerId: string | null): void {
    if (playerId) {
      this.roomMicSpeakers.set(roomId, playerId);
    } else {
      this.roomMicSpeakers.delete(roomId);
    }
  }

  /**
   * Get the active mic speaker for a room
   */
  getMicSpeaker(roomId: string): string | null {
    return this.roomMicSpeakers.get(roomId) || null;
  }

  /**
   * Get a specific player by ID
   */
  getPlayer(playerId: string): Player | null {
    for (const players of this.rooms.values()) {
      if (players.has(playerId)) {
        return players.get(playerId)!;
      }
    }
    return null;
  }

  /**
   * Get which room a player is in
   */
  getPlayerRoom(playerId: string): string | null {
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
  getStats(): { totalRooms: number; totalPlayers: number } {
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
