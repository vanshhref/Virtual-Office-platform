import { AvatarProfile } from '../../services/avatarCatalog';

type Part = keyof AvatarProfile;

type AssetEntry = {
  key: string;
  path: string;
};

const SPRITE_PATHS = {
  yellow: 'assets/sprites/worker-yellow.png',
  blue: 'assets/sprites/worker-blue.png',
  green: 'assets/sprites/worker-green.png',
  red: 'assets/sprites/worker-red.png',
  blondeHero: 'assets/sprites/worker-blonde-hero.png'
} as const;

const LAYER_ASSET_MAP: Record<Part, Record<string, AssetEntry>> = {
  body: {
    'human-light': { key: 'layer-body-human-light', path: SPRITE_PATHS.yellow },
    'human-medium': { key: 'layer-body-human-medium', path: SPRITE_PATHS.blue },
    'human-dark': { key: 'layer-body-human-dark', path: SPRITE_PATHS.red },
    'fantasy-green': { key: 'layer-body-fantasy-green', path: SPRITE_PATHS.green },
    'blonde-hero': { key: 'layer-body-blonde-hero', path: SPRITE_PATHS.blondeHero }
  },
  eyes: {
    'round-blue': { key: 'layer-eyes-round-blue', path: SPRITE_PATHS.blue },
    'round-green': { key: 'layer-eyes-round-green', path: SPRITE_PATHS.green },
    'narrow-dark': { key: 'layer-eyes-narrow-dark', path: SPRITE_PATHS.red },
    sleepy: { key: 'layer-eyes-sleepy', path: SPRITE_PATHS.yellow }
  },
  hair: {
    'short-blonde': { key: 'layer-hair-short-blonde', path: SPRITE_PATHS.yellow },
    'short-brown': { key: 'layer-hair-short-brown', path: SPRITE_PATHS.red },
    'curly-red': { key: 'layer-hair-curly-red', path: SPRITE_PATHS.red },
    'spiky-black': { key: 'layer-hair-spiky-black', path: SPRITE_PATHS.blue }
  },
  clothes: {
    'formal-gray': { key: 'layer-clothes-formal-gray', path: SPRITE_PATHS.yellow },
    'formal-blue': { key: 'layer-clothes-formal-blue', path: SPRITE_PATHS.blue },
    'casual-green': { key: 'layer-clothes-casual-green', path: SPRITE_PATHS.green },
    'casual-red': { key: 'layer-clothes-casual-red', path: SPRITE_PATHS.red }
  },
  hat: {
    none: { key: 'layer-hat-none', path: SPRITE_PATHS.yellow },
    cap: { key: 'layer-hat-cap', path: SPRITE_PATHS.blue },
    beanie: { key: 'layer-hat-beanie', path: SPRITE_PATHS.red },
    visor: { key: 'layer-hat-visor', path: SPRITE_PATHS.green }
  },
  accessory: {
    none: { key: 'layer-accessory-none', path: SPRITE_PATHS.yellow },
    glasses: { key: 'layer-accessory-glasses', path: SPRITE_PATHS.red },
    headset: { key: 'layer-accessory-headset', path: SPRITE_PATHS.blue },
    badge: { key: 'layer-accessory-badge', path: SPRITE_PATHS.green }
  }
};

export const getLayerTextureKey = (part: Part, value: string): string => {
  return LAYER_ASSET_MAP[part]?.[value]?.key || LAYER_ASSET_MAP[part][Object.keys(LAYER_ASSET_MAP[part])[0]].key;
};

export const getAllLayerSpriteAssets = (): AssetEntry[] => {
  const seen = new Set<string>();
  const all: AssetEntry[] = [];

  (Object.keys(LAYER_ASSET_MAP) as Part[]).forEach((part) => {
    Object.values(LAYER_ASSET_MAP[part]).forEach((entry) => {
      if (seen.has(entry.key)) return;
      seen.add(entry.key);
      all.push(entry);
    });
  });

  return all;
};
