// src/game/types/Interaction.ts

export interface InteractionZone {
  id: string;
  type: 'meeting_room' | 'desk' | 'coffee' | 'whiteboard' | 'custom';
  name: string;
  action: string;
  bounds: Phaser.Geom.Rectangle;
  isPlayerInside: boolean;
}

export interface SpawnPoint {
  name: string;
  x: number;
  y: number;
}
