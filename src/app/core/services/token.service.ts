import { Injectable } from '@angular/core';
import { JwtPayload, User } from '../models/user.model';

/**
 * Stockage et lecture des tokens JWT (access + refresh) et de l'utilisateur courant
 * dans le localStorage. Centralise le décodage et la détection d'expiration côté client.
 */
@Injectable({ providedIn: 'root' })
export class TokenService {
  private static readonly ACCESS_KEY = 'esprittech.accessToken';
  private static readonly REFRESH_KEY = 'esprittech.refreshToken';
  private static readonly USER_KEY = 'esprittech.user';

  // ----- Access token -----

  getToken(): string | null {
    return localStorage.getItem(TokenService.ACCESS_KEY);
  }

  setToken(token: string): void {
    localStorage.setItem(TokenService.ACCESS_KEY, token);
  }

  removeToken(): void {
    localStorage.removeItem(TokenService.ACCESS_KEY);
  }

  // ----- Refresh token -----

  getRefreshToken(): string | null {
    return localStorage.getItem(TokenService.REFRESH_KEY);
  }

  setRefreshToken(token: string): void {
    localStorage.setItem(TokenService.REFRESH_KEY, token);
  }

  // ----- Utilisateur courant -----

  setUser(user: User): void {
    localStorage.setItem(TokenService.USER_KEY, JSON.stringify(user));
  }

  getUser(): User | null {
    const raw = localStorage.getItem(TokenService.USER_KEY);
    if (!raw) {
      return null;
    }
    try {
      return JSON.parse(raw) as User;
    } catch {
      return null;
    }
  }

  /** Efface l'ensemble des données d'authentification. */
  clear(): void {
    localStorage.removeItem(TokenService.ACCESS_KEY);
    localStorage.removeItem(TokenService.REFRESH_KEY);
    localStorage.removeItem(TokenService.USER_KEY);
  }

  /** Décode le payload d'un JWT (sans vérifier la signature — usage lecture seule). */
  decodeToken(token: string | null = this.getToken()): JwtPayload | null {
    if (!token) {
      return null;
    }
    const parts = token.split('.');
    if (parts.length !== 3) {
      return null;
    }
    try {
      const payload = parts[1].replace(/-/g, '+').replace(/_/g, '/');
      const decoded = atob(payload);
      return JSON.parse(decoded) as JwtPayload;
    } catch {
      return null;
    }
  }

  /** true si le token est absent, illisible ou expiré (marge de 5 s). */
  isTokenExpired(token: string | null = this.getToken()): boolean {
    const payload = this.decodeToken(token);
    if (!payload?.exp) {
      return true;
    }
    const nowSeconds = Math.floor(Date.now() / 1000);
    return payload.exp <= nowSeconds + 5;
  }
}
