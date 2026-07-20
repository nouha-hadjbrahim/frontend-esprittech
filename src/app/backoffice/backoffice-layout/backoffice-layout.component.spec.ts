import { WritableSignal, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { of } from 'rxjs';
import { Role, User } from '../../core/models/user.model';
import { AffiliationService } from '../../core/services/affiliation.service';
import { AuthService } from '../../core/services/auth.service';
import { NotificationService } from '../../core/services/notification.service';
import { BackofficeLayoutComponent } from './backoffice-layout.component';

function userWith(role: Role): User {
  return {
    id: 1, nom: 'Dupont', prenom: 'Jean', email: 'j@esprit.tn',
    role, typeUtilisateur: 'ENSEIGNANT', departement: null, enabled: true, createdAt: null,
    isAffilieToEquipe: false, equipeId: null, equipeNom: null,
  };
}

describe('BackofficeLayoutComponent', () => {
  let component: BackofficeLayoutComponent;
  let currentUser: WritableSignal<User | null>;
  let logout: jasmine.Spy;
  let affiliationService: jasmine.SpyObj<AffiliationService>;
  let notificationService: jasmine.SpyObj<NotificationService>;

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
});
