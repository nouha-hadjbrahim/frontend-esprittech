import { HttpClient } from '@angular/common/http';
import { Injectable, computed, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { Observable, tap } from 'rxjs';
import { environment } from '../../../environments/environment';
import { AuthResponse } from '../models/auth-response.model';
import { LoginRequest, RegisterRequest, Role, User } from '../models/user.model';
import { TokenService } from './token.service';

/**
 * Service d'authentification : inscription, connexion, refresh, déconnexion
 * et exposition de l'utilisateur courant (signal réactif).
 */
@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly http = inject(HttpClient);
  private readonly router = inject(Router);
  private readonly tokenService = inject(TokenService);

  private readonly baseUrl = `${environment.apiUrl}/auth`;

  /** Utilisateur courant, hydraté depuis le localStorage au démarrage. */
  private readonly _currentUser = signal<User | null>(this.tokenService.getUser());
  readonly currentUser = this._currentUser.asReadonly();
  readonly isAuthenticated = computed(() => this._currentUser() !== null);

  /** Inscription : crée le compte (validé contre le référentiel) et connecte l'utilisateur. */
  register(request: RegisterRequest): Observable<AuthResponse> {
    return this.http
      .post<AuthResponse>(`${this.baseUrl}/register`, request)
      .pipe(tap((res) => this.persistSession(res)));
  }

  /** Connexion : stocke les tokens et l'utilisateur. */
  login(request: LoginRequest): Observable<AuthResponse> {
    return this.http
      .post<AuthResponse>(`${this.baseUrl}/login`, request)
      .pipe(tap((res) => this.persistSession(res)));
  }

  /** Rafraîchit le couple de tokens à partir du refresh token courant. */
  refreshToken(): Observable<AuthResponse> {
    const refreshToken = this.tokenService.getRefreshToken();
    return this.http
      .post<AuthResponse>(`${this.baseUrl}/refresh`, { refreshToken })
      .pipe(tap((res) => this.persistSession(res)));
  }

  /** Récupère le profil courant depuis le backend et met à jour l'état local. */
  getCurrentUser(): Observable<User> {
    return this.http
      .get<User>(`${this.baseUrl}/me`)
      .pipe(tap((user) => {
        this.tokenService.setUser(user);
        this._currentUser.set(user);
      }));
  }

  /** Déconnexion locale + redirection vers la page de connexion. */
  logout(): void {
    this.tokenService.clear();
    this._currentUser.set(null);
    void this.router.navigate(['/sign-in']);
  }

  /** true si un access token valide (non expiré) est présent. */
  isLoggedIn(): boolean {
    return !this.tokenService.isTokenExpired();
  }

  /** Rôle de l'utilisateur courant (ou null). */
  getRole(): Role | null {
    return this._currentUser()?.role ?? null;
  }

  /** Route d'atterrissage après connexion, selon le rôle de l'utilisateur. */
  landingRoute(): string {
    switch (this.getRole()) {
      case 'ROLE_ADMIN':
        return '/backoffice/users';
      case 'ROLE_ENSEIGNANT':
        return '/frontoffice/catalogue';
      case 'ROLE_ETUDIANT':
        return '/frontoffice/sujets-disponibles';
      case 'ROLE_CHEF_EQUIPE':
      case 'ROLE_CI':
        return '/frontoffice/tableau-de-bord';
      default:
        return '/frontoffice/sujets-disponibles';
    }
  }

  private persistSession(res: AuthResponse): void {
    this.tokenService.setToken(res.accessToken);
    this.tokenService.setRefreshToken(res.refreshToken);
    this.tokenService.setUser(res.user);
    this._currentUser.set(res.user);
  }
}
