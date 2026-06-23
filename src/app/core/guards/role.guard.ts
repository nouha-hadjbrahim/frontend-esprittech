import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { Role } from '../models/user.model';
import { AuthService } from '../services/auth.service';

/**
 * Garde paramétrable par rôle(s). À utiliser via `roleGuard(['ROLE_ADMIN'])`
 * sur la propriété `canActivate` d'une route.
 *
 * Le rôle est lu sur l'utilisateur courant en mémoire (peuplé via /auth/me, restauré
 * au démarrage par l'APP_INITIALIZER), et non plus décodé d'un JWT côté client.
 * - Non authentifié -> redirection vers /sign-in
 * - Connecté mais rôle non autorisé -> redirection vers sa propre page d'accueil
 */
export function roleGuard(allowedRoles: Role[]): CanActivateFn {
  return () => {
    const authService = inject(AuthService);
    const router = inject(Router);

    const role = authService.getRole();
    if (!role) {
      return router.createUrlTree(['/sign-in']);
    }
    if (allowedRoles.includes(role)) {
      return true;
    }

    // Authentifié mais non autorisé : on renvoie vers son espace plutôt que /sign-in
    return router.parseUrl(authService.landingRoute());
  };
}
