// Backend/src/routes/auth.ts
import { Router } from 'express';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { OAuth2Client } from 'google-auth-library';
import { createRemoteJWKSet, jwtVerify } from 'jose';
import { UserModel } from '../models/User.js';

const router = Router();
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';
const CLIENT_URL = process.env.CLIENT_URL || 'http://localhost:3000';
const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID || '';
const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET || '';
const GOOGLE_REDIRECT_URI = process.env.GOOGLE_REDIRECT_URI || 'http://localhost:4000/auth/oauth/google/callback';
const MICROSOFT_CLIENT_ID = process.env.MICROSOFT_CLIENT_ID || '';
const MICROSOFT_CLIENT_SECRET = process.env.MICROSOFT_CLIENT_SECRET || '';
const MICROSOFT_REDIRECT_URI = process.env.MICROSOFT_REDIRECT_URI || 'http://localhost:4000/auth/oauth/microsoft/callback';
const googleClient = new OAuth2Client(GOOGLE_CLIENT_ID);
const microsoftJwks = createRemoteJWKSet(new URL('https://login.microsoftonline.com/common/discovery/v2.0/keys'));
const DEFAULT_AVATAR_PROFILE = {
  body: 'human-light',
  eyes: 'round-blue',
  hair: 'short-blonde',
  clothes: 'formal-gray',
  hat: 'none',
  accessory: 'none'
};
const VALID_AVATAR_OPTIONS = {
  body: ['human-light', 'human-medium', 'human-dark', 'fantasy-green', 'blonde-hero'],
  eyes: ['round-blue', 'round-green', 'narrow-dark', 'sleepy'],
  hair: ['short-blonde', 'short-brown', 'curly-red', 'spiky-black'],
  clothes: ['formal-gray', 'formal-blue', 'casual-green', 'casual-red'],
  hat: ['none', 'cap', 'beanie', 'visor'],
  accessory: ['none', 'glasses', 'headset', 'badge']
} as const;
const VALID_SPRITES = ['worker-yellow', 'worker-blue', 'worker-green', 'worker-red', 'worker-blonde-hero'];
const COLOR_HEX_REGEX = /^#[0-9a-fA-F]{6}$/;

const isValidAvatarProfile = (profile: any): profile is typeof DEFAULT_AVATAR_PROFILE => {
  if (!profile || typeof profile !== 'object') return false;
  return (
    VALID_AVATAR_OPTIONS.body.includes(profile.body) &&
    VALID_AVATAR_OPTIONS.eyes.includes(profile.eyes) &&
    VALID_AVATAR_OPTIONS.hair.includes(profile.hair) &&
    VALID_AVATAR_OPTIONS.clothes.includes(profile.clothes) &&
    VALID_AVATAR_OPTIONS.hat.includes(profile.hat) &&
    VALID_AVATAR_OPTIONS.accessory.includes(profile.accessory)
  );
};

type SafeUser = {
  id: string;
  username: string;
  avatar_sprite: string;
  avatar_color: string;
  avatar_profile: any;
  avatar_customized: number;
};

const sanitizeUser = (user: any): SafeUser => ({
  id: user.id,
  username: user.username,
  avatar_sprite: user.avatar_sprite,
  avatar_color: user.avatar_color,
  avatar_profile: user.avatar_profile ? JSON.parse(user.avatar_profile) : undefined,
  avatar_customized: user.avatar_customized
});

const makeToken = (user: any) => jwt.sign({ id: user.id, username: user.username }, JWT_SECRET, { expiresIn: '24h' });

const makeOAuthRedirect = (token: string) => {
  const url = new URL(CLIENT_URL);
  url.searchParams.set('oauth', 'success');
  url.searchParams.set('token', token);
  return url.toString();
};

const makeOAuthErrorRedirect = (error: string) => {
  const url = new URL(CLIENT_URL);
  url.searchParams.set('oauth', 'error');
  url.searchParams.set('message', error);
  return url.toString();
};

const toUsernameBase = (value: string) => value.toLowerCase().replace(/[^a-z0-9]/g, '').slice(0, 16) || 'player';

const generateUniqueUsername = async (seed: string) => {
  const base = toUsernameBase(seed);
  let candidate = base;
  let attempt = 1;
  while (await UserModel.findByUsername(candidate)) {
    candidate = `${base}${Math.floor(1000 + Math.random() * 9000)}`;
    attempt += 1;
    if (attempt > 50) {
      candidate = `player${Date.now().toString().slice(-6)}`;
      break;
    }
  }
  return candidate;
};

async function findOrCreateGoogleUser(googleId: string, email?: string, name?: string) {
  let user = await UserModel.findByGoogleId(googleId);
  if (user) return user;

  if (email) {
    user = await UserModel.findByEmail(email);
    if (user) {
      await UserModel.attachGoogleId(user.id, googleId);
      return await UserModel.findById(user.id);
    }
  }

  const username = await generateUniqueUsername(name || email || `google${googleId.slice(0, 6)}`);
  const password = await bcrypt.hash(crypto.randomUUID(), 10);
  return await UserModel.create({
    username,
    email: email || null,
    password,
    avatar_customized: 0,
    avatar_sprite: 'worker-yellow',
    avatar_color: '#ffffff',
    avatar_profile: JSON.stringify(DEFAULT_AVATAR_PROFILE),
    google_id: googleId
  });
}

async function findOrCreateMicrosoftUser(microsoftId: string, email?: string, name?: string) {
  let user = await UserModel.findByMicrosoftId(microsoftId);
  if (user) return user;

  if (email) {
    user = await UserModel.findByEmail(email);
    if (user) {
      await UserModel.attachMicrosoftId(user.id, microsoftId);
      return await UserModel.findById(user.id);
    }
  }

  const username = await generateUniqueUsername(name || email || `microsoft${microsoftId.slice(0, 6)}`);
  const password = await bcrypt.hash(crypto.randomUUID(), 10);
  return await UserModel.create({
    username,
    email: email || null,
    password,
    avatar_customized: 0,
    avatar_sprite: 'worker-yellow',
    avatar_color: '#ffffff',
    avatar_profile: JSON.stringify(DEFAULT_AVATAR_PROFILE),
    microsoft_id: microsoftId
  });
}

router.post('/signup', async (req, res) => {
  try {
    const { username, email, password } = req.body;
    
    const existingUser = await UserModel.findByUsername(username);
    if (existingUser) return res.status(400).json({ error: 'Username taken' });

    if (email) {
      const existingEmail = await UserModel.findByEmail(email);
      if (existingEmail) return res.status(400).json({ error: 'Email already registered' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const user = await UserModel.create({
      username,
      email,
      password: hashedPassword,
      avatar_profile: JSON.stringify(DEFAULT_AVATAR_PROFILE)
    });

    const token = makeToken(user);
    res.json({ token, user: sanitizeUser(user) });
  } catch (err) {
    console.error('Signup error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.post('/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    
    const user = await UserModel.findByUsername(username);
    if (!user) return res.status(401).json({ error: 'Invalid credentials' });

    const valid = await bcrypt.compare(password, user.password!);
    if (!valid) return res.status(401).json({ error: 'Invalid credentials' });

    const token = makeToken(user);
    res.json({ token, user: sanitizeUser(user) });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.post('/update-avatar', async (req, res) => {
  // Simple auth check for now (can use middleware later)
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'Unauthorized' });

  try {
    const decoded: any = jwt.verify(token, JWT_SECRET);
    const { sprite, color, profile } = req.body;
    if (!VALID_SPRITES.includes(sprite) || !COLOR_HEX_REGEX.test(color)) {
      return res.status(400).json({ error: 'Invalid avatar sprite/color' });
    }
    if (profile && !isValidAvatarProfile(profile)) {
      return res.status(400).json({ error: 'Invalid avatar profile' });
    }
    await UserModel.updateAvatar(decoded.id, sprite, color, profile ? JSON.stringify(profile) : undefined);
    res.json({ success: true });
  } catch (err) {
    res.status(401).json({ error: 'Invalid token' });
  }
});

router.get('/me', async (req, res) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'Unauthorized' });

  try {
    const decoded: any = jwt.verify(token, JWT_SECRET);
    const user = await UserModel.findById(decoded.id);
    if (!user) return res.status(404).json({ error: 'User not found' });
    return res.json({ user: sanitizeUser(user) });
  } catch (err) {
    return res.status(401).json({ error: 'Invalid token' });
  }
});

router.get('/oauth/google/start', (req, res) => {
  if (!GOOGLE_CLIENT_ID || !GOOGLE_CLIENT_SECRET) {
    return res.status(500).json({ error: 'Google OAuth not configured' });
  }
  const params = new URLSearchParams({
    client_id: GOOGLE_CLIENT_ID,
    redirect_uri: GOOGLE_REDIRECT_URI,
    response_type: 'code',
    scope: 'openid email profile',
    access_type: 'offline',
    prompt: 'select_account'
  });
  return res.redirect(`https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`);
});

router.get('/oauth/google/callback', async (req, res) => {
  try {
    const { code } = req.query as { code?: string };
    if (!code) return res.redirect(makeOAuthErrorRedirect('google_auth_failed'));

    const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        code,
        client_id: GOOGLE_CLIENT_ID,
        client_secret: GOOGLE_CLIENT_SECRET,
        redirect_uri: GOOGLE_REDIRECT_URI,
        grant_type: 'authorization_code'
      })
    });
    const tokenJson: any = await tokenRes.json();
    if (!tokenJson.id_token) return res.redirect(makeOAuthErrorRedirect('google_id_token_missing'));

    const ticket = await googleClient.verifyIdToken({
      idToken: tokenJson.id_token,
      audience: GOOGLE_CLIENT_ID
    });
    const payload = ticket.getPayload();
    if (!payload?.sub) return res.redirect(makeOAuthErrorRedirect('google_payload_invalid'));

    const user = await findOrCreateGoogleUser(payload.sub, payload.email || undefined, payload.name || undefined);
    if (!user) return res.redirect(makeOAuthErrorRedirect('user_creation_failed'));

    const appToken = makeToken(user);
    return res.redirect(makeOAuthRedirect(appToken));
  } catch (error) {
    return res.redirect(makeOAuthErrorRedirect('google_callback_error'));
  }
});

router.get('/oauth/microsoft/start', (req, res) => {
  if (!MICROSOFT_CLIENT_ID || !MICROSOFT_CLIENT_SECRET) {
    return res.status(500).json({ error: 'Microsoft OAuth not configured' });
  }

  const params = new URLSearchParams({
    client_id: MICROSOFT_CLIENT_ID,
    response_type: 'code',
    redirect_uri: MICROSOFT_REDIRECT_URI,
    response_mode: 'query',
    scope: 'openid profile email User.Read'
  });

  return res.redirect(`https://login.microsoftonline.com/common/oauth2/v2.0/authorize?${params.toString()}`);
});

router.get('/oauth/microsoft/callback', async (req, res) => {
  try {
    const { code } = req.query as { code?: string };
    if (!code) return res.redirect(makeOAuthErrorRedirect('microsoft_auth_failed'));

    const tokenRes = await fetch('https://login.microsoftonline.com/common/oauth2/v2.0/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id: MICROSOFT_CLIENT_ID,
        client_secret: MICROSOFT_CLIENT_SECRET,
        code,
        redirect_uri: MICROSOFT_REDIRECT_URI,
        grant_type: 'authorization_code'
      })
    });
    const tokenJson: any = await tokenRes.json();
    if (!tokenJson.id_token) return res.redirect(makeOAuthErrorRedirect('microsoft_id_token_missing'));

    const verified = await jwtVerify(tokenJson.id_token, microsoftJwks, {
      audience: MICROSOFT_CLIENT_ID
    });
    const payload = verified.payload as any;
    const subject = payload.oid || payload.sub;
    const email = payload.preferred_username || payload.email;
    const issuer = String(payload.iss || '');
    if (!subject || !issuer.includes('login.microsoftonline.com')) {
      return res.redirect(makeOAuthErrorRedirect('microsoft_payload_invalid'));
    }

    const user = await findOrCreateMicrosoftUser(subject, email, payload.name);
    if (!user) return res.redirect(makeOAuthErrorRedirect('user_creation_failed'));

    const appToken = makeToken(user);
    return res.redirect(makeOAuthRedirect(appToken));
  } catch (error) {
    return res.redirect(makeOAuthErrorRedirect('microsoft_callback_error'));
  }
});

export default router;
