// src/game/entities/RemotePlayer.ts
import Phaser from 'phaser';

export default class RemotePlayer extends Phaser.Physics.Arcade.Sprite {
  private username: string;
  private nameText: Phaser.GameObjects.Text;
  private targetPosition: { x: number; y: number };
  private avatarSprite: string;
  private avatarColor: string;
  private status: 'online' | 'away' | 'offline' = 'online';

  private readonly INTERPOLATION_SPEED = 0.2;

  constructor(
    scene: Phaser.Scene,
    x: number,
    y: number,
    username: string,
    playerId: string,
    sprite: string = 'worker-yellow',
    color: string = '#ffffff'
  ) {
    super(scene, x, y, sprite, 0);
    this.avatarSprite = sprite;
    this.avatarColor = color;
    this.username = username;
    this.targetPosition = { x, y };

    scene.add.existing(this);
    scene.physics.add.existing(this);

    this.setScale(1.2); 
    this.setTint(Phaser.Display.Color.HexStringToColor(color).color);
    this.setDepth(100);

    console.log(`👥 Remote Player Created: ${username} at (${x}, ${y})`);

    this.nameText = scene.add.text(x, y - 45, username, {
      fontSize: '12px',
      fontFamily: 'Inter, Arial, sans-serif',
      color: '#000000',
      backgroundColor: '#ffffff',
      padding: { x: 8, y: 4 },
      fontStyle: 'bold'
    });
    this.nameText.setOrigin(0.5);
    this.nameText.setDepth(101);
    this.nameText.setShadow(0, 2, 'rgba(0,0,0,0.1)', 2);
    
    this.createAnimations();
    this.safePlay(`${sprite}-idle-down`, true);
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
        console.warn(`⚠️ Animation not found for remote player: ${key}`);
      } else {
        console.warn(`⚠️ Animation exists but has no frames for remote player: ${key}`);
      }
    }
  }

  private createAnimations(): void {
    const scene = this.scene;
    const key = this.avatarSprite;
    if (scene.anims.exists(`${key}-idle-down`)) return;

    try {
      // Helper to create and validate
      const createSafeAnim = (animKey: string, frames: Phaser.Types.Animations.AnimationFrame[], frameRate: number, repeat: number) => {
        if (!frames || frames.length === 0) {
          console.error(`❌ Failed to generate frames for remote animation: ${animKey}`);
          return;
        }
        scene.anims.create({ key: animKey, frames, frameRate, repeat });
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
      console.error('❌ Error in RemotePlayer.createAnimations:', err);
    }
  }

  updateTargetPosition(x: number, y: number, direction: string, animation: string, status?: 'online' | 'away'): void {
    this.targetPosition = { x, y };
    if (status) {
      this.status = status;
      this.setAlpha(status === 'away' ? 0.5 : 1);
      this.nameText.setText(`${this.username}${status === 'away' ? ' (Away)' : ''}`);
    }
    this.safePlay(animation, true);
  }

  update(): void {
    const dx = this.targetPosition.x - this.x;
    const dy = this.targetPosition.y - this.y;
    const distance = Math.sqrt(dx * dx + dy * dy);

    if (distance < 1) {
      this.setPosition(this.targetPosition.x, this.targetPosition.y);
    } else {
      this.setPosition(this.x + dx * this.INTERPOLATION_SPEED, this.y + dy * this.INTERPOLATION_SPEED);
    }

    this.nameText.setPosition(this.x, this.y - 45);
  }

  destroy(fromScene?: boolean): void {
    this.nameText.destroy();
    super.destroy(fromScene);
  }

  getUsername() { return this.username; }
}
