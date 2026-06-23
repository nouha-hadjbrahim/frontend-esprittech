import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '../services/auth.service';

/**
 * Autorise l'accès uniquement si un utilisateur est authentifié (présent en mémoire).
 * La session est restaurée au démarrage via l'APP_INITIALIZER (/auth/me), donc l'état
 * est fiable même après un rechargement de page.
 * Sinon, redirige vers /sign-in en conservant l'URL demandée.
 */
export const authGuard: CanActivateFn = (_route, state) => {
  const authService = inject(AuthService);
  const router = inject(Router);

  if (authService.isAuthenticated()) {
    return true;
  }

  return router.createUrlTree(['/sign-in'], {
    queryParams: { redirect: state.url },
  });
};
