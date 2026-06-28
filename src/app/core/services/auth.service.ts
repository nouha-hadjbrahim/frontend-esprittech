import { HttpClient } from '@angular/common/http';
import { Injectable, computed, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { Observable, catchError, map, of, tap } from 'rxjs';
import { environment } from '../../../environments/environment';
import { LoginRequest, RegisterRequest, Role, User } from '../models/user.model';

/** Anciennes clés localStorage (tokens + user) à purger : plus aucune donnée sensible côté JS. */
const LEGACY_STORAGE_KEYS = [
  'esprittech.accessToken',
  'esprittech.refreshToken',
  'esprittech.user',
  'auth_token',
  'auth_user',
  'auth_user_email',
  'auth_user_id',
];

/**
 * Service d'authentification basé sur des cookies HttpOnly.
 *
 * Les tokens (access + refresh) sont gérés exclusivement par le navigateur via des
 * cookies HttpOnly posés par le backend : le frontend n'y touche jamais et ne stocke
 * AUCUNE donnée sensible dans le localStorage. Seules les infos utilisateur non
 * sensibles sont conservées en mémoire (signal), restaurées au démarrage via /auth/me.
 */
@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly http = inject(HttpClient);
  private readonly router = inject(Router);

  private readonly baseUrl = `${environment.apiUrl}/auth`;

  /** Utilisateur courant, en mémoire uniquement (perdu au refresh → restauré via /auth/me). */
  private readonly _currentUser = signal<User | null>(null);
  readonly currentUser = this._currentUser.asReadonly();
  readonly isAuthenticated = computed(() => this._currentUser() !== null);

  constructor() {
    // Migration : on efface tout résidu de l'ancien stockage localStorage.
    this.clearLegacyStorage();
  }

  /** Inscription : le backend crée le compte et pose les cookies ; on récupère l'utilisateur. */
  register(request: RegisterRequest): Observable<User> {
    return this.http
      .post<User>(`${this.baseUrl}/register`, request)
      .pipe(tap((user) => this._currentUser.set(user)));
  }

  /** Connexion : le backend pose les cookies HttpOnly ; on stocke l'utilisateur en mémoire. */
  login(request: LoginRequest): Observable<User> {
    return this.http
      .post<User>(`${this.baseUrl}/login`, request)
      .pipe(tap((user) => this._currentUser.set(user)));
  }

  /** Rafraîchit l'access token : le cookie refresh_token est envoyé automatiquement. */
  refreshToken(): Observable<User> {
    return this.http
      .post<User>(`${this.baseUrl}/refresh`, {})
      .pipe(tap((user) => this._currentUser.set(user)));
  }

  /** Récupère le profil courant depuis le backend (cookie d'accès) et met à jour l'état local. */
  getCurrentUser(): Observable<User> {
    return this.http
      .get<User>(`${this.baseUrl}/me`)
      .pipe(tap((user) => this._currentUser.set(user)));
  }

  /**
   * Restaure la session au démarrage de l'app : si le cookie d'accès est encore valide,
   * /auth/me renvoie l'utilisateur ; sinon on reste déconnecté (sans erreur).
   * Utilisé par l'APP_INITIALIZER.
   */
  restoreSession(): Observable<void> {
    return this.http.get<User>(`${this.baseUrl}/me`).pipe(
      tap((user) => this._currentUser.set(user)),
      map(() => undefined),
      catchError(() => {
        this._currentUser.set(null);
        return of(undefined);
      }),
    );
  }

  /** Déconnexion : le backend efface les cookies, puis on vide l'état local et on redirige. */
  logout(): void {
    this.http.post<void>(`${this.baseUrl}/logout`, {}).subscribe({
      next: () => this.finalizeLogout(),
      error: () => this.finalizeLogout(),
    });
  }

  /** Vide l'état d'authentification en mémoire (sans appel réseau). */
  clearSession(): void {
    this._currentUser.set(null);
  }

  /** true si un utilisateur est authentifié (présent en mémoire). */
  isLoggedIn(): boolean {
    return this._currentUser() !== null;
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
        return '/frontoffice/sujets/mes-sujets';
      case 'ROLE_ETUDIANT':
        return '/frontoffice/sujets/disponibles';
      case 'ROLE_CI':
        return '/ci/industrialisation';
      case 'ROLE_CHEF_EQUIPE':
        return '/frontoffice/tableau-de-bord';
      default:
        return '/frontoffice/sujets/disponibles';
    }
  }

  private finalizeLogout(): void {
    this.clearSession();
    void this.router.navigate(['/sign-in']);
  }

  private clearLegacyStorage(): void {
    LEGACY_STORAGE_KEYS.forEach((key) => localStorage.removeItem(key));
  }
}
