import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '../services/auth.service';

/**
 * Autorise l'accès uniquement aux enseignants affiliés à une équipe de recherche.
 * Sinon, redirection vers les sujets disponibles.
 */
export const equipeAffiliationGuard: CanActivateFn = () => {
  const authService = inject(AuthService);
  const router = inject(Router);

  if (authService.isAffilieToEquipe()) {
    return true;
  }

  return router.parseUrl('/frontoffice/sujets/disponibles');
};
