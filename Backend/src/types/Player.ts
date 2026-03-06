// Backend/src/types/Player.ts

export interface PlayerPosition {
    x: number;
    y: number;
  }
  
  export interface Player {
    id: string;              // Socket ID
    userId?: string;         // Persistent User ID (if logged in)
    username: string;        // Display name
    x: number;               // Current X position
    y: number;               // Current Y position
    direction: 'up' | 'down' | 'left' | 'right';  // Facing direction
    animation: string;       // Current animation state
    roomId: string;          // Which room they're in
    lastUpdate: number;      // Timestamp of last position update
    avatarSprite: string;    // Selected sprite set
    avatarColor: string;     // Color variation
    status: 'online' | 'away' | 'offline'; // Presence status
  }

  export interface PlayerMovementData {
    x: number;
    y: number;
    direction: 'up' | 'down' | 'left' | 'right';
    animation: string;
    status?: 'online' | 'away'; // Optional status update with movement
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
