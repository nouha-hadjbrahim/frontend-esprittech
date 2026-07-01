import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '../services/auth.service';

/**
 * Autorise les chefs d'équipe et les enseignants affiliés à une équipe de recherche.
 */
export const mesSujetsGuard: CanActivateFn = () => {
  const authService = inject(AuthService);
  const router = inject(Router);

  if (authService.getRole() === 'ROLE_CHEF_EQUIPE') {
    return true;
  }

  if (authService.getRole() === 'ROLE_ENSEIGNANT' && authService.isAffilieToEquipe()) {
    return true;
  }

  return router.parseUrl('/frontoffice/sujets/disponibles');
};
