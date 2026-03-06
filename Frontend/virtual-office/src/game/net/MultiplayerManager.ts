// src/game/net/MultiplayerManager.ts
import Phaser from 'phaser';
import { io, Socket } from 'socket.io-client';
import Player from '../entities/Player';

type Direction = 'up' | 'down' | 'left' | 'right';

interface RemotePlayerState {
  id: string;
  username: string;
  sprite: Phaser.GameObjects.Sprite;
  nameText: Phaser.GameObjects.Text;
  targetX: number;
  targetY: number;
  direction: Direction;
}

interface PlayerSnapshot {
  id: string;
  username: string;
  x: number;
  y: number;
  direction: Direction;
}

export class MultiplayerManager {
  private scene: Phaser.Scene;
  private localPlayer: Player;
  private socket: Socket | null = null;
  private remotePlayers: Map<string, RemotePlayerState> = new Map();
  private lastEmitTime = 0;
  private lastCheckProximity = 0;
  private proximityCheckInterval = 500; // Check every 500ms
  private proximityThreshold = 200; // Pixels
  onProximityUpdate?: (participants: { id: string; username: string; distance: number }[]) => void;

  constructor(scene: Phaser.Scene, localPlayer: Player) {
    this.scene = scene;
    this.localPlayer = localPlayer;
  }

  connect(room: 'office' | 'conference', username: string) {
    if (this.socket) return;

    // Only connect if the server is available
    console.log(`Connecting to server for room: ${room}`);
    const apiUrl = process.env.REACT_APP_API_URL || 'http://localhost:4000';
    this.socket = io(apiUrl, {
      query: { room, username },
    });

    this.registerSocketEvents();
  }

  private registerSocketEvents() {
    if (!this.socket) return;

    this.socket.on('current-players', (players: PlayerSnapshot[]) => {
      players.forEach((p) => {
        if (p.id !== this.socket!.id) {
          this.addRemotePlayer(p);
        }
      });
    });

    this.socket.on('player-joined', (player: PlayerSnapshot) => {
      if (player.id === this.socket!.id) return;
      this.addRemotePlayer(player);
      this.showNotification(`${player.username} joined the room`);
    });

    this.socket.on('player-moved', (data: PlayerSnapshot) => {
      const existing = this.remotePlayers.get(data.id);
      if (!existing) return;

      existing.targetX = data.x;
      existing.targetY = data.y;
      existing.direction = data.direction;
    });

    this.socket.on('player-disconnected', ({ id }: { id: string }) => {
      const existing = this.remotePlayers.get(id);
      if (!existing) return;

      existing.sprite.destroy();
      existing.nameText.destroy();
      this.remotePlayers.delete(id);
      this.showNotification(`${existing.username} left the room`);
    });

    this.socket.on('error', (data: { message: string }) => {
      console.error('Socket error:', data.message);
      this.showNotification(`Error: ${data.message}`, true);
    });

    this.socket.on('joined-room', (data: { playerId: string; username: string; room: string }) => {
      console.log(`Successfully joined room: ${data.room}`);
      this.showNotification(`Joined ${data.room} room as ${data.username}`);
    });
  }

  private addRemotePlayer(p: PlayerSnapshot) {
    // Create a simple sprite for remote players (reusing the player texture)
    const sprite = this.scene.add.sprite(p.x, p.y, 'player', 0);
    sprite.setScale(2);

    // Add a colored border to distinguish remote players
    const graphics = this.scene.add.graphics();
    graphics.lineStyle(2, 0x667eea);
    graphics.strokeRect(-32, -48, 64, 96);
    sprite.on('destroy', () => graphics.destroy());

    const nameText = this.scene.add
      .text(p.x, p.y - 55, p.username || 'Guest', {
        fontSize: '14px',
        color: '#ffffff',
        backgroundColor: '#000000',
        padding: { x: 5, y: 2 },
      })
      .setOrigin(0.5);

    const state: RemotePlayerState = {
      id: p.id,
      username: p.username,
      sprite,
      nameText,
      targetX: p.x,
      targetY: p.y,
      direction: p.direction,
    };

    this.remotePlayers.set(p.id, state);
  }

  update(time: number, delta: number) {
    // Send local player position every 50ms
    if (this.socket && time - this.lastEmitTime >= 50) {
      this.lastEmitTime = time;
      const pos = this.localPlayer.getPosition();
      const direction = this.localPlayer.currentDirection ?? 'down';
      this.socket.emit('player-movement', {
        x: pos.x,
        y: pos.y,
        direction: direction,
      });
    }

    // Check proximity for video calls
    if (this.socket && time - this.lastCheckProximity >= this.proximityCheckInterval) {
      this.lastCheckProximity = time;
      this.checkProximity();
    }

    // Smoothly interpolate remote players towards their target positions
    const t = Phaser.Math.Clamp(delta / 100, 0, 1);

    this.remotePlayers.forEach((rp) => {
      rp.sprite.x = Phaser.Math.Linear(rp.sprite.x, rp.targetX, t);
      rp.sprite.y = Phaser.Math.Linear(rp.sprite.y, rp.targetY, t);
      rp.nameText.setPosition(rp.sprite.x, rp.sprite.y - 55);

      // Update animation based on direction
      // Remote players use different frames to distinguish from local player
      const frameOffset = 16; // Use different animation set
      rp.sprite.setFrame(this.getFrameForDirection(rp.direction, frameOffset));
    });
  }

  private getFrameForDirection(direction: Direction, offset: number = 0): number {
    const baseFrames = {
      down: 0,
      up: 12,
      left: 4,
      right: 8,
    };
    return baseFrames[direction] + offset;
  }

  private checkProximity() {
    const localPos = this.localPlayer.getPosition();

    const nearbyPlayers: { id: string; username: string; distance: number }[] = [];

    this.remotePlayers.forEach((rp) => {
      const distance = Phaser.Math.Distance.Between(
        localPos.x,
        localPos.y,
        rp.targetX,
        rp.targetY
      );

      if (distance < this.proximityThreshold) {
        nearbyPlayers.push({
          id: rp.id,
          username: rp.username,
          distance: Math.round(distance),
        });
      }
    });

    // Notify parent component of proximity changes
    if (this.onProximityUpdate) {
      this.onProximityUpdate(nearbyPlayers);
    }
  }

  private showNotification(message: string, isError: boolean = false) {
    // Create a temporary notification text
    const notification = this.scene.add.text(
      this.scene.cameras.main.width / 2,
      this.scene.cameras.main.height / 2 - 50,
      message,
      {
        fontSize: '20px',
        color: isError ? '#ef4444' : '#10b981',
        backgroundColor: '#000000',
        padding: { x: 20, y: 10 },
      }
    ).setOrigin(0.5);

    // Fade out and destroy
    this.scene.tweens.add({
      targets: notification,
      alpha: 0,
      duration: 3000,
      onComplete: () => notification.destroy(),
    });
  }
}
