// src/services/AuthService.ts
import axios from 'axios';
import { jwtDecode } from 'jwt-decode';
import { AvatarProfile } from './avatarCatalog';

const API_URL = (process.env.REACT_APP_API_URL || 'http://localhost:4000') + '/auth';

export interface User {
  id: string;
  username: string;
  avatar_sprite: string;
  avatar_color: string;
  avatar_profile?: AvatarProfile;
  avatar_customized: number;
}

class AuthService {
  private token: string | null = localStorage.getItem('token');
  private user: User | null = JSON.parse(localStorage.getItem('user') || 'null');

  async signup(username: string, email: string, password: string) {
    const res = await axios.post(`${API_URL}/signup`, { username, email, password });
    this.saveSession(res.data.token, res.data.user);
    return res.data;
  }

  async login(username: string, password: string) {
    const res = await axios.post(`${API_URL}/login`, { username, password });
    this.saveSession(res.data.token, res.data.user);
    return res.data;
  }

  async updateAvatar(sprite: string, color: string, profile?: AvatarProfile) {
    if (!this.token) return;
    await axios.post(`${API_URL}/update-avatar`, { sprite, color, profile }, {
      headers: { Authorization: `Bearer ${this.token}` }
    });
    this.user = {
      ...this.user!,
      avatar_sprite: sprite,
      avatar_color: color,
      avatar_profile: profile || this.user?.avatar_profile,
      avatar_customized: 1
    };
    localStorage.setItem('user', JSON.stringify(this.user));
  }

  startOAuthLogin(provider: 'google' | 'microsoft') {
    window.location.href = `${API_URL}/oauth/${provider}/start`;
  }

  async consumeOAuthCallback(): Promise<User | null> {
    const params = new URLSearchParams(window.location.search);
    const oauthStatus = params.get('oauth');
    const token = params.get('token');
    if (oauthStatus !== 'success' || !token) {
      return null;
    }

    this.token = token;
    localStorage.setItem('token', token);

    const res = await axios.get(`${API_URL}/me`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    const user: User = res.data.user;
    this.user = user;
    localStorage.setItem('user', JSON.stringify(user));

    const cleanedUrl = `${window.location.origin}${window.location.pathname}`;
    window.history.replaceState({}, document.title, cleanedUrl);
    return user;
  }

  logout() {
    this.token = null;
    this.user = null;
    localStorage.removeItem('token');
    localStorage.removeItem('user');
  }

  private saveSession(token: string, user: User) {
    this.token = token;
    this.user = user;
    localStorage.setItem('token', token);
    localStorage.setItem('user', JSON.stringify(user));
  }

  getToken() { return this.token; }
  getUser() { return this.user; }
  isAuthenticated() { return !!this.token; }
}

export const authService = new AuthService();
