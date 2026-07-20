import { WritableSignal, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter, Router, NavigationEnd } from '@angular/router';
import { Subject, of, throwError } from 'rxjs';
import { Role, User } from '../../core/models/user.model';
import { AffiliationEnseignantResponse } from '../../core/models/affiliation-request.model';
import { AffiliationService } from '../../core/services/affiliation.service';
import { AuthService } from '../../core/services/auth.service';
import { NotificationService } from '../../core/services/notification.service';
import { BackofficeLayoutComponent } from './backoffice-layout.component';

function userWith(role: Role, overrides?: Partial<User>): User {
  return {
    id: 1, nom: 'Dupont', prenom: 'Jean', email: 'j@esprit.tn',
    role, typeUtilisateur: 'ENSEIGNANT', departement: null, enabled: true, createdAt: null,
    isAffilieToEquipe: false, equipeId: null, equipeNom: null,
    ...overrides,
  };
}

function fakeAffiliation(statut: string): AffiliationEnseignantResponse {
  return {
    id: 1, enseignant: { id: 2, nom: 'Test', prenom: 'User', email: 'u@test.tn', role: 'ENSEIGNANT', typeUtilisateur: 'ENSEIGNANT', departement: null, enabled: true, createdAt: null, isAffilieToEquipe: false, equipeId: null, equipeNom: null } as any,
    equipeId: 1, equipeNom: 'Equipe',
    statut: statut as any, dateDemande: '', dateDecision: null, motifDecision: null,
  };
}

describe('BackofficeLayoutComponent', () => {
  let component: BackofficeLayoutComponent;
  let currentUser: WritableSignal<User | null>;
  let logout: jasmine.Spy;
  let affiliationService: jasmine.SpyObj<AffiliationService>;
  let notificationService: jasmine.SpyObj<NotificationService>;
  let routerEvents$: Subject<NavigationEnd>;

  beforeEach(() => {
    currentUser = signal<User | null>(null);
    logout = jasmine.createSpy('logout');
    affiliationService = jasmine.createSpyObj<AffiliationService>('AffiliationService', ['getAll']);
    affiliationService.getAll.and.returnValue(of([]));
    notificationService = jasmine.createSpyObj<NotificationService>(
      'NotificationService',
      ['initialize', 'marquerCommeLu', 'marquerToutCommeLu', 'loadMore'],
      {
        notifications: signal([]),
        unreadCount: signal(0),
        loading: signal(false),
        hasMore: signal(false),
      },
    );
    routerEvents$ = new Subject<NavigationEnd>();
    TestBed.configureTestingModule({
      imports: [BackofficeLayoutComponent],
      providers: [
        provideRouter([]),
        { provide: AuthService, useValue: { currentUser, logout } },
        { provide: AffiliationService, useValue: affiliationService },
        { provide: NotificationService, useValue: notificationService },
      ],
    });
    component = TestBed.createComponent(BackofficeLayoutComponent).componentInstance;
  });

  it('should create with the full navigation', () => {
    expect(component).toBeTruthy();
    expect(component.navItems.length).toBe(7);
  });

  it('should group evaluation links under the evaluations parent menu', () => {
    const evaluations = component.navItems.find((item) => item.label === 'Évaluations');

    expect(evaluations).toBeTruthy();
    expect(evaluations?.children?.map((child) => child.route)).toEqual([
      '/backoffice/admin/evaluations',
      '/backoffice/criteres',
      '/backoffice/admin/industrialisation/questions',
      '/backoffice/admin/livrables',
    ]);
    expect(component.navItems.some((item) => item.route === '/backoffice/admin/evaluations')).toBeFalse();
    expect(component.navItems.some((item) => item.route === '/backoffice/criteres')).toBeFalse();
    expect(component.navItems.some((item) => item.route === '/backoffice/admin/industrialisation/questions')).toBeFalse();
    expect(component.navItems.some((item) => item.route === '/backoffice/admin/livrables')).toBeFalse();
  });

  it('should expand Évaluations when a child route is active', () => {
    const router = TestBed.inject(Router);
    spyOnProperty(router, 'url', 'get').and.returnValue('/backoffice/criteres');

    component['expandActiveGroups']();

    expect(component.isNavGroupExpanded({ label: 'Évaluations', icon: 'clipboard-check', children: [] })).toBeTrue();
    expect(component.isNavGroupActive({
      label: 'Évaluations',
      icon: 'clipboard-check',
      children: [
        { label: 'Critères', route: '/backoffice/criteres' },
      ],
    })).toBeTrue();
  });

  it('should fall back to "AD" initials and empty role label without a user', () => {
    expect(component.initials()).toBe('AD');
    expect(component.roleLabel()).toBe('');
  });

  it('should compute initials and role label from the user', () => {
    currentUser.set(userWith('ROLE_ADMIN'));
    expect(component.initials()).toBe('JD');
    expect(component.roleLabel()).toBe('Super-administrateur');
  });

  it('should return correct role label for each role', () => {
    currentUser.set(userWith('ROLE_ENSEIGNANT'));
    expect(component.roleLabel()).toBe('Enseignant');
    currentUser.set(userWith('ROLE_CHEF_EQUIPE'));
    expect(component.roleLabel()).toBe("Chef d'équipe");
    currentUser.set(userWith('ROLE_ETUDIANT'));
    expect(component.roleLabel()).toBe('Étudiant');
    currentUser.set(userWith('ROLE_CI'));
    expect(component.roleLabel()).toBe('Comité industriel');
  });

  it('should toggle the profile menu', () => {
    expect(component.isProfileOpen).toBeFalse();
    component.toggleProfileMenu();
    expect(component.isProfileOpen).toBeTrue();
    component.toggleProfileMenu();
    expect(component.isProfileOpen).toBeFalse();
  });

  it('should delegate logout to the auth service', () => {
    component.logout();
    expect(logout).toHaveBeenCalled();
  });

  // --- isChildActive ---

  describe('isChildActive', () => {
    let router: Router;

    beforeEach(() => {
      router = TestBed.inject(Router);
    });

    it('should match /backoffice/subjects exactly', () => {
      spyOnProperty(router, 'url', 'get').and.returnValue('/backoffice/subjects');
      expect(component.isChildActive('/backoffice/subjects')).toBeTrue();
    });

    it('should not match /backoffice/subjects with sub-path for the exact-match branch', () => {
      spyOnProperty(router, 'url', 'get').and.returnValue('/backoffice/subjects/123');
      expect(component.isChildActive('/backoffice/subjects')).toBeFalse();
    });

    it('should match /backoffice/subjects/formulaires with startsWith', () => {
      spyOnProperty(router, 'url', 'get').and.returnValue('/backoffice/subjects/formulaires');
      expect(component.isChildActive('/backoffice/subjects/formulaires')).toBeTrue();
    });

    it('should match /backoffice/subjects/formulaires with nested path', () => {
      spyOnProperty(router, 'url', 'get').and.returnValue('/backoffice/subjects/formulaires/5');
      expect(component.isChildActive('/backoffice/subjects/formulaires')).toBeTrue();
    });

    it('should match /backoffice/equipes-recherche exactly', () => {
      spyOnProperty(router, 'url', 'get').and.returnValue('/backoffice/equipes-recherche');
      expect(component.isChildActive('/backoffice/equipes-recherche')).toBeTrue();
    });

    it('should not match /backoffice/equipes-recherche with sub-path for the exact-match branch', () => {
      spyOnProperty(router, 'url', 'get').and.returnValue('/backoffice/equipes-recherche/domaines');
      expect(component.isChildActive('/backoffice/equipes-recherche')).toBeFalse();
    });

    it('should match /backoffice/equipes-recherche/domaines with startsWith', () => {
      spyOnProperty(router, 'url', 'get').and.returnValue('/backoffice/equipes-recherche/domaines');
      expect(component.isChildActive('/backoffice/equipes-recherche/domaines')).toBeTrue();
    });

    it('should match /backoffice/equipes-recherche/domaines with nested path', () => {
      spyOnProperty(router, 'url', 'get').and.returnValue('/backoffice/equipes-recherche/domaines/3');
      expect(component.isChildActive('/backoffice/equipes-recherche/domaines')).toBeTrue();
    });

    it('should match /backoffice/equipes-recherche/demandes with startsWith', () => {
      spyOnProperty(router, 'url', 'get').and.returnValue('/backoffice/equipes-recherche/demandes');
      expect(component.isChildActive('/backoffice/equipes-recherche/demandes')).toBeTrue();
    });

    it('should match /backoffice/equipes-recherche/demandes with nested path', () => {
      spyOnProperty(router, 'url', 'get').and.returnValue('/backoffice/equipes-recherche/demandes/7');
      expect(component.isChildActive('/backoffice/equipes-recherche/demandes')).toBeTrue();
    });

    it('should use fallback exact/startsWith for arbitrary routes', () => {
      spyOnProperty(router, 'url', 'get').and.returnValue('/backoffice/criteres');
      expect(component.isChildActive('/backoffice/criteres')).toBeTrue();
    });

    it('should use fallback startsWith for routes with sub-paths', () => {
      spyOnProperty(router, 'url', 'get').and.returnValue('/backoffice/admin/evaluations/2');
      expect(component.isChildActive('/backoffice/admin/evaluations')).toBeTrue();
    });

    it('should strip query params before matching', () => {
      spyOnProperty(router, 'url', 'get').and.returnValue('/backoffice/subjects?tab=2');
      expect(component.isChildActive('/backoffice/subjects')).toBeTrue();
    });

    it('should not match different routes in fallback', () => {
      spyOnProperty(router, 'url', 'get').and.returnValue('/backoffice/dashboard');
      expect(component.isChildActive('/backoffice/criteres')).toBeFalse();
    });
  });

  // --- isNavGroupActive ---

  describe('isNavGroupActive', () => {
    let router: Router;

    beforeEach(() => {
      router = TestBed.inject(Router);
    });

    it('should return true when a child route matches', () => {
      spyOnProperty(router, 'url', 'get').and.returnValue('/backoffice/subjects');
      const item = {
        label: 'Sujets', icon: 'clipboard',
        children: [
          { label: 'Sujets', route: '/backoffice/subjects' },
          { label: 'Formulaires', route: '/backoffice/subjects/formulaires' },
        ],
      };
      expect(component.isNavGroupActive(item)).toBeTrue();
    });

    it('should return true via groupBaseRoutes when no child matches but URL starts with base', () => {
      spyOnProperty(router, 'url', 'get').and.returnValue('/backoffice/subjects/something');
      const item = {
        label: 'Sujets', icon: 'clipboard',
        children: [
          { label: 'Sujets', route: '/backoffice/subjects' },
          { label: 'Formulaires', route: '/backoffice/subjects/formulaires' },
        ],
      };
      expect(component.isNavGroupActive(item)).toBeTrue();
    });

    it('should return false when no child matches and no baseRoute', () => {
      spyOnProperty(router, 'url', 'get').and.returnValue('/backoffice/other');
      const item = {
        label: 'Unknown Group', icon: 'x',
        children: [{ label: 'Child', route: '/backoffice/nonexistent' }],
      };
      expect(component.isNavGroupActive(item)).toBeFalse();
    });

    it('should return false when there are no children and baseRoute does not match', () => {
      spyOnProperty(router, 'url', 'get').and.returnValue('/backoffice/dashboard');
      const item = { label: 'Sujets', icon: 'clipboard', children: [] };
      expect(component.isNavGroupActive(item)).toBeFalse();
    });

    it('should match Équipes de recherche base route', () => {
      spyOnProperty(router, 'url', 'get').and.returnValue('/backoffice/equipes-recherche/some-page');
      const item = {
        label: 'Équipes de recherche', icon: 'users',
        children: [
          { label: 'Équipes', route: '/backoffice/equipes-recherche' },
        ],
      };
      expect(component.isNavGroupActive(item)).toBeTrue();
    });

    it('should match Évaluations base route', () => {
      spyOnProperty(router, 'url', 'get').and.returnValue('/backoffice/admin/evaluations/10');
      const item = {
        label: 'Évaluations', icon: 'clipboard-check',
        children: [
          { label: 'Évaluations', route: '/backoffice/admin/evaluations' },
        ],
      };
      expect(component.isNavGroupActive(item)).toBeTrue();
    });
  });

  // --- isNavItemActive ---

  describe('isNavItemActive', () => {
    let router: Router;

    beforeEach(() => {
      router = TestBed.inject(Router);
    });

    it('should delegate to isNavGroupActive for items with children', () => {
      spyOnProperty(router, 'url', 'get').and.returnValue('/backoffice/subjects');
      const item = {
        label: 'Sujets', icon: 'clipboard',
        children: [{ label: 'Sujets', route: '/backoffice/subjects' }],
      };
      expect(component.isNavItemActive(item)).toBeTrue();
    });

    it('should use startsWith for items with direct route', () => {
      spyOnProperty(router, 'url', 'get').and.returnValue('/backoffice/dashboard');
      const item = { label: 'Tableau de bord', icon: 'grid', route: '/backoffice/dashboard' };
      expect(component.isNavItemActive(item)).toBeTrue();
    });

    it('should use startsWith for items with direct route and sub-path', () => {
      spyOnProperty(router, 'url', 'get').and.returnValue('/backoffice/users/5');
      const item = { label: 'Utilisateurs', icon: 'users-group', route: '/backoffice/users' };
      expect(component.isNavItemActive(item)).toBeTrue();
    });

    it('should return false for items with direct route when URL does not match', () => {
      spyOnProperty(router, 'url', 'get').and.returnValue('/backoffice/dashboard');
      const item = { label: 'Utilisateurs', icon: 'users-group', route: '/backoffice/users' };
      expect(component.isNavItemActive(item)).toBeFalse();
    });

    it('should return false for items without route and without children', () => {
      spyOnProperty(router, 'url', 'get').and.returnValue('/backoffice/anything');
      const item = { label: 'No Route', icon: 'x' };
      expect(component.isNavItemActive(item)).toBeFalse();
    });
  });

  // --- toggleNavGroup / isNavGroupExpanded ---

  describe('toggleNavGroup and isNavGroupExpanded', () => {
    it('should toggle group expanded state', () => {
      const item = { label: 'Évaluations', icon: 'clipboard-check', children: [] };
      expect(component.isNavGroupExpanded(item)).toBeFalse();
      component.toggleNavGroup(item);
      expect(component.isNavGroupExpanded(item)).toBeTrue();
      component.toggleNavGroup(item);
      expect(component.isNavGroupExpanded(item)).toBeFalse();
    });

    it('should start Sujets and Équipes de recherche collapsed when no matching route', () => {
      const sujets = { label: 'Sujets', icon: 'clipboard', children: [] };
      const equipes = { label: 'Équipes de recherche', icon: 'users', children: [] };
      expect(component.isNavGroupExpanded(sujets)).toBeFalse();
      expect(component.isNavGroupExpanded(equipes)).toBeFalse();
    });

    it('should start Évaluations collapsed', () => {
      const evals = { label: 'Évaluations', icon: 'clipboard-check', children: [] };
      expect(component.isNavGroupExpanded(evals)).toBeFalse();
    });
  });

  // --- expandActiveGroups via router events ---

  describe('expandActiveGroups via NavigationEnd', () => {
    it('should expand groups on NavigationEnd events', () => {
      const router = TestBed.inject(Router);
      const evalsItem = { label: 'Évaluations', icon: 'clipboard-check', children: [] };
      spyOnProperty(router, 'url', 'get').and.returnValue('/backoffice/criteres');

      (router.events as Subject<any>).next(new NavigationEnd(1, '/backoffice/criteres', '/backoffice/criteres'));

      expect(component.isNavGroupExpanded(evalsItem)).toBeTrue();
    });

    it('should collapse groups when navigating away', () => {
      const router = TestBed.inject(Router);
      const evalsItem = { label: 'Évaluations', icon: 'clipboard-check', children: [] };
      const urlSpy = spyOnProperty(router, 'url', 'get').and.returnValue('/backoffice/criteres');

      (router.events as Subject<any>).next(new NavigationEnd(1, '/backoffice/criteres', '/backoffice/criteres'));
      expect(component.isNavGroupExpanded(evalsItem)).toBeTrue();

      urlSpy.and.returnValue('/backoffice/dashboard');
      (router.events as Subject<any>).next(new NavigationEnd(2, '/backoffice/dashboard', '/backoffice/dashboard'));
      expect(component.isNavGroupExpanded(evalsItem)).toBeFalse();
    });
  });

  // --- loadPendingDemandes ---

  describe('loadPendingDemandes', () => {
    it('should count EN_ATTENTE affiliations', () => {
      affiliationService.getAll.and.returnValue(of([
        fakeAffiliation('EN_ATTENTE'),
        fakeAffiliation('EN_ATTENTE'),
        fakeAffiliation('ACCEPTEE'),
        fakeAffiliation('REFUSEE'),
      ] as any));

      const fresh = TestBed.createComponent(BackofficeLayoutComponent).componentInstance;
      expect(fresh.pendingDemandesCount()).toBe(2);
    });

    it('should set 0 when no EN_ATTENTE affiliations', () => {
      affiliationService.getAll.and.returnValue(of([
        fakeAffiliation('ACCEPTEE'),
        fakeAffiliation('REFUSEE'),
      ] as any));

      const fresh = TestBed.createComponent(BackofficeLayoutComponent).componentInstance;
      expect(fresh.pendingDemandesCount()).toBe(0);
    });

    it('should set 0 when affiliation service returns empty array', () => {
      affiliationService.getAll.and.returnValue(of([]));

      const fresh = TestBed.createComponent(BackofficeLayoutComponent).componentInstance;
      expect(fresh.pendingDemandesCount()).toBe(0);
    });

    it('should handle error from affiliation service gracefully', () => {
      affiliationService.getAll.and.returnValue(throwError(() => new Error('network')));

      const fresh = TestBed.createComponent(BackofficeLayoutComponent).componentInstance;
      expect(fresh.pendingDemandesCount()).toBe(0);
    });
  });

  // --- initials edge cases ---

  describe('initials', () => {
    it('should return uppercase initials from prenom and nom', () => {
      currentUser.set(userWith('ROLE_ADMIN', { prenom: 'alice', nom: 'bertrand' }));
      expect(component.initials()).toBe('AB');
    });

    it('should handle empty prenom and nom', () => {
      currentUser.set(userWith('ROLE_ADMIN', { prenom: '', nom: '' }));
      expect(component.initials()).toBe('');
    });

    it('should fallback to AD when user is null', () => {
      currentUser.set(null);
      expect(component.initials()).toBe('AD');
    });
  });
});
