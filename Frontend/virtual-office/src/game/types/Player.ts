// src/game/types/Player.ts

export interface PlayerData {
    id: string;
    username: string;
    x: number;
    y: number;
    direction: 'up' | 'down' | 'left' | 'right';
    animation: string;
  }
  
  export interface PlayerMovementData {
    x: number;
    y: number;
    direction: 'up' | 'down' | 'left' | 'right';
    animation: string;
  }