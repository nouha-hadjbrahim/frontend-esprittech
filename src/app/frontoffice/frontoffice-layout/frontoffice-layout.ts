import { CommonModule } from '@angular/common';
import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { NavigationEnd, Router, RouterModule } from '@angular/router';
import { filter, map, startWith } from 'rxjs';
import { Role } from '../../core/models/user.model';
import { Notification } from '../../core/models/notification.model';
import { AuthService } from '../../core/services/auth.service';
import { AffiliationService } from '../../core/services/affiliation.service';
import { EquipeService } from '../../core/services/equipe.service';
import { NotificationService } from '../../core/services/notification.service';
import { NotificationBellComponent } from '../../shared/components/notification-bell/notification-bell.component';

type NavIcon =
  | 'layers'
  | 'document'
  | 'validation'
  | 'catalogue'
  | 'projects'
  | 'team'
  | 'requests'
  | 'teams';

interface NavLink {
  label: string;
  path: string;
  icon?: NavIcon;
  children?: NavLink[];
}

const SUJET_TITLE_REGEX = /sujet\s+"([^"]+)"/i;
const ACCEPTANCE_ROLES: Role[] = ['ROLE_ENSEIGNANT', 'ROLE_CHEF_EQUIPE'];

@Component({
  selector: 'app-frontoffice-layout',
  imports: [CommonModule, RouterModule, NotificationBellComponent],
  templateUrl: './frontoffice-layout.html',
  styleUrl: './frontoffice-layout.css'
})
export class FrontofficeLayout implements OnInit {
  private readonly authService = inject(AuthService);
  private readonly affiliationSvc = inject(AffiliationService);
  private readonly equipeSvc = inject(EquipeService);
  private readonly notificationService = inject(NotificationService);
  private readonly router = inject(Router);

  /** Utilisateur authentifié (signal partagé depuis AuthService). */
  readonly user = this.authService.currentUser;
  isProfileDropdownOpen = signal<boolean>(false);

  readonly pendingDemandesCount = signal(0);

  /** Popup « sujets acceptés » affiché à la connexion. */
  readonly showSujetAcceptedPopup = signal(false);
  readonly acceptedSujetTitles = signal<string[]>([]);
  private acceptedNotificationIds: number[] = [];
  private acceptancePopupChecked = false;

  /** URL courante pour rafraîchir le style actif de la navbar. */
  private readonly currentUrl = toSignal(
    this.router.events.pipe(
      filter((e): e is NavigationEnd => e instanceof NavigationEnd),
      map(() => this.router.url),
      startWith(this.router.url)
    ),
    { initialValue: this.router.url }
  );

  /** Active un item (lien simple ou parent avec sous-menus) comme Accueil. */
  isNavActive(link: NavLink): boolean {
    const url = (this.currentUrl() || '').split('?')[0];
    const paths = [
      link.path,
      ...(link.children?.map((c) => c.path) ?? []),
    ].filter((p): p is string => !!p);

    const matchesPath = (path: string): boolean => {
      if (path === '/frontoffice/accueil') {
        return url === path;
      }
      return url === path || url.startsWith(`${path}/`);
    };

    if (paths.some(matchesPath)) {
      return true;
    }

    // Couvre les pages filles (ex. /frontoffice/sujets/:id)
    if (link.children?.length) {
      const prefixes = new Set(
        link.children.map((child) => {
          const parts = child.path.split('/').filter(Boolean);
          return parts.length >= 2 ? `/${parts.slice(0, 2).join('/')}` : child.path;
        })
      );
      return [...prefixes].some((prefix) => url === prefix || url.startsWith(`${prefix}/`));
    }

    return false;
  }

  ngOnInit(): void {
    this.loadPendingCount();
    this.notificationService.initialize();
    this.checkSujetAcceptedPopup();
  }

  private checkSujetAcceptedPopup(): void {
    if (this.acceptancePopupChecked) return;
    const role = this.authService.getRole();
    if (!role || !ACCEPTANCE_ROLES.includes(role)) return;

    this.acceptancePopupChecked = true;
    this.notificationService.fetchUnreadByType('SUJET_VALIDE').subscribe({
      next: (notifications) => this.openAcceptancePopup(notifications),
      error: () => undefined,
    });
  }

  /** Expose pour les tests unitaires. */
  openAcceptancePopup(notifications: Notification[]): void {
    if (!notifications.length) return;

    this.acceptedNotificationIds = notifications.map((n) => n.id);
    const titles = notifications
      .map((n) => this.extractSujetTitle(n.message))
      .filter((title): title is string => !!title);
    this.acceptedSujetTitles.set(titles.length ? titles : notifications.map((n) => n.title));
    this.showSujetAcceptedPopup.set(true);
  }

  extractSujetTitle(message: string | null | undefined): string | null {
    if (!message) return null;
    const match = message.match(SUJET_TITLE_REGEX);
    return match?.[1]?.trim() || null;
  }

  get acceptanceHeadline(): string {
    const count = this.acceptedSujetTitles().length || this.acceptedNotificationIds.length;
    return count > 1
      ? `${count} sujets ont été acceptés`
      : 'Votre sujet a été accepté';
  }

  dismissSujetAcceptedPopup(navigateToMesSujets = false): void {
    this.showSujetAcceptedPopup.set(false);
    if (this.acceptedNotificationIds.length) {
      this.notificationService.marquerPlusieursCommeLu(this.acceptedNotificationIds);
      this.acceptedNotificationIds = [];
    }
    if (navigateToMesSujets) {
      void this.router.navigateByUrl('/frontoffice/sujets/mes-sujets');
    }
  }

  private loadPendingCount(): void {
    const role = this.authService.getRole();
    if (role !== 'ROLE_CHEF_EQUIPE') return;

    this.equipeSvc.getAll().subscribe({
      next: (equipes) => {
        const user = this.user();
        if (!user) return;
        const myTeam = equipes.find((e) => e.chef?.id === user.id);
        if (!myTeam) return;
        this.affiliationSvc.getByEquipe(myTeam.id).subscribe({
          next: (affs) => this.pendingDemandesCount.set(affs.filter((r) => r.statut === 'EN_ATTENTE').length),
        });
      },
    });
  }

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
    accueil: { label: 'Accueil', path: '/frontoffice/accueil' },
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
        { label: 'Équipes', path: '/frontoffice/equipes-recherche/equipes', icon: 'team' as NavIcon },
        { label: 'Mes demandes', path: '/frontoffice/equipes-recherche/mes-demandes', icon: 'requests' as NavIcon },
      ]
    },
    equipesRechercheChef: {
      label: 'Équipes de recherche',
      path: '/frontoffice/equipes-recherche/mon-equipe',
      children: [
        { label: 'Mon équipe', path: '/frontoffice/equipes-recherche/mon-equipe', icon: 'team' as NavIcon },
        { label: 'Demandes d\'affiliation', path: '/frontoffice/equipes-recherche/demandes', icon: 'requests' as NavIcon },
        { label: 'Toutes les équipes', path: '/frontoffice/equipes-recherche/toutes-les-equipes', icon: 'teams' as NavIcon },
      ]
    },
    mesCandidatures: { label: 'Mes candidatures', path: '/frontoffice/mes-candidatures' },
    validationSujets: { label: 'Validation des sujets', path: '/frontoffice/validation-sujets' },
    demandesIndustrialisation: { label: 'Demandes d\'industrialisation', path: '/frontoffice/demandes-industrialisation' },
    espaceCiIndustrialisation: { label: 'Demandes d\'industrialisation', path: '/ci/industrialisation' },
  };

  /** Nœud « Sujets » du chef d'équipe : catalogue, sujets équipe et validation. */
  private sujetsChef(): NavLink {
    return {
      label: 'Sujets',
      path: '/frontoffice/validation-sujets',
      children: [
        { label: 'Sujets disponibles', path: '/frontoffice/sujets/disponibles', icon: 'layers' as NavIcon },
        { label: 'Mes sujets', path: '/frontoffice/sujets/mes-sujets', icon: 'document' as NavIcon },
        { label: 'Validation des sujets', path: '/frontoffice/validation-sujets', icon: 'validation' as NavIcon },
      ],
    };
  }

  /**
   * Nœud « Sujets » de l'enseignant : « Mes sujets » n'apparaît que si
   * l'enseignant est affilié à une équipe de recherche.
   */
  private sujetsEnseignant(): NavLink {
    const children: NavLink[] = [
      { label: 'Sujets disponibles', path: '/frontoffice/sujets/disponibles', icon: 'layers' as NavIcon },
    ];
    if (this.authService.isAffilieToEquipe()) {
      children.push({ label: 'Mes sujets', path: '/frontoffice/sujets/mes-sujets', icon: 'document' as NavIcon });
    }
    return {
      label: 'Sujets',
      path: this.authService.isAffilieToEquipe()
        ? '/frontoffice/sujets/mes-sujets'
        : '/frontoffice/sujets/disponibles',
      children,
    };
  }

  /**
   * Nœud « Catalogue » de l'enseignant : « Mes projets » n'apparaît que si
   * l'enseignant est affilié (affiliation acceptée à une équipe de recherche).
   */
  private catalogueEnseignant(): NavLink {
    const children: NavLink[] = [
      { label: 'Catalogue', path: '/frontoffice/catalogue', icon: 'catalogue' },
    ];
    if (this.authService.isAffilieToEquipe()) {
      children.push({ label: 'Mes projets', path: '/frontoffice/mes-projets', icon: 'projects' });
    }
    return { label: 'Catalogue', path: '/frontoffice/catalogue', children };
  }

  /** Nœud « Catalogue » du chef d'équipe : « Validation projets » placé juste sous « Catalogue ». */
  private catalogueChef(): NavLink {
    return {
      label: 'Catalogue',
      path: '/frontoffice/catalogue',
      children: [
        { label: 'Catalogue', path: '/frontoffice/catalogue', icon: 'catalogue' },
        { label: 'Validation projets', path: '/frontoffice/validation-projets', icon: 'validation' },
      ]
    };
  }

  // Navigation calculée à partir du rôle réel de l'utilisateur connecté
  readonly navLinks = computed<NavLink[]>(() => {
    switch (this.user()?.role) {
      case 'ROLE_ENSEIGNANT':
        return [
          this.allLinks.accueil,
          this.catalogueEnseignant(),
          this.sujetsEnseignant(),
          this.allLinks.demandesIndustrialisation,
          this.allLinks.equipesRechercheEnseignant
        ];
      case 'ROLE_ETUDIANT':
        return [
          this.allLinks.accueil,
          this.allLinks.sujetsDisponibles,
          this.allLinks.mesCandidatures
        ];
      case 'ROLE_CHEF_EQUIPE':
        return [
          this.allLinks.accueil,
          this.catalogueChef(),
          this.sujetsChef(),
          this.allLinks.demandesIndustrialisation,
          this.allLinks.equipesRechercheChef,
        ];
      case 'ROLE_CI':
        return [
          this.allLinks.accueil,
          this.allLinks.espaceCiIndustrialisation,
          this.allLinks.catalogueSimple,
          this.allLinks.sujetsDisponibles
        ];
      default:
        return [this.allLinks.accueil];
    }
  });

  toggleProfileDropdown() {
    this.isProfileDropdownOpen.update((val) => !val);
  }

  logout() {
    this.authService.logout();
  }
}
