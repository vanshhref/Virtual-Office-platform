// src/game/entities/Player.ts
import { SocketService } from '../services/SocketService';
import Phaser from 'phaser';

export default class Player extends Phaser.Physics.Arcade.Sprite {
  private cursors: Phaser.Types.Input.Keyboard.CursorKeys;
  private wasd: {
    W: Phaser.Input.Keyboard.Key;
    A: Phaser.Input.Keyboard.Key;
    S: Phaser.Input.Keyboard.Key;
    D: Phaser.Input.Keyboard.Key;
  };
  private speed: number = 200; // Increased speed
  currentDirection: string = 'down';
  private socketService: SocketService;
  private lastEmittedPosition: { x: number; y: number } = { x: 0, y: 0 };
  private lastEmitTime: number = 0;
  private readonly EMIT_INTERVAL = 50; // Send updates every 50ms

  private avatarSprite: string;
  private avatarColor: string;
  private status: 'online' | 'away' = 'online';
  private lastInputTime: number = Date.now();
  private readonly AWAY_TIMEOUT = 300000; // 5 minutes
  private nameText: Phaser.GameObjects.Text;
  private isSitting: boolean = false;
  private interactionBubble: Phaser.GameObjects.Container | null = null;

  constructor(scene: Phaser.Scene, x: number, y: number, sprite: string = 'worker-yellow', color: string = '#ffffff', username: string = 'You') {
    // Create sprite with physics enabled
    super(scene, x, y, sprite, 0);
    this.avatarSprite = sprite;
    this.avatarColor = color;

    // Add to scene
    scene.add.existing(this);
    scene.physics.add.existing(this);

    // Setup visuals
    this.setCollideWorldBounds(true);
    this.setScale(1.2); 
    this.setDepth(100); // Set high depth to be above layers
    this.setTint(Phaser.Display.Color.HexStringToColor(color).color);

    // FIX: Set a smaller hit-box (just the feet area) 
    if (this.body) {
      this.body.setSize(16, 12);
      this.body.setOffset(8, 36);
    }

    console.log(`👤 Player Created: ${username} at (${x}, ${y}) with sprite ${sprite}`);

    // Name tag
    this.nameText = scene.add.text(x, y - 45, username, {
      fontSize: '12px',
      fontFamily: 'Inter, Arial, sans-serif',
      color: '#000000',
      backgroundColor: '#ffffff',
      padding: { x: 8, y: 4 },
      fontStyle: 'bold'
    });
    this.nameText.setOrigin(0.5);
    this.nameText.setDepth(101); // Always above player
    this.nameText.setShadow(0, 2, 'rgba(0,0,0,0.1)', 2);

    // Setup keyboard controls
    this.cursors = scene.input.keyboard!.createCursorKeys();
    this.wasd = {
      W: scene.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.W),
      A: scene.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.A),
      S: scene.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.S),
      D: scene.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.D),
    };

    // Create animations
    this.createAnimations();

    // Initialize socket service
    this.socketService = SocketService.getInstance();
  }

  private createAnimations(): void {
    const scene = this.scene;
    const key = this.avatarSprite;

    // Only create if they don't exist
    if (scene.anims.exists(`${key}-idle-down`)) return;

    try {
      // Helper to create and validate
      const createSafeAnim = (animKey: string, frames: Phaser.Types.Animations.AnimationFrame[], frameRate: number, repeat: number) => {
        if (!frames || frames.length === 0) {
          console.error(`❌ Failed to generate frames for animation: ${animKey}`);
          return;
        }
        scene.anims.create({ key: animKey, frames, frameRate, repeat });
        console.log(`✅ Created animation: ${animKey} (${frames.length} frames)`);
      };

      // IDLE ANIMATIONS
      createSafeAnim(`${key}-idle-down`, [{ key, frame: 0 }], 1, 0);
      createSafeAnim(`${key}-idle-up`, [{ key, frame: 12 }], 1, 0);
      createSafeAnim(`${key}-idle-left`, [{ key, frame: 4 }], 1, 0);
      createSafeAnim(`${key}-idle-right`, [{ key, frame: 8 }], 1, 0);

      // WALK ANIMATIONS
      createSafeAnim(`${key}-walk-down`, scene.anims.generateFrameNumbers(key, { start: 0, end: 3 }), 10, -1);
      createSafeAnim(`${key}-walk-up`, scene.anims.generateFrameNumbers(key, { start: 12, end: 15 }), 10, -1);
      createSafeAnim(`${key}-walk-left`, scene.anims.generateFrameNumbers(key, { start: 4, end: 7 }), 10, -1);
      createSafeAnim(`${key}-walk-right`, scene.anims.generateFrameNumbers(key, { start: 8, end: 11 }), 10, -1);
    } catch (err) {
      console.error('❌ Error in createAnimations:', err);
    }
  }

  /**
   * Safely play an animation only if it exists and has frames
   */
  private safePlay(key: string, ignoreIfPlaying: boolean = true): void {
    const anim = this.scene.anims.get(key);
    if (anim && anim.frames && anim.frames.length > 0) {
      this.play(key, ignoreIfPlaying);
    } else {
      if (!anim) {
        console.warn(`⚠️ Animation not found: ${key}`);
      } else {
        console.warn(`⚠️ Animation exists but has no frames: ${key}`);
      }
    }
  }

  update(): void {
    if (this.isSitting) {
      this.setVelocity(0, 0);
      this.safePlay(`${this.avatarSprite}-idle-${this.currentDirection}`, true);
      
      // Update name tag position
      if (this.nameText) {
        this.nameText.setPosition(this.x, this.y - 45);
      }
      return;
    }

    this.setVelocity(0, 0);

    let isMoving = false;
    let newDirection = this.currentDirection;

    if (this.cursors.up.isDown || this.wasd.W.isDown) { this.setVelocityY(-this.speed); newDirection = 'up'; isMoving = true; }
    else if (this.cursors.down.isDown || this.wasd.S.isDown) { this.setVelocityY(this.speed); newDirection = 'down'; isMoving = true; }

    if (this.cursors.left.isDown || this.wasd.A.isDown) { this.setVelocityX(-this.speed); newDirection = 'left'; isMoving = true; }
    else if (this.cursors.right.isDown || this.wasd.D.isDown) { this.setVelocityX(this.speed); newDirection = 'right'; isMoving = true; }

    // DEBUG: Log velocity if keys are pressed but character isn't moving as expected
    if (isMoving && this.body && this.body.velocity.x === 0 && this.body.velocity.y === 0) {
      console.warn('⚠️ Input detected but velocity is 0! Stuck?');
    }

    if (this.body!.velocity.x !== 0 && this.body!.velocity.y !== 0) {
      this.setVelocity(this.body!.velocity.x * 0.7071, this.body!.velocity.y * 0.7071);
    }

    if (isMoving) {
      this.lastInputTime = Date.now();
      if (this.status === 'away') {
        this.status = 'online';
        this.setAlpha(1);
      }
      this.currentDirection = newDirection;
      this.safePlay(`${this.avatarSprite}-walk-${newDirection}`, true);
    } else {
      this.safePlay(`${this.avatarSprite}-idle-${this.currentDirection}`, true);
      
      // Away detection
      if (Date.now() - this.lastInputTime > this.AWAY_TIMEOUT && this.status === 'online') {
        this.status = 'away';
        this.setAlpha(0.5);
      }
    }

    const now = Date.now();
    const positionChanged = Math.abs(this.x - this.lastEmittedPosition.x) > 2 || Math.abs(this.y - this.lastEmittedPosition.y) > 2;

    if ((positionChanged || this.status !== 'online') && now - this.lastEmitTime > this.EMIT_INTERVAL) {
      this.socketService.sendMovement({
        x: this.x,
        y: this.y,
        direction: this.currentDirection as 'up' | 'down' | 'left' | 'right',
        animation: this.anims.currentAnim?.key || `${this.avatarSprite}-idle-down`,
        status: this.status
      });

      this.lastEmittedPosition = { x: this.x, y: this.y };
      this.lastEmitTime = now;
    }

    // Update name tag position
    if (this.nameText) {
      this.nameText.setPosition(this.x, this.y - 45);
    }
  }

  setSitting(sitting: boolean): void {
    this.isSitting = sitting;
    if (sitting) {
      this.setVelocity(0, 0);
      this.showInteractionBubble('💻 Working...');
    } else {
      this.showInteractionBubble('🚶 Standing up');
    }
  }

  showInteractionBubble(text: string): void {
    if (this.interactionBubble) {
      this.interactionBubble.destroy();
    }

    const bubbleText = this.scene.add.text(0, 0, text, {
      fontSize: '10px',
      color: '#ffffff',
      backgroundColor: '#667eea',
      padding: { x: 6, y: 3 },
    });
    bubbleText.setOrigin(0.5);

    this.interactionBubble = this.scene.add.container(this.x, this.y - 70, [bubbleText]);
    this.interactionBubble.setDepth(102);

    this.scene.tweens.add({
      targets: this.interactionBubble,
      y: this.y - 90,
      alpha: 0,
      duration: 2000,
      delay: 1000,
      onComplete: () => {
        if (this.interactionBubble) {
          this.interactionBubble.destroy();
          this.interactionBubble = null;
        }
      }
    });
  }

  getPosition() { return { x: this.x, y: this.y }; }
  getAvatarData() { return { sprite: this.avatarSprite, color: this.avatarColor }; }
}
