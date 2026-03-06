// src/game/config.ts
import Phaser from 'phaser';
import MainScene from './scenes/MainScene';

export const gameConfig: Phaser.Types.Core.GameConfig = {
  type: Phaser.AUTO, // Use AUTO for best performance and compatibility
  parent: 'game-container', // HTML element ID where game will be rendered
  width: 800,
  height: 600,
  backgroundColor: '#2d2d2d',
  physics: {
    default: 'arcade', // Arcade physics for simple 2D games
    arcade: {
      gravity: { x: 0, y: 0 }, // No gravity (top-down view)
      debug: true, // Show collision boxes (remove in production)
    },
  },
  scene: [MainScene], // Array of scenes (we'll have only one for now)
  scale: {
    mode: Phaser.Scale.FIT, // Scale to fit parent container
    autoCenter: Phaser.Scale.CENTER_BOTH,
  },
  pixelArt: true, // Prevent blurry sprites
};