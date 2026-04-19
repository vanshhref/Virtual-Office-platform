// src/game/services/SocketService.ts

import { io, Socket } from 'socket.io-client';
import { PlayerData, PlayerMovementData } from '../types/Player';
import { AvatarProfile } from '../../services/avatarCatalog';

export class SocketService {
  private socket: Socket | null = null;
  private static instance: SocketService;

  private constructor() {}

  // Singleton pattern
  static getInstance(): SocketService {
    if (!SocketService.instance) {
      SocketService.instance = new SocketService();
    }
    return SocketService.instance;
  }

  connect(serverUrl: string = process.env.REACT_APP_API_URL || 'http://localhost:4000'): Socket {
    if (this.socket?.connected) {
      console.log('✅ Already connected to server');
      return this.socket;
    }

    console.log(`🔌 Connecting to ${serverUrl}...`);

    this.socket = io(serverUrl, {
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
    });

    this.socket.on('connect', () => {
      console.log('✅ Connected to server:', this.socket?.id);
    });

    return this.socket;
  }

  disconnect(): void {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
  }

  getSocket(): Socket | null {
    return this.socket;
  }

  joinRoom(
    roomId: string,
    username: string,
    x: number,
    y: number,
    userId?: string,
    avatarSprite?: string,
    avatarColor?: string,
    avatarProfile?: AvatarProfile
  ): void {
    if (!this.socket) return;
    this.socket.emit('join-room', { roomId, username, x, y, userId, avatarSprite, avatarColor, avatarProfile });
  }

  sendMovement(data: PlayerMovementData & { status?: string }): void {
    if (!this.socket) return;
    this.socket.emit('player-movement', data);
  }

  onExistingPlayers(callback: (players: any[]) => void): void {
    this.socket?.on('existing-players', callback);
  }

  onPlayerJoined(callback: (player: any) => void): void {
    this.socket?.on('player-joined', callback);
  }

  onPlayerMoved(callback: (data: any) => void): void {
    this.socket?.on('player-moved', callback);
  }

  onPlayerLeft(callback: (data: { id: string; username: string }) => void): void {
    this.socket?.on('player-left', callback);
  }

  onJoinRoomSuccess(callback: (data: { playerId: string; roomId: string; playerCount: number }) => void): void {
    this.socket?.on('join-room-success', callback);
  }

  onMicSpeakerChanged(callback: (data: { speakerId: string; speakerUsername: string | null; isActive: boolean }) => void): void {
    this.socket?.on('mic-speaker-changed', callback);
  }

  updateAvatar(avatarSprite: string, avatarColor: string, avatarProfile?: AvatarProfile): void {
    if (!this.socket) return;
    this.socket.emit('update-avatar', { avatarSprite, avatarColor, avatarProfile });
  }

  onPlayerAvatarUpdated(callback: (data: {
    id: string;
    avatarSprite: string;
    avatarColor: string;
    avatarProfile?: AvatarProfile;
  }) => void): void {
    this.socket?.on('player-avatar-updated', callback);
  }

  removeAllListeners(): void {
    this.socket?.removeAllListeners();
  }
}
