import { WritableSignal, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { Role, User } from '../../core/models/user.model';
import { AuthService } from '../../core/services/auth.service';
import { FrontofficeLayout } from './frontoffice-layout';

function userWith(role: Role): User {
  return {
    id: 1, nom: 'Dupont', prenom: 'Jean', email: 'j@esprit.tn', identifiant: 'JD1',
    role, typeUtilisateur: 'ENSEIGNANT', departement: null, enabled: true, createdAt: null,
    isAffilieToEquipe: false, equipeId: null, equipeNom: null,
  };
}

describe('FrontofficeLayout', () => {
  let component: FrontofficeLayout;
  let currentUser: WritableSignal<User | null>;
  let logout: jasmine.Spy;

  beforeEach(() => {
    currentUser = signal<User | null>(null);
    logout = jasmine.createSpy('logout');
    TestBed.configureTestingModule({
      imports: [FrontofficeLayout],
      providers: [
        provideRouter([]),
        {
          provide: AuthService,
          useValue: {
            currentUser,
            logout,
            isAffilieToEquipe: () => currentUser()?.isAffilieToEquipe ?? false,
            equipeId: () => currentUser()?.equipeId ?? null,
            equipeNom: () => currentUser()?.equipeNom ?? null,
          },
        },
      ],
    });
    component = TestBed.createComponent(FrontofficeLayout).componentInstance;
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should fall back to "U" initials and empty role/nav without a user', () => {
    expect(component.initials()).toBe('U');
    expect(component.roleLabel()).toBe('');
    expect(component.navLinks()).toEqual([]);
  });

  it('should compute initials and role label from the user', () => {
    currentUser.set(userWith('ROLE_CI'));
    expect(component.initials()).toBe('JD');
    expect(component.roleLabel()).toBe('Comité industriel');
  });

  it('should build the teacher navigation without mes sujets when not affiliated', () => {
    currentUser.set(userWith('ROLE_ENSEIGNANT'));
    const labels = component.navLinks().map((l) => l.label);
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
    expect(labels).toEqual(['Sujets disponibles', 'Mes candidatures']);
  });

  it('should build the team-lead navigation', () => {
    currentUser.set(userWith('ROLE_CHEF_EQUIPE'));
    const labels = component.navLinks().map((l) => l.label);
    expect(labels).toContain('Sujets');
    expect(labels).not.toContain('Sujets disponibles');

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
    expect(component.navLinks().length).toBe(4);
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
});
