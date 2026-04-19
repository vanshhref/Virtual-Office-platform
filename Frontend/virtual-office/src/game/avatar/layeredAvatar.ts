import Phaser from 'phaser';
import { AvatarProfile } from '../../services/avatarCatalog';
import { getLayerTextureKey } from './layerAssetCatalog';

type LayerSpec = {
  key: keyof AvatarProfile;
  depthOffset: number;
  alpha: number;
  yOffset: number;
  visible: (profile: AvatarProfile) => boolean;
};

const LAYER_SPECS: LayerSpec[] = [
  {
    key: 'body',
    depthOffset: 0,
    alpha: 1,
    yOffset: 0,
    visible: () => true
  },
  {
    key: 'hair',
    depthOffset: 1,
    alpha: 0.24,
    yOffset: -3,
    visible: () => true
  },
  {
    key: 'eyes',
    depthOffset: 2,
    alpha: 0.2,
    yOffset: -1,
    visible: () => true
  },
  {
    key: 'hat',
    depthOffset: 3,
    alpha: 0.26,
    yOffset: -6,
    visible: (profile) => profile.hat !== 'none'
  },
  {
    key: 'accessory',
    depthOffset: 4,
    alpha: 0.24,
    yOffset: 1,
    visible: (profile) => profile.accessory !== 'none'
  }
];

export class LayeredAvatarRenderer {
  private layers: Phaser.GameObjects.Sprite[] = [];

  constructor(
    private scene: Phaser.Scene,
    private textureKey: string,
    private profile: AvatarProfile,
    private ownerDepth: number
  ) {}

  createAt(x: number, y: number, initialFrame = 0): void {
    this.destroy();
    this.layers = LAYER_SPECS.map((spec) => {
      const layerTextureKey = getLayerTextureKey(spec.key, this.profile[spec.key]);
      const textureToUse = this.scene.textures.exists(layerTextureKey) ? layerTextureKey : this.textureKey;
      const layer = this.scene.add.sprite(x, y + spec.yOffset, textureToUse, initialFrame);
      layer.setDepth(this.ownerDepth + spec.depthOffset);
      layer.setAlpha(spec.alpha);
      layer.setVisible(spec.visible(this.profile));
      layer.setScale(1.2);
      return layer;
    });
  }

  sync(ownerX: number, ownerY: number, ownerDepth: number, ownerAlpha: number, frame: number): void {
    this.layers.forEach((layer, index) => {
      const spec = LAYER_SPECS[index];
      layer.setPosition(ownerX, ownerY + spec.yOffset);
      layer.setDepth(ownerDepth + spec.depthOffset);
      layer.setAlpha(spec.alpha * ownerAlpha);
      layer.setFrame(frame);
    });
  }

  destroy(): void {
    this.layers.forEach((layer) => layer.destroy());
    this.layers = [];
  }
}
