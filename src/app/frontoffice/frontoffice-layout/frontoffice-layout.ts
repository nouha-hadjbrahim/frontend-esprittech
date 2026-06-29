import { CommonModule } from '@angular/common';
import { Component, computed, inject, signal } from '@angular/core';
import { RouterModule } from '@angular/router';
import { Role } from '../../core/models/user.model';
import { AuthService } from '../../core/services/auth.service';

type NavIcon = 'layers' | 'document';

interface NavLink {
  label: string;
  path: string;
  icon?: NavIcon;
  children?: NavLink[];
}

@Component({
  selector: 'app-frontoffice-layout',
  imports: [CommonModule, RouterModule],
  templateUrl: './frontoffice-layout.html',
  styleUrl: './frontoffice-layout.css'
})
export class FrontofficeLayout {
  private readonly authService = inject(AuthService);

  /** Utilisateur authentifié (signal partagé depuis AuthService). */
  readonly user = this.authService.currentUser;
  isProfileDropdownOpen = signal<boolean>(false);

  private static readonly ROLE_LABELS: Record<Role, string> = {
    ROLE_ADMIN: 'Administrateur',
    ROLE_ENSEIGNANT: 'Enseignant',
    ROLE_CHEF_EQUIPE: "Chef d'équipe",
    ROLE_ETUDIANT: 'Étudiant',
    ROLE_CI: 'Comité industriel',
  };

  readonly roleLabel = computed(() => {
    const role = this.user()?.role;
    return role ? FrontofficeLayout.ROLE_LABELS[role] : '';
  });

  readonly initials = computed(() => {
    const u = this.user();
    return u ? `${u.prenom.charAt(0)}${u.nom.charAt(0)}`.toUpperCase() : 'U';
  });

  // Routes disponibles
  private readonly allLinks = {
    tableauDeBord: { label: 'Tableau de bord', path: '/frontoffice/tableau-de-bord' },
    catalogueSimple: { label: 'Catalogue', path: '/frontoffice/catalogue' },
    sujets: {
      label: 'Sujets',
      path: '/frontoffice/sujets/mes-sujets',
      children: [
        { label: 'Sujets disponibles', path: '/frontoffice/sujets/disponibles', icon: 'layers' as NavIcon },
        { label: 'Mes sujets', path: '/frontoffice/sujets/mes-sujets', icon: 'document' as NavIcon }
      ]
    },
    sujetsDisponibles: { label: 'Sujets disponibles', path: '/frontoffice/sujets/disponibles' },
    equipesRechercheEnseignant: {
      label: 'Équipes de recherche',
      path: '/frontoffice/equipes-recherche/equipes',
      children: [
        { label: 'Équipes', path: '/frontoffice/equipes-recherche/equipes' },
        { label: 'Mes demandes', path: '/frontoffice/equipes-recherche/mes-demandes' },
      ]
    },
    equipesRechercheChef: {
      label: 'Équipes de recherche',
      path: '/frontoffice/equipes-recherche/mon-equipe',
      children: [
        { label: 'Mon équipe', path: '/frontoffice/equipes-recherche/mon-equipe' },
        { label: 'Demandes d\'affiliation', path: '/frontoffice/equipes-recherche/demandes' },
        { label: 'Toutes les équipes', path: '/frontoffice/equipes-recherche/toutes-les-equipes' },
      ]
    },
    mesCandidatures: { label: 'Mes candidatures', path: '/frontoffice/mes-candidatures' },
    validationSujets: { label: 'Validation des sujets', path: '/frontoffice/validation-sujets' },
    demandesIndustrialisation: { label: 'Demandes d\'industrialisation', path: '/frontoffice/demandes-industrialisation' },
    espaceCiIndustrialisation: { label: 'Demandes d\'industrialisation', path: '/ci/industrialisation' },
  };

  /**
   * Nœud « Catalogue » de l'enseignant : « Mes projets » n'apparaît que si
   * l'enseignant est affilié (affiliation acceptée à une équipe de recherche).
   */
  private catalogueEnseignant(): NavLink {
    const children: NavLink[] = [{ label: 'Catalogue', path: '/frontoffice/catalogue' }];
    if (this.authService.isAffilieToEquipe()) {
      children.push({ label: 'Mes projets', path: '/frontoffice/mes-projets' });
    }
    return { label: 'Catalogue', path: '/frontoffice/catalogue', children };
  }

  /** Nœud « Catalogue » du chef d'équipe : « Validation projets » placé juste sous « Catalogue ». */
  private catalogueChef(): NavLink {
    return {
      label: 'Catalogue',
      path: '/frontoffice/catalogue',
      children: [
        { label: 'Catalogue', path: '/frontoffice/catalogue' },
        { label: 'Validation projets', path: '/frontoffice/validation-projets' }
      ]
    };
  }

  // Navigation calculée à partir du rôle réel de l'utilisateur connecté
  readonly navLinks = computed<NavLink[]>(() => {
    switch (this.user()?.role) {
      case 'ROLE_ENSEIGNANT':
        return [
          this.catalogueEnseignant(),
          this.allLinks.sujets,
          this.allLinks.demandesIndustrialisation,
          this.allLinks.equipesRechercheEnseignant
        ];
      case 'ROLE_ETUDIANT':
        return [
          this.allLinks.sujetsDisponibles,
          this.allLinks.mesCandidatures
        ];
      case 'ROLE_CHEF_EQUIPE':
        return [
          this.allLinks.tableauDeBord,
          this.catalogueChef(),
          this.allLinks.validationSujets,
          this.allLinks.demandesIndustrialisation,
          this.allLinks.equipesRechercheChef,
          this.allLinks.sujetsDisponibles
        ];
      case 'ROLE_CI':
        return [
          this.allLinks.tableauDeBord,
          this.allLinks.espaceCiIndustrialisation,
          this.allLinks.catalogueSimple,
          this.allLinks.sujetsDisponibles
        ];
      default:
        return [];
    }
  });

  toggleProfileDropdown() {
    this.isProfileDropdownOpen.update((val) => !val);
  }

  logout() {
    this.authService.logout();
  }
}