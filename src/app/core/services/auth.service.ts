import { HttpClient, HttpResponse } from '@angular/common/http';
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
 * Authentification hybride :
 * - cookies HttpOnly (access + refresh) posés par le backend ;
 * - access token en mémoire (signal), lu depuis l'en-tête Authorization des réponses login/refresh,
 *   renvoyé en Bearer sur chaque requête (fiabilise les POST via le proxy Angular).
 */
@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly http = inject(HttpClient);
  private readonly router = inject(Router);

  private readonly baseUrl = `${environment.apiUrl}/auth`;

  private readonly _currentUser = signal<User | null>(null);
  private readonly _accessToken = signal<string | null>(null);

  readonly currentUser = this._currentUser.asReadonly();
  readonly isAuthenticated = computed(() => this._currentUser() !== null);

  constructor() {
    this.clearLegacyStorage();
  }

  /** Access token en mémoire (complément au cookie HttpOnly). */
  accessToken(): string | null {
    return this._accessToken();
  }

  register(request: RegisterRequest): Observable<User> {
    return this.authPost<User>(`${this.baseUrl}/register`, request);
  }

  login(request: LoginRequest): Observable<User> {
    return this.authPost<User>(`${this.baseUrl}/login`, request);
  }

  refreshToken(): Observable<User> {
    return this.authPost<User>(`${this.baseUrl}/refresh`, {});
  }

  getCurrentUser(): Observable<User> {
    return this.http
      .get<User>(`${this.baseUrl}/me`, { observe: 'response' })
      .pipe(
        tap((response) => this.captureAccessToken(response)),
        map((response) => response.body as User),
        tap((user) => this._currentUser.set(user)),
      );
  }

  restoreSession(): Observable<void> {
    return this.http.get<User>(`${this.baseUrl}/me`, { observe: 'response' }).pipe(
      tap((response) => {
        this.captureAccessToken(response);
        this._currentUser.set(response.body);
      }),
      map(() => undefined),
      catchError(() => {
        this.clearSession();
        return of(undefined);
      }),
    );
  }

  logout(): void {
    this.http.post<void>(`${this.baseUrl}/logout`, {}).subscribe({
      next: () => this.finalizeLogout(),
      error: () => this.finalizeLogout(),
    });
  }

  clearSession(): void {
    this._currentUser.set(null);
    this._accessToken.set(null);
  }

  isLoggedIn(): boolean {
    return this._currentUser() !== null;
  }

  getRole(): Role | null {
    return this._currentUser()?.role ?? null;
  }

  isAffilieToEquipe(): boolean {
    return this._currentUser()?.isAffilieToEquipe ?? false;
  }

  equipeId(): number | null {
    return this._currentUser()?.equipeId ?? null;
  }

  equipeNom(): string | null {
    return this._currentUser()?.equipeNom ?? null;
  }

  landingRoute(): string {
    switch (this.getRole()) {
      case 'ROLE_ADMIN':
        return '/backoffice/users';
      case 'ROLE_ENSEIGNANT':
        return this.isAffilieToEquipe()
          ? '/frontoffice/sujets/mes-sujets'
          : '/frontoffice/catalogue';
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

  private authPost<T>(url: string, body: unknown): Observable<T> {
    return this.http.post<T>(url, body, { observe: 'response' }).pipe(
      tap((response) => this.captureAccessToken(response)),
      map((response) => response.body as T),
      tap((user) => this._currentUser.set(user as unknown as User)),
    );
  }

  private captureAccessToken(response: HttpResponse<unknown>): void {
    const authHeader = response.headers.get('Authorization');
    if (authHeader?.startsWith('Bearer ')) {
      this._accessToken.set(authHeader.slice('Bearer '.length).trim());
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
