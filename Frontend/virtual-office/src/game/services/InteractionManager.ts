// src/game/services/InteractionManager.ts

import Phaser from 'phaser';
import { InteractionZone } from '../types/Interaction';

export class InteractionManager {
  private scene: Phaser.Scene;
  private interactionZones: InteractionZone[] = [];
  private activeZone: InteractionZone | null = null;
  private interactionUI: Phaser.GameObjects.Container | null = null;
  private eKey: Phaser.Input.Keyboard.Key;

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
    
    // Setup E key for interactions
    this.eKey = scene.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.E);
  }

  /**
   * Load interaction zones from Tiled object layer
   */
  loadInteractionZones(objectLayer: Phaser.Tilemaps.ObjectLayer): void {
    console.log(`📍 Loading ${objectLayer.objects.length} interaction zones...`);

    objectLayer.objects.forEach((obj, index) => {
      if (obj.rectangle) {
        const zone: InteractionZone = {
          id: `zone_${index}`,
          type: (obj.properties?.find((p: any) => p.name === 'type')?.value || 'custom') as any,
          name: obj.properties?.find((p: any) => p.name === 'name')?.value || obj.name || `Zone ${index}`,
          action: obj.properties?.find((p: any) => p.name === 'action')?.value || 'interact',
          bounds: new Phaser.Geom.Rectangle(obj.x!, obj.y!, obj.width!, obj.height!),
          isPlayerInside: false,
        };

        this.interactionZones.push(zone);
      }
    });

    console.log(`✅ Loaded ${this.interactionZones.length} interaction zones`);
  }

  /**
   * Check if player is in any interaction zone
   */
  update(playerX: number, playerY: number): void {
    let foundZone = false;

    for (const zone of this.interactionZones) {
      const wasInside = zone.isPlayerInside;
      zone.isPlayerInside = zone.bounds.contains(playerX, playerY);

      // Entered zone
      if (zone.isPlayerInside && !wasInside) {
        this.onEnterZone(zone);
        foundZone = true;
      }
      // Left zone
      else if (!zone.isPlayerInside && wasInside) {
        this.onLeaveZone(zone);
      }
      // Still in zone
      else if (zone.isPlayerInside) {
        foundZone = true;
        this.activeZone = zone;
      }
    }

    // Not in any zone
    if (!foundZone && this.activeZone) {
      this.hideInteractionUI();
      this.activeZone = null;
    }

    // Check for E key press
    if (Phaser.Input.Keyboard.JustDown(this.eKey) && this.activeZone) {
      this.triggerInteraction(this.activeZone);
    }
  }

  private onEnterZone(zone: InteractionZone): void {
    console.log(`🚪 Entered zone: ${zone.name}`);
    this.activeZone = zone;
    this.showInteractionUI(zone);
  }

  private onLeaveZone(zone: InteractionZone): void {
    console.log(`🚪 Left zone: ${zone.name}`);
  }

  private showInteractionUI(zone: InteractionZone): void {
    // Remove existing UI
    this.hideInteractionUI();

    // Create a compact "E" badge
    const bg = this.scene.add.rectangle(0, 0, 30, 30, 0xffffff, 1);
    const keyText = this.scene.add.text(0, 0, 'E', {
      fontSize: '16px',
      color: '#000000',
      fontStyle: 'bold'
    });
    keyText.setOrigin(0.5);

    const actionText = this.scene.add.text(0, 35, zone.action.toUpperCase(), {
      fontSize: '10px',
      color: '#ffffff',
      backgroundColor: 'rgba(0,0,0,0.5)',
      padding: { x: 4, y: 2 }
    });
    actionText.setOrigin(0.5);

    // Create container
    this.interactionUI = this.scene.add.container(0, -80, [bg, keyText, actionText]);
    this.interactionUI.setDepth(1000);

    // Bounce animation
    this.scene.tweens.add({
      targets: this.interactionUI,
      y: -85,
      duration: 600,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut'
    });
  }

  private hideInteractionUI(): void {
    if (this.interactionUI) {
      this.interactionUI.destroy();
      this.interactionUI = null;
    }
  }

  private triggerInteraction(zone: InteractionZone): void {
    console.log(`⚡ Triggered interaction: ${zone.name} (${zone.action})`);

    // Emit event for the scene to handle
    this.scene.events.emit('interaction-triggered', {
      zone,
      action: zone.action,
      type: zone.type,
    });

    // You can add specific logic here
    switch (zone.type) {
      case 'meeting_room':
        console.log('🎥 Starting video call in meeting room...');
        // This will be connected to video chat in Sprint 4
        break;
      case 'desk':
        console.log('💼 Interacting with desk...');
        break;
      case 'coffee':
        console.log('☕ Getting coffee...');
        this.showTemporaryMessage('☕ You got a coffee! +10 energy');
        break;
      case 'whiteboard':
        console.log('📝 Opening whiteboard...');
        break;
    }
  }

  private showTemporaryMessage(message: string): void {
    const text = this.scene.add.text(
      this.scene.cameras.main.centerX,
      this.scene.cameras.main.centerY,
      message,
      {
        fontSize: '24px',
        color: '#FFD700',
        backgroundColor: '#000000',
        padding: { x: 20, y: 10 },
      }
    );
    text.setOrigin(0.5);
    text.setScrollFactor(0);
    text.setDepth(2000);

    // Fade out and destroy
    this.scene.tweens.add({
      targets: text,
      alpha: 0,
      y: text.y - 50,
      duration: 2000,
      onComplete: () => text.destroy(),
    });
  }

  /**
   * Update UI position to follow player
   */
  updateUIPosition(playerX: number, playerY: number): void {
    if (this.interactionUI) {
      this.interactionUI.setPosition(playerX, playerY);
    }
  }

  /**
   * Get all interaction zones
   */
  getZones(): InteractionZone[] {
    return this.interactionZones;
  }

  /**
   * Get active zone
   */
  getActiveZone(): InteractionZone | null {
    return this.activeZone;
  }

  /**
   * Cleanup
   */
  destroy(): void {
    this.hideInteractionUI();
    this.interactionZones = [];
  }
}
