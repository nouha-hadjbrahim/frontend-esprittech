import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { TokenService } from '../services/token.service';

/**
 * Autorise l'accès uniquement si un access token valide (non expiré) est présent.
 * Sinon, redirige vers /sign-in en conservant l'URL demandée.
 */
export const authGuard: CanActivateFn = (_route, state) => {
  const tokenService = inject(TokenService);
  const router = inject(Router);

  if (!tokenService.isTokenExpired()) {
    return true;
  }

  return router.createUrlTree(['/sign-in'], {
    queryParams: { redirect: state.url },
  });
};
