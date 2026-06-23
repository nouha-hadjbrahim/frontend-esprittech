import {
  HttpErrorResponse,
  HttpEvent,
  HttpHandlerFn,
  HttpInterceptorFn,
  HttpRequest,
} from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { Observable, Subject, catchError, switchMap, take, throwError } from 'rxjs';
import { AuthService } from '../services/auth.service';

/** Endpoints publics qui ne doivent jamais déclencher un refresh automatique. */
const AUTH_PATHS = ['/auth/login', '/auth/register', '/auth/refresh', '/auth/logout'];

/** Verrou partagé : évite plusieurs refresh concurrents sur des requêtes parallèles. */
let isRefreshing = false;
/** Diffuse le résultat du refresh en cours aux requêtes en attente (true = réessayer). */
const refreshResult$ = new Subject<boolean>();

/**
 * Interceptor JWT basé sur les cookies HttpOnly :
 * 1. ajoute `withCredentials: true` pour que le navigateur envoie les cookies d'auth ;
 * 2. sur 401, tente un refresh (cookie refresh_token) puis rejoue la requête ;
 * 3. si le refresh échoue, déconnecte l'utilisateur et redirige vers /sign-in.
 *
 * Aucun token n'est lu ni écrit côté JavaScript : tout passe par les cookies.
 */
export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const authService = inject(AuthService);
  const router = inject(Router);

  const authReq = req.clone({ withCredentials: true });
  const isAuthEndpoint = AUTH_PATHS.some((path) => req.url.includes(path));

  return next(authReq).pipe(
    catchError((error: HttpErrorResponse) => {
      if (error.status !== 401 || isAuthEndpoint) {
        return throwError(() => error);
      }
      return handle401(authReq, next, authService, router, error);
    }),
  );
};

/** Gère un 401 : refresh (ou attente d'un refresh en cours) puis rejeu de la requête. */
function handle401(
  req: HttpRequest<unknown>,
  next: HttpHandlerFn,
  authService: AuthService,
  router: Router,
  originalError: HttpErrorResponse,
): Observable<HttpEvent<unknown>> {
  if (isRefreshing) {
    return refreshResult$.pipe(
      take(1),
      switchMap((ok) => (ok ? next(req) : throwError(() => originalError))),
    );
  }

  isRefreshing = true;

  return authService.refreshToken().pipe(
    switchMap(() => {
      isRefreshing = false;
      refreshResult$.next(true);
      return next(req);
    }),
    catchError((refreshError) => {
      isRefreshing = false;
      refreshResult$.next(false);
      authService.clearSession();
      void router.navigate(['/sign-in']);
      return throwError(() => originalError ?? refreshError);
    }),
  );
}
