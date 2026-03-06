// src/game/scenes/MainScene.ts

import Phaser from 'phaser';
import Player from '../entities/Player';
import RemotePlayer from '../entities/RemotePlayer';
import { SocketService } from '../services/SocketService';
import { PlayerData } from '../types/Player';
import { InteractionManager } from '../services/InteractionManager';
import { SpawnPoint } from '../types/Interaction';
import { authService, User } from '../../services/AuthService';
import { MAP_BASE_URL } from '../config/MapPaths';

// Callback type for proximity updates (players near each other)
export type ProximityCallback = (participants: { id: string; username: string; distance: number }[]) => void;

export default class MainScene extends Phaser.Scene {
  private player!: Player;
  private map!: Phaser.Tilemaps.Tilemap;
  private wallsLayer!: Phaser.Tilemaps.TilemapLayer;
  private objectsLayer!: Phaser.Tilemaps.TilemapLayer;
  private beamsLayer!: Phaser.Tilemaps.TilemapLayer;
  private socketService!: SocketService;
  
  // Store remote players
  private remotePlayers: Map<string, RemotePlayer> = new Map();
  
  // Player info
  private username: string = 'Player_' + Math.floor(Math.random() * 1000);
  private roomId: string = 'office';

  // Optional callbacks (set by GameCanvas)
  public onProximityUpdate?: ProximityCallback;
  
  private _onLoadingProgress?: (progress: number) => void;
  private _currentProgress: number = 0;
  private _isLoaded: boolean = false;

  public set onLoadingProgress(callback: ((progress: number) => void) | undefined) {
    this._onLoadingProgress = callback;
    if (callback) {
      if (this._isLoaded) {
        callback(1);
      } else {
        callback(this._currentProgress);
      }
    }
  }

  public get onLoadingProgress(): ((progress: number) => void) | undefined {
    return this._onLoadingProgress;
  }

  private interactionManager!: InteractionManager;
  private spawnPoints: SpawnPoint[] = [];
  private userAvatar: { sprite: string, color: string } = { sprite: 'worker-yellow', color: '#ffffff' };
  private userId?: string;

  constructor() {
    super({ key: 'MainScene' });
  }

  init(data: { username?: string; room?: string; user?: User }): void {
    if (data.username) this.username = data.username;
    if (data.room) this.roomId = data.room;
    if (data.user) {
      this.username = data.user.username;
      this.userId = data.user.id;
      this.userAvatar = { sprite: data.user.avatar_sprite, color: data.user.avatar_color };
    }
    console.log(`MainScene init: username=${this.username}, room=${this.roomId}`);
  }

  preload(): void {
    // Progress bar logic
    this.load.on('progress', (value: number) => {
      console.log(`Loading: ${Math.round(value * 100)}%`);
      this._currentProgress = value;
      if (this._onLoadingProgress) {
        this._onLoadingProgress(value);
      }
    });

    this.load.on('complete', () => {
      console.log('✅ All assets loaded');
      this._isLoaded = true;
      this._currentProgress = 1;
      if (this._onLoadingProgress) {
        this._onLoadingProgress(1);
      }
    });

    this.load.on('loaderror', (fileObj: any) => {
      console.error(`❌ Failed to load: ${fileObj.key} (${fileObj.src})`);
    });

    this.load.on('filecomplete', (key: string, type: string) => {
      console.log(`✅ File finished: ${key} (${type})`);
    });

    // Handle map loading specifically to debug
    this.load.on('filecomplete-tilemapjson-main-map', () => {
      console.log('✅ map.json loaded successfully');
    });

    // Load Tiled map (tilesets are now embedded in the JSON)
    const mapPath = `${MAP_BASE_URL}/map.json`;
    console.log('📥 Queueing map from:', mapPath);
    this.load.tilemapTiledJSON('main-map', mapPath);
    
    // Load all tileset images individually (Phaser needs them in cache)
    console.log('🖼️ Queueing tilesets...');
    const tilesetImages = [
      { key: 'office-floor', path: 'tilesets/office.png' },
      { key: 'conference-room', path: 'tilesets/conference.png' },
      { key: 'WA_Room_Builder', path: 'tilesets/WA_Room_Builder.png' },
      { key: 'WA_Other_Furniture', path: 'tilesets/WA_Other_Furniture.png' },
      { key: 'WA_Seats', path: 'tilesets/WA_Seats.png' },
      { key: 'WA_Special_Zones', path: 'tilesets/WA_Special_Zones.png' },
      { key: 'WA_Decoration', path: 'tilesets/WA_Decoration.png' },
      { key: 'WA_Miscellaneous', path: 'tilesets/WA_Miscellaneous.png' }
    ];

    tilesetImages.forEach(ts => {
      const fullPath = `${MAP_BASE_URL}/${ts.path}`;
      console.log(`🖼️ Queueing image: ${ts.key} from ${fullPath}`);
      this.load.image(ts.key, fullPath);
    });

    // Load ALL player sprites
    console.log('🏃 Queueing sprites...');
    const sprites = ['worker-yellow', 'worker-blue', 'worker-green', 'worker-red'];
    sprites.forEach(s => {
      const spritePath = `assets/sprites/${s}.png`;
      console.log(`🏃 Queueing spritesheet: ${s} from ${spritePath}`);
      this.load.spritesheet(s, spritePath, { frameWidth: 32, frameHeight: 48 });
    });

    // Explicitly start the loader if it hasn't started
    if (!this.load.isLoading()) {
      console.log('🚀 Explicitly starting Phaser loader...');
      this.load.start();
    }

    // Safety timeout for assets
    this.time.delayedCall(10000, () => {
      if (!this._isLoaded) {
        console.warn('⚠️ Asset loading timeout! Forcing game start...');
        this._isLoaded = true;
        if (this._onLoadingProgress) this._onLoadingProgress(1);
        // We can't easily force Phaser to finish preload, but we can signal React to hide loading
      }
    });
  }

  private playerLight!: Phaser.GameObjects.Light;
  private proximityGraphics!: Phaser.GameObjects.Graphics;
create(): void {
  console.log('🎮 Scene Create: Starting initialization sequence...');
  
  // 1. Initialize Map Object
  try {
    console.log('🗺️ Creating tilemap from key: main-map');
    this.map = this.make.tilemap({ key: 'main-map' });
    if (!this.map) throw new Error('Failed to create tilemap object');
    console.log(`✅ Tilemap created. Size: ${this.map.width}x${this.map.height}, TileSize: ${this.map.tileWidth}x${this.map.tileHeight}`);
  } catch (err) {
    console.error('❌ CRITICAL: Error creating tilemap:', err);
    this._isLoaded = true;
    if (this._onLoadingProgress) this._onLoadingProgress(1);
    return;
  }
  
  // 2. Load interaction zones and spawns from map
  try {
    console.log('📍 Initializing InteractionManager...');
    this.interactionManager = new InteractionManager(this);
    this.loadInteractionZones();
    console.log('✅ Interaction zones loaded');
  } catch (err) {
    console.error('⚠️ Non-critical: Error loading interaction zones:', err);
  }

  // 3. Get spawn point
  let spawnPoint = { x: 400, y: 300 };
  try {
    spawnPoint = this.getRandomSpawnPoint();
    console.log(`📍 Using spawn point: (${spawnPoint.x}, ${spawnPoint.y})`);
  } catch (err) {
    console.warn('⚠️ Using fallback spawn point');
  }

  // 4. Create local player
  try {
    console.log('👤 Creating local player...');
    this.player = new Player(this, spawnPoint.x, spawnPoint.y, this.userAvatar.sprite, this.userAvatar.color, this.username);
    console.log('✅ Local player created successfully');
  } catch (err) {
    console.error('❌ CRITICAL: Error creating player:', err);
    return;
  }

  // 5. Create visual layers and physics colliders
  try {
    console.log('🏗️ Building world layers...');
    this.createTiledMap();
    console.log('✅ World layers built');
  } catch (err) {
    console.error('⚠️ Error building world layers:', err);
  }

  // 6. Setup camera
  try {
    console.log('🎥 Setting up main camera...');
    this.cameras.main.startFollow(this.player, true, 0.1, 0.1); 
    this.cameras.main.setZoom(1.2);
    this.cameras.main.setBounds(0, 0, this.map.widthInPixels, this.map.heightInPixels);
    this.physics.world.setBounds(0, 0, this.map.widthInPixels, this.map.heightInPixels);
    console.log('✅ Main camera setup complete');
  } catch (err) {
    console.error('⚠️ Error setting up camera:', err);
  }

  // 6.2 Lighting Effects
  try {
    console.log('💡 Enabling lighting...');
    this.lights.enable();
    this.lights.setAmbientColor(0x808080);
    this.playerLight = this.lights.addLight(this.player.x, this.player.y, 200);
    this.playerLight.setIntensity(2);
    console.log('✅ Lighting enabled');
  } catch (err) {
    console.warn('⚠️ Error enabling lights');
  }

  // 7. UI Elements
  try {
    console.log('📊 Creating UI elements...');
    this.createUI();
    console.log('✅ UI elements created');
  } catch (err) {
    console.error('⚠️ Error creating UI');
  }

  // 8. Listen for interaction events
  this.events.on('interaction-triggered', this.handleInteraction, this);

  // 8.1 Mouse Wheel Zoom (Improved)
  this.input.on('wheel', (pointer: Phaser.Input.Pointer, gameObjects: any, deltaX: number, deltaY: number, deltaZ: number) => {
    const zoomSensitivity = 0.001;
    const minZoom = 0.4;
    const maxZoom = 2.5;
    
    // Calculate new zoom level
    const oldZoom = this.cameras.main.zoom;
    let newZoom = oldZoom - deltaY * zoomSensitivity;
    
    // Clamp zoom level
    newZoom = Phaser.Math.Clamp(newZoom, minZoom, maxZoom);
    
    if (oldZoom !== newZoom) {
      // Zoom towards the mouse pointer
      this.cameras.main.zoomTo(newZoom, 100, 'Linear', false, (camera: any, progress: number) => {
        if (progress === 1) {
          // Optional: Ensure camera stays in bounds after zoom
          this.cameras.main.setBounds(0, 0, this.map.widthInPixels, this.map.heightInPixels);
        }
      });
      
      console.log(`🔍 Zoom: ${newZoom.toFixed(2)}x`);
    }
  });

  // 9. Performance Optimization: Check proximity every 500ms, not every frame
  this.time.addEvent({
    delay: 500,
    callback: this.checkProximity,
    callbackScope: this,
    loop: true
  });

  // 10. Proximity Graphics
  this.proximityGraphics = this.add.graphics();
  this.proximityGraphics.setDepth(10); // Above players
  
  // 11. Final initialization signal
  this._isLoaded = true;
  if (this._onLoadingProgress) this._onLoadingProgress(1);
  console.log('🚀 Game Scene fully initialized and ready!');
}

  update(): void {
    if (this.player) {
      this.player.update();
      
      // Update interaction manager
      this.interactionManager.update(this.player.x, this.player.y);
      this.interactionManager.updateUIPosition(this.player.x, this.player.y);

      // Update light position
      if (this.playerLight) {
        this.playerLight.setPosition(this.player.x, this.player.y);
      }

      // Proximity Detection moved to interval
      
      // Update Proximity Circles Visual
      this.drawProximityCircles();
    }

    // Update all remote players
    this.remotePlayers.forEach((remotePlayer) => {
      remotePlayer.update();
    });
  }

  private drawProximityCircles(): void {
    this.proximityGraphics.clear();
    
    // 1. Draw radius around local player if near others
    const PROXIMITY_THRESHOLD = 150;
    let isNearAnyone = false;

    this.remotePlayers.forEach((remote) => {
      const distance = Phaser.Math.Distance.Between(
        this.player.x, this.player.y, remote.x, remote.y
      );

      if (distance < PROXIMITY_THRESHOLD) {
        isNearAnyone = true;
        
        // Draw circle around remote player
        this.proximityGraphics.lineStyle(2, 0xffffff, 0.3);
        this.proximityGraphics.strokeCircle(remote.x, remote.y, 40);
        this.proximityGraphics.fillStyle(0xffffff, 0.1);
        this.proximityGraphics.fillCircle(remote.x, remote.y, 40);
      }
    });

    if (isNearAnyone) {
      // Draw large circle around local player
      this.proximityGraphics.lineStyle(3, 0x667eea, 0.5);
      this.proximityGraphics.strokeCircle(this.player.x, this.player.y, PROXIMITY_THRESHOLD);
      this.proximityGraphics.fillStyle(0x667eea, 0.05);
      this.proximityGraphics.fillCircle(this.player.x, this.player.y, PROXIMITY_THRESHOLD);
    }
  }

  /**
   * Checks for nearby players and active meeting rooms to trigger video calls
   */
  private checkProximity(): void {
    const PROXIMITY_THRESHOLD = 200;
    const nearby: { id: string; username: string; distance: number }[] = [];
    
    // 1. Check if we are in a meeting room
    const activeZone = this.interactionManager.getActiveZone();
    const isInMeetingRoom = activeZone?.type === 'meeting_room';

    // 2. Check distance to all remote players
    this.remotePlayers.forEach((remote, id) => {
      const distance = Phaser.Math.Distance.Between(
        this.player.x, this.player.y,
        remote.x, remote.y
      );

      // Trigger if close OR if both are in the same meeting room
      if (distance < PROXIMITY_THRESHOLD || isInMeetingRoom) {
        nearby.push({
          id,
          username: remote.getUsername(),
          distance: Math.floor(distance)
        });
      }
    });

    // 3. Notify React UI
    if (this.onProximityUpdate) {
      this.onProximityUpdate(nearby);
    }
  }

  private createTiledMap(): void {
    console.log('🗺️  Loading Tiled map layers...');

    // 1. Add ALL tileset images
    const tilesetNames = [
      'office-floor',
      'conference-room',
      'WA_Room_Builder',
      // 'Gemini_Generated_Image_phd27ephd27ephd2',
      'WA_Other_Furniture',
      'WA_Seats',
      'WA_Special_Zones',
      'WA_Decoration',
      'WA_Miscellaneous'
    ];

    const tilesets = tilesetNames.map(name => {
      console.log(`🖼️ Adding tileset: ${name}`);
      const ts = this.map.addTilesetImage(name, name);
      if (!ts) console.warn(`⚠️ Failed to load tileset: ${name}`);
      return ts!;
    }).filter(ts => ts !== null);

    // 2. Create layers (order matters: bottom to top)
    // Map layers: floor, walls, objects, beams-ceiling, decoration
    
    const floorLayer = this.map.createLayer('floor', tilesets, 0, 0);
    if (floorLayer) floorLayer.setDepth(0);

    this.wallsLayer = this.map.createLayer('walls', tilesets, 0, 0) as Phaser.Tilemaps.TilemapLayer;
    if (this.wallsLayer) {
      this.wallsLayer.setDepth(10);
      // Enable collision for all tiles in walls layer
      this.wallsLayer.setCollisionByExclusion([-1]);
      this.physics.add.collider(this.player, this.wallsLayer);
      console.log('🧱 Walls collision enabled');
    }

    this.objectsLayer = this.map.createLayer('objects', tilesets, 0, 0) as Phaser.Tilemaps.TilemapLayer;
    if (this.objectsLayer) {
      this.objectsLayer.setDepth(20);
      // Enable collision for all tiles in objects layer
      this.objectsLayer.setCollisionByExclusion([-1]);
      this.physics.add.collider(this.player, this.objectsLayer);
      console.log('📦 Objects collision enabled');
    }

    const decorationLayer = this.map.createLayer('decoration', tilesets, 0, 0);
    if (decorationLayer) decorationLayer.setDepth(30);

    this.beamsLayer = this.map.createLayer('beams-ceiling', tilesets, 0, 0) as Phaser.Tilemaps.TilemapLayer;
    
    if (this.beamsLayer) {
      this.beamsLayer.setDepth(200); // Ceiling should be above players
      
      // Enable collision for all tiles in beams layer (making it an obstacle)
      this.beamsLayer.setCollisionByExclusion([-1]);
      
      this.physics.add.collider(this.player, this.beamsLayer);
      console.log('🏗️ Beams-ceiling collision enabled as obstacle');
    }

    // 3. Handle specific collision layer if it exists
    const collisionTileLayer = this.map.createLayer('collision', tilesets, 0, 0);
    if (collisionTileLayer) {
      try {
        collisionTileLayer.setCollisionBetween(1, 10000, true);
        collisionTileLayer.setVisible(false);
        this.physics.add.collider(this.player, collisionTileLayer);
        console.log('💥 Specific collision layer physics enabled');
      } catch (err) {
        // Safe to ignore if layer is empty or missing
      }
    }

    console.log('✅ Tiled map loaded');
  }

  private loadInteractionZones(): void {
    // Load interaction zones from 'interactions' object layer
    const interactionLayer = this.map.getObjectLayer('interactions');
    if (interactionLayer) {
      this.interactionManager.loadInteractionZones(interactionLayer);
    } else {
      console.warn('⚠️  No interactions layer found in map');
    }

    // Load spawn points from 'spawns' object layer
    const spawnsLayer = this.map.getObjectLayer('spawns');
    if (spawnsLayer) {
      this.spawnPoints = []; // Clear existing
      spawnsLayer.objects.forEach((obj) => {
        if (obj.point || (obj.x !== undefined && obj.y !== undefined)) {
          this.spawnPoints.push({
            name: obj.name || 'spawn',
            x: obj.x!,
            y: obj.y!,
          });
        }
      });
      console.log(`✅ Loaded ${this.spawnPoints.length} spawn points from 'spawns' layer`);
    } else {
      // Fallback spawn point
      if (this.spawnPoints.length === 0) {
        this.spawnPoints.push({ name: 'default', x: 400, y: 300 });
      }
      console.warn('⚠️  No spawns layer found, using default/existing spawns');
    }
  }

  private getRandomSpawnPoint(): SpawnPoint {
    if (this.spawnPoints.length === 0) {
      return { name: 'default', x: 400, y: 300 };
    }
    return this.spawnPoints[Math.floor(Math.random() * this.spawnPoints.length)];
  }

  private handleInteraction(data: any): void {
    console.log('🎯 Handling interaction:', data);
    
    if (!this.player) return;

    switch (data.type) {
      case 'desk':
        // Toggle sitting
        const isCurrentlySitting = (this.player as any).isSitting;
        this.player.setSitting(!isCurrentlySitting);
        console.log(`${isCurrentlySitting ? '🚶 Stood up' : '🪑 Sat down'} at desk: ${data.zone.name}`);
        
        // Open Google Meet in a new window if sitting down
        if (!isCurrentlySitting) {
          this.player.showInteractionBubble('🎥 Opening Google Meet...');
          window.open('https://meet.google.com/new', '_blank');
        }
        break;

      case 'coffee':
        this.player.showInteractionBubble('☕ Drinking coffee...');
        console.log('☕ Getting coffee...');
        break;

      case 'whiteboard':
        this.player.showInteractionBubble('📝 Opening whiteboard...');
        window.open('https://webwhiteboard.com/', '_blank');
        console.log('📝 Opening whiteboard...');
        break;

      case 'meeting_room':
        this.player.showInteractionBubble('📞 Joining meeting');
        console.log(`📞 Joined meeting: ${data.zone.name}`);
        break;

      case 'presentation':
      case 'presenting_desk':
        this.player.showInteractionBubble('📊 Opening PowerPoint...');
        window.open('https://www.office.com/launch/powerpoint', '_blank');
        console.log('📊 Opening Microsoft PowerPoint...');
        break;
        
      default:
        this.player.showInteractionBubble('✨ Interacting...');
        break;
    }
  }

  /** Connect to multiplayer with the given user data and room. Called by GameCanvas. */
  public connectMultiplayer(user: User, room: string): void {
    this.username = user.username;
    this.userId = user.id;
    this.userAvatar = { sprite: user.avatar_sprite, color: user.avatar_color };
    this.roomId = room;
    this.initializeMultiplayer();
  }

  private initializeMultiplayer(): void {
    console.log('🎮 Initializing multiplayer...');
    this.socketService = SocketService.getInstance();
    const apiUrl = process.env.REACT_APP_API_URL || 'http://localhost:4000';
    this.socketService.connect(apiUrl);
    this.setupSocketListeners();

    this.time.delayedCall(500, () => {
      this.socketService.joinRoom(
        this.roomId,
        this.username,
        this.player.x,
        this.player.y,
        this.userId,
        this.userAvatar.sprite,
        this.userAvatar.color
      );
    });
  }

  private setupSocketListeners(): void {
    this.socketService.onExistingPlayers((players: any[]) => {
      players.forEach((playerData) => this.addRemotePlayer(playerData));
    });

    this.socketService.onPlayerJoined((playerData: any) => {
      this.addRemotePlayer(playerData);
    });

    this.socketService.onPlayerMoved((data) => {
      const remotePlayer = this.remotePlayers.get(data.id);
      if (remotePlayer) {
        remotePlayer.updateTargetPosition(data.x, data.y, data.direction, data.animation, data.status);
      }
    });

    this.socketService.onPlayerLeft((data) => {
      this.removeRemotePlayer(data.id);
    });

    this.socketService.onJoinRoomSuccess((data) => {
      this.updatePlayerCountUI(data.playerCount);
    });
  }

  private addRemotePlayer(playerData: any): void {
    if (this.socketService.getSocket()?.id === playerData.id) return;
    if (this.remotePlayers.has(playerData.id)) return;

    const remotePlayer = new RemotePlayer(
      this,
      playerData.x,
      playerData.y,
      playerData.username,
      playerData.id,
      playerData.avatarSprite || 'worker-yellow',
      playerData.avatarColor || '#ffffff'
    );

    if (playerData.status === 'away') remotePlayer.setAlpha(0.5);
    
    // Add collisions for remote player
    if (this.wallsLayer) this.physics.add.collider(remotePlayer, this.wallsLayer);
    if (this.objectsLayer) this.physics.add.collider(remotePlayer, this.objectsLayer);
    if (this.beamsLayer) this.physics.add.collider(remotePlayer, this.beamsLayer);

    this.remotePlayers.set(playerData.id, remotePlayer);
  }

  private removeRemotePlayer(playerId: string): void {
    const remotePlayer = this.remotePlayers.get(playerId);
    if (remotePlayer) {
      remotePlayer.destroy();
      this.remotePlayers.delete(playerId);
    }
  }

  private createUI(): void {
    this.add.text(16, 16, 'Use WASD to move\n[E] to interact', {
      fontSize: '16px',
      color: '#ffffff',
      backgroundColor: '#000000',
      padding: { x: 10, y: 5 },
    }).setScrollFactor(0).setDepth(100);

    const infoText = this.add.text(
      this.cameras.main.width - 16,
      16,
      `Username: ${this.username}\nRoom: ${this.roomId}\nPlayers: 1`,
      {
        fontSize: '14px',
        color: '#ffffff',
        backgroundColor: '#000000',
        padding: { x: 10, y: 5 },
        align: 'right',
      }
    );
    infoText.setOrigin(1, 0);
    infoText.setScrollFactor(0);
    infoText.setDepth(100);
    infoText.setName('player-count');
  }

  private updatePlayerCountUI(count: number): void {
    const playerCountText = this.children.getByName('player-count') as Phaser.GameObjects.Text;
    if (playerCountText) {
      playerCountText.setText(`Username: ${this.username}\nRoom: ${this.roomId}\nPlayers: ${count}`);
    }
  }
}
