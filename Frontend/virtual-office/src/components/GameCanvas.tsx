// src/components/GameCanvas.tsx
import React, { useEffect, useRef } from 'react';
import Phaser from 'phaser';
import { gameConfig } from '../game/config';
import MainScene from '../game/scenes/MainScene';

import { authService, User } from '../services/AuthService';

interface GameCanvasProps {
  user: User;
  room: 'office' | 'conference';
  onProximityUpdate?: (participants: { id: string; username: string; distance: number }[]) => void;
  onLoadingProgress?: (progress: number) => void;
}

const GameCanvas: React.FC<GameCanvasProps> = ({ user, room, onProximityUpdate, onLoadingProgress }) => {
  const gameRef = useRef<Phaser.Game | null>(null);

  useEffect(() => {
    // Initialize Phaser game when component mounts
    if (!gameRef.current) {
      gameRef.current = new Phaser.Game(gameConfig);
    }

    // Get reference to the scene for multiplayer connections
    const scene = gameRef.current.scene.getScene('MainScene') as MainScene;
    if (scene) {
      // Pass the proximity update callback to the scene
      if (onProximityUpdate) {
        scene.onProximityUpdate = onProximityUpdate;
      }
      
      // Pass the loading progress callback to the scene
      if (onLoadingProgress) {
        scene.onLoadingProgress = onLoadingProgress;
      }

      // Check if scene needs to be initialized or restarted with new room
      const currentRoom = (scene as any).roomId;
      if (currentRoom !== room) {
        console.log(`Room changed from ${currentRoom} to ${room}, restarting scene...`);
        scene.scene.restart({ user, room });
      }

      // Connect to multiplayer when scene is ready
      setTimeout(() => {
        if (scene.connectMultiplayer) {
          scene.connectMultiplayer(user, room);
        }
      }, 1000);
    }

    // Cleanup when component unmounts
    return () => {
      if (gameRef.current) {
        gameRef.current.destroy(true);
        gameRef.current = null;
      }
    };
  }, [user, room, onProximityUpdate]);

  return (
    <div id="game-container" className="game-container" />
  );
};

export default GameCanvas;
