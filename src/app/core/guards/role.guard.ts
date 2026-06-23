import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { Role } from '../models/user.model';
import { AuthService } from '../services/auth.service';
import { TokenService } from '../services/token.service';

/**
 * Garde paramétrable par rôle(s). À utiliser via `roleGuard(['ROLE_ADMIN'])`
 * sur la propriété `canActivate` d'une route.
 *
 * Le rôle est lu depuis le JWT (claim `role`) pour rester fiable même après un
 * rechargement de page.
 * - Token absent/expiré  -> redirection vers /sign-in
 * - Connecté mais rôle non autorisé -> redirection vers sa propre page d'accueil
 */
export function roleGuard(allowedRoles: Role[]): CanActivateFn {
  return () => {
    const tokenService = inject(TokenService);
    const authService = inject(AuthService);
    const router = inject(Router);

    if (tokenService.isTokenExpired()) {
      return router.createUrlTree(['/sign-in']);
    }

    const role = tokenService.decodeToken()?.role;
    if (role && allowedRoles.includes(role)) {
      return true;
    }

    // Authentifié mais non autorisé : on renvoie vers son espace plutôt que /sign-in
    return router.parseUrl(authService.landingRoute());
  };
}
