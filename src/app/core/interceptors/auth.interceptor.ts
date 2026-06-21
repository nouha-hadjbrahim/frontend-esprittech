import {
  HttpErrorResponse,
  HttpEvent,
  HttpHandlerFn,
  HttpInterceptorFn,
  HttpRequest,
} from '@angular/common/http';
import { inject } from '@angular/core';
import {
  BehaviorSubject,
  Observable,
  catchError,
  filter,
  switchMap,
  take,
  throwError,
} from 'rxjs';
import { AuthService } from '../services/auth.service';
import { TokenService } from '../services/token.service';

/** Endpoints publics qui ne doivent jamais porter de Bearer token ni déclencher un refresh. */
const AUTH_PATHS = ['/auth/login', '/auth/register', '/auth/refresh'];

/** Verrou partagé : évite plusieurs refresh concurrents sur des requêtes parallèles. */
let isRefreshing = false;
const refreshedToken$ = new BehaviorSubject<string | null>(null);

/**
 * Interceptor JWT :
 * 1. ajoute `Authorization: Bearer <accessToken>` à chaque requête authentifiée ;
 * 2. sur 401, rafraîchit automatiquement le token puis rejoue la requête ;
 * 3. si le refresh échoue, déconnecte l'utilisateur.
 */
export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const tokenService = inject(TokenService);
  const authService = inject(AuthService);

  const isAuthEndpoint = AUTH_PATHS.some((path) => req.url.includes(path));
  const token = tokenService.getToken();

  const authReq =
    token && !isAuthEndpoint
      ? req.clone({ setHeaders: { Authorization: `Bearer ${token}` } })
      : req;

  return next(authReq).pipe(
    catchError((error: HttpErrorResponse) => {
      if (error.status !== 401 || isAuthEndpoint) {
        return throwError(() => error);
      }
      if (!tokenService.getRefreshToken()) {
        authService.logout();
        return throwError(() => error);
      }
      return handle401(req, next, authService);
    }),
  );
};

/** Gère un 401 : refresh (ou attente d'un refresh en cours) puis rejeu de la requête. */
function handle401(
  req: HttpRequest<unknown>,
  next: HttpHandlerFn,
  authService: AuthService,
): Observable<HttpEvent<unknown>> {
  if (isRefreshing) {
    return refreshedToken$.pipe(
      filter((newToken): newToken is string => newToken !== null),
      take(1),
      switchMap((newToken) => next(withBearer(req, newToken))),
    );
  }

  isRefreshing = true;
  refreshedToken$.next(null);

  return authService.refreshToken().pipe(
    switchMap((res) => {
      isRefreshing = false;
      refreshedToken$.next(res.accessToken);
      return next(withBearer(req, res.accessToken));
    }),
    catchError((err) => {
      isRefreshing = false;
      authService.logout();
      return throwError(() => err);
    }),
  );
}

function withBearer(req: HttpRequest<unknown>, token: string): HttpRequest<unknown> {
  return req.clone({ setHeaders: { Authorization: `Bearer ${token}` } });
}
