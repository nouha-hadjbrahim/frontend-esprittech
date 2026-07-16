import {
  HttpErrorResponse,
  HttpEvent,
  HttpHandlerFn,
  HttpInterceptorFn,
  HttpRequest,
} from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { Observable, ReplaySubject, catchError, finalize, switchMap, take, throwError } from 'rxjs';
import { AuthService } from '../services/auth.service';

/** Endpoints publics qui ne doivent jamais déclencher un refresh automatique. */
const AUTH_PATHS = ['/auth/login', '/auth/register', '/auth/refresh', '/auth/logout'];

let isRefreshing = false;
const refreshResult$ = new ReplaySubject<boolean>(1);

/**
 * Ajoute credentials + Bearer token (mémoire) sur chaque requête API.
 * Sur 401, tente un refresh puis rejoue la requête avec le nouveau token.
 */
export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const authService = inject(AuthService);
  const router = inject(Router);

  const authReq = withAuthHeaders(req, authService);
  const isAuthEndpoint = AUTH_PATHS.some((path) => req.url.includes(path));

  return next(authReq).pipe(
    catchError((error: HttpErrorResponse) => {
      if (error.status !== 401 || isAuthEndpoint || !authService.isLoggedIn()) {
        return throwError(() => error);
      }
      return handle401(authReq, next, authService, router, error);
    }),
  );
};

function withAuthHeaders(req: HttpRequest<unknown>, authService: AuthService): HttpRequest<unknown> {
  let headers = req.headers;
  const token = authService.accessToken();
  if (token) {
    headers = headers.set('Authorization', `Bearer ${token}`);
  }
  return req.clone({ headers, withCredentials: true });
}

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
      switchMap((ok) =>
        ok ? next(withAuthHeaders(req, authService)) : throwError(() => originalError),
      ),
    );
  }

  isRefreshing = true;

  return authService.refreshToken().pipe(
    switchMap(() => {
      refreshResult$.next(true);
      return next(withAuthHeaders(req, authService));
    }),
    catchError((refreshError) => {
      refreshResult$.next(false);
      authService.clearSession();
      void router.navigate(['/sign-in']);
      return throwError(() => originalError ?? refreshError);
    }),
    finalize(() => {
      isRefreshing = false;
    }),
  );
}
