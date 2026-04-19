// src/components/GameCanvas.tsx
import React, { useEffect, useRef } from 'react';
import Phaser from 'phaser';
import { gameConfig } from '../game/config';
import MainScene from '../game/scenes/MainScene';

import { authService, User } from '../services/AuthService';

interface GameCanvasProps {
  user: User;
  room: 'office' | 'conference';
  micOn: boolean;
  onProximityUpdate?: (participants: { id: string; username: string; distance: number }[]) => void;
  onMicSpeakerUpdate?: (data: { speakerId: string; speakerUsername: string | null; isActive: boolean }) => void;
  onLoadingProgress?: (progress: number) => void;
}

const GameCanvas: React.FC<GameCanvasProps> = ({ user, room, micOn, onProximityUpdate, onMicSpeakerUpdate, onLoadingProgress }) => {
  const gameRef = useRef<Phaser.Game | null>(null);
  const sceneRef = useRef<MainScene | null>(null);

  useEffect(() => {
    // Initialize Phaser game once and keep scene stable across UI state changes.
    if (!gameRef.current) {
      gameRef.current = new Phaser.Game(gameConfig);
    }

    const sceneManager = gameRef.current.scene;
    const bootstrapScene = () => {
      const scene = sceneManager.getScene('MainScene') as MainScene | null;
      if (!scene) return;

      sceneRef.current = scene;

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
    };

    if (sceneManager.isActive('MainScene')) {
      bootstrapScene();
    } else {
      sceneManager.start('MainScene', { user, room });
      gameRef.current.events.once(Phaser.Core.Events.POST_STEP, bootstrapScene);
    }

    // Cleanup when component unmounts
    return () => {
      if (gameRef.current) {
        gameRef.current.destroy(true);
        gameRef.current = null;
        sceneRef.current = null;
      }
    };
  }, [user.id, user.username, room]);

  useEffect(() => {
    const scene = sceneRef.current;
    if (scene) {
      scene.onProximityUpdate = onProximityUpdate;
    }
  }, [onProximityUpdate]);

  useEffect(() => {
    const scene = sceneRef.current;
    if (scene) {
      scene.onMicSpeakerUpdate = onMicSpeakerUpdate;
    }
  }, [onMicSpeakerUpdate]);

  useEffect(() => {
    const scene = sceneRef.current;
    if (scene) {
      scene.onLoadingProgress = onLoadingProgress;
    }
  }, [onLoadingProgress]);

  useEffect(() => {
    const scene = sceneRef.current;
    if (scene && scene.setMicBroadcastEnabled) {
      scene.setMicBroadcastEnabled(micOn);
    }
  }, [micOn]);

  useEffect(() => {
    const scene = sceneRef.current;
    if (scene && scene.applyLocalAvatar) {
      scene.applyLocalAvatar(user);
    }
  }, [user.avatar_sprite, user.avatar_color, JSON.stringify(user.avatar_profile || {})]);

  return (
    <div id="game-container" className="game-container" />
  );
};

export default GameCanvas;
