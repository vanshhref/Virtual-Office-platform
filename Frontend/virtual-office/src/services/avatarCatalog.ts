export interface AvatarProfile {
  body: string;
  eyes: string;
  hair: string;
  clothes: string;
  hat: string;
  accessory: string;
}

export const DEFAULT_AVATAR_PROFILE: AvatarProfile = {
  body: 'human-light',
  eyes: 'round-blue',
  hair: 'short-blonde',
  clothes: 'formal-gray',
  hat: 'none',
  accessory: 'none'
};

export const AVATAR_CATALOG = {
  body: [
    { id: 'human-light', label: 'Light' },
    { id: 'human-medium', label: 'Medium' },
    { id: 'human-dark', label: 'Dark' },
    { id: 'fantasy-green', label: 'Fantasy Green' },
    { id: 'blonde-hero', label: 'Blonde Hero' }
  ],
  eyes: [
    { id: 'round-blue', label: 'Blue Round' },
    { id: 'round-green', label: 'Green Round' },
    { id: 'narrow-dark', label: 'Narrow Dark' },
    { id: 'sleepy', label: 'Sleepy' }
  ],
  hair: [
    { id: 'short-blonde', label: 'Short Blonde' },
    { id: 'short-brown', label: 'Short Brown' },
    { id: 'curly-red', label: 'Curly Red' },
    { id: 'spiky-black', label: 'Spiky Black' }
  ],
  clothes: [
    { id: 'formal-gray', label: 'Formal Gray' },
    { id: 'formal-blue', label: 'Formal Blue' },
    { id: 'casual-green', label: 'Casual Green' },
    { id: 'casual-red', label: 'Casual Red' }
  ],
  hat: [
    { id: 'none', label: 'None' },
    { id: 'cap', label: 'Cap' },
    { id: 'beanie', label: 'Beanie' },
    { id: 'visor', label: 'Visor' }
  ],
  accessory: [
    { id: 'none', label: 'None' },
    { id: 'glasses', label: 'Glasses' },
    { id: 'headset', label: 'Headset' },
    { id: 'badge', label: 'Badge' }
  ]
} as const;

const BODY_TO_SPRITE: Record<string, string> = {
  'human-light': 'worker-yellow',
  'human-medium': 'worker-blue',
  'human-dark': 'worker-red',
  'fantasy-green': 'worker-green',
  'blonde-hero': 'worker-blonde-hero'
};

const CLOTHES_TO_COLOR: Record<string, string> = {
  'formal-gray': '#ffffff',
  'formal-blue': '#2196f3',
  'casual-green': '#4caf50',
  'casual-red': '#f44336'
};

export const composeAvatarFromProfile = (profile: AvatarProfile) => ({
  sprite: BODY_TO_SPRITE[profile.body] || 'worker-yellow',
  color: CLOTHES_TO_COLOR[profile.clothes] || '#ffffff'
});

export const normalizeAvatarProfile = (profile?: Partial<AvatarProfile> | null): AvatarProfile => ({
  body: profile?.body || DEFAULT_AVATAR_PROFILE.body,
  eyes: profile?.eyes || DEFAULT_AVATAR_PROFILE.eyes,
  hair: profile?.hair || DEFAULT_AVATAR_PROFILE.hair,
  clothes: profile?.clothes || DEFAULT_AVATAR_PROFILE.clothes,
  hat: profile?.hat || DEFAULT_AVATAR_PROFILE.hat,
  accessory: profile?.accessory || DEFAULT_AVATAR_PROFILE.accessory
});
