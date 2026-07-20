import { WritableSignal, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { of } from 'rxjs';
import { AffiliationService } from '../../core/services/affiliation.service';
import { Role, User } from '../../core/models/user.model';
import { AuthService } from '../../core/services/auth.service';
import { EquipeService } from '../../core/services/equipe.service';
import { NotificationService } from '../../core/services/notification.service';
import { FrontofficeLayout } from './frontoffice-layout';

function userWith(role: Role): User {
  return {
    id: 1, nom: 'Dupont', prenom: 'Jean', email: 'j@esprit.tn',
    role, typeUtilisateur: 'ENSEIGNANT', departement: null, enabled: true, createdAt: null,
    isAffilieToEquipe: false, equipeId: null, equipeNom: null,
  };
}

describe('FrontofficeLayout', () => {
  let component: FrontofficeLayout;
  let currentUser: WritableSignal<User | null>;
  let logout: jasmine.Spy;
  let affiliationService: jasmine.SpyObj<AffiliationService>;
  let equipeService: jasmine.SpyObj<EquipeService>;
  let notificationService: jasmine.SpyObj<NotificationService>;

  beforeEach(() => {
    currentUser = signal<User | null>(null);
    logout = jasmine.createSpy('logout');
    affiliationService = jasmine.createSpyObj<AffiliationService>('AffiliationService', ['getByEquipe']);
    affiliationService.getByEquipe.and.returnValue(of([]));
    equipeService = jasmine.createSpyObj<EquipeService>('EquipeService', ['getAll']);
    equipeService.getAll.and.returnValue(of([]));
    notificationService = jasmine.createSpyObj<NotificationService>(
      'NotificationService',
      ['initialize', 'marquerCommeLu', 'marquerToutCommeLu', 'marquerPlusieursCommeLu', 'loadMore', 'fetchUnreadByType'],
      {
        notifications: signal([]),
        unreadCount: signal(0),
        loading: signal(false),
        hasMore: signal(false),
      },
    );
    notificationService.fetchUnreadByType.and.returnValue(of([]));
    TestBed.configureTestingModule({
      imports: [FrontofficeLayout],
      providers: [
        provideRouter([]),
        {
          provide: AuthService,
          useValue: {
            currentUser,
            logout,
            getRole: () => currentUser()?.role ?? null,
            isAffilieToEquipe: () => currentUser()?.isAffilieToEquipe ?? false,
            equipeId: () => currentUser()?.equipeId ?? null,
            equipeNom: () => currentUser()?.equipeNom ?? null,
          },
        },
        { provide: AffiliationService, useValue: affiliationService },
        { provide: EquipeService, useValue: equipeService },
        { provide: NotificationService, useValue: notificationService },
      ],
    });
    component = TestBed.createComponent(FrontofficeLayout).componentInstance;
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should fall back to "U" initials and Accueil-only nav without a user', () => {
    expect(component.initials()).toBe('U');
    expect(component.roleLabel()).toBe('');
    expect(component.navLinks().map((l) => l.label)).toEqual(['Accueil']);
  });

  it('should compute initials and role label from the user', () => {
    currentUser.set(userWith('ROLE_CI'));
    expect(component.initials()).toBe('JD');
    expect(component.roleLabel()).toBe('Comité industriel');
  });

  it('should build the teacher navigation without mes sujets when not affiliated', () => {
    currentUser.set(userWith('ROLE_ENSEIGNANT'));
    const labels = component.navLinks().map((l) => l.label);
    expect(labels[0]).toBe('Accueil');
    expect(labels).toContain('Catalogue');
    expect(labels).toContain('Sujets');
    expect(labels).toContain('Demandes d\'industrialisation');
    expect(labels).toContain('Équipes de recherche');

    const sujetsNode = component.navLinks().find((l) => l.label === 'Sujets');
    expect(sujetsNode?.children?.map((c) => c.label)).toEqual(['Sujets disponibles']);
    expect(sujetsNode?.path).toBe('/frontoffice/sujets/disponibles');
  });

  it('should show mes sujets in teacher navigation when affiliated', () => {
    currentUser.set({ ...userWith('ROLE_ENSEIGNANT'), isAffilieToEquipe: true, equipeId: 1, equipeNom: 'REEE' });
    const sujetsNode = component.navLinks().find((l) => l.label === 'Sujets');
    expect(sujetsNode?.children?.map((c) => c.label)).toEqual(['Sujets disponibles', 'Mes sujets']);
    expect(sujetsNode?.path).toBe('/frontoffice/sujets/mes-sujets');
  });

  it('should build the student navigation', () => {
    currentUser.set(userWith('ROLE_ETUDIANT'));
    const labels = component.navLinks().map((l) => l.label);
    expect(labels).toEqual(['Accueil', 'Sujets disponibles', 'Mes candidatures']);
  });

  it('should build the team-lead navigation', () => {
    currentUser.set(userWith('ROLE_CHEF_EQUIPE'));
    const labels = component.navLinks().map((l) => l.label);
    expect(labels[0]).toBe('Accueil');
    expect(labels).toContain('Sujets');
    expect(labels).not.toContain('Sujets disponibles');
    expect(labels).not.toContain('Tableau de bord');

    const sujetsNode = component.navLinks().find((l) => l.label === 'Sujets');
    expect(sujetsNode?.children?.map((c) => c.label)).toEqual([
      'Sujets disponibles',
      'Mes sujets',
      'Validation des sujets',
    ]);
    expect(sujetsNode?.path).toBe('/frontoffice/validation-sujets');
    expect(component.navLinks().length).toBe(5);
  });

  it('should build the CI navigation', () => {
    currentUser.set(userWith('ROLE_CI'));
    expect(component.navLinks()[0].label).toBe('Accueil');
    expect(component.navLinks().length).toBe(4);
    expect(component.navLinks().map((l) => l.label)).not.toContain('Tableau de bord');
  });

  it('should toggle the profile dropdown', () => {
    expect(component.isProfileDropdownOpen()).toBeFalse();
    component.toggleProfileDropdown();
    expect(component.isProfileDropdownOpen()).toBeTrue();
  });

  it('should delegate logout to the auth service', () => {
    component.logout();
    expect(logout).toHaveBeenCalled();
  });

  it('shows acceptance popup for unread SUJET_VALIDE notifications', () => {
    currentUser.set(userWith('ROLE_ENSEIGNANT'));
    component.openAcceptancePopup([
      {
        id: 11,
        type: 'SUJET_VALIDE',
        title: 'Sujet accepté',
        message: 'Votre sujet "Plateforme IA" a été accepté par le chef d\'équipe.',
        link: '/frontoffice/sujets/mes-sujets',
        read: false,
        createdAt: '2026-07-20T10:00:00Z',
      },
      {
        id: 12,
        type: 'SUJET_VALIDE',
        title: 'Sujet accepté',
        message: 'Votre sujet "IoT Lab" a été accepté par un administrateur.',
        link: '/frontoffice/sujets/mes-sujets',
        read: false,
        createdAt: '2026-07-20T11:00:00Z',
      },
    ]);

    expect(component.showSujetAcceptedPopup()).toBeTrue();
    expect(component.acceptanceHeadline).toContain('2 sujets');
    expect(component.acceptedSujetTitles()).toEqual(['Plateforme IA', 'IoT Lab']);
  });

  it('marks acceptance notifications as read when dismissing the popup', () => {
    currentUser.set(userWith('ROLE_ENSEIGNANT'));
    component.openAcceptancePopup([
      {
        id: 11,
        type: 'SUJET_VALIDE',
        title: 'Sujet accepté',
        message: 'Votre sujet "Plateforme IA" a été accepté.',
        link: '/frontoffice/sujets/mes-sujets',
        read: false,
        createdAt: '2026-07-20T10:00:00Z',
      },
    ]);

    component.dismissSujetAcceptedPopup();

    expect(component.showSujetAcceptedPopup()).toBeFalse();
    expect(notificationService.marquerPlusieursCommeLu).toHaveBeenCalledWith([11]);
  });

  it('extracts sujet titles from validation messages', () => {
    expect(component.extractSujetTitle('Votre sujet "Demo RDI" a été accepté.')).toBe('Demo RDI');
    expect(component.extractSujetTitle('sans titre')).toBeNull();
  });
});
