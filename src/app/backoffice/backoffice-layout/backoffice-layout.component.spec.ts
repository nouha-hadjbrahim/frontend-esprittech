import { WritableSignal, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { Role, User } from '../../core/models/user.model';
import { AuthService } from '../../core/services/auth.service';
import { BackofficeLayoutComponent } from './backoffice-layout.component';

function userWith(role: Role): User {
  return {
    id: 1, nom: 'Dupont', prenom: 'Jean', email: 'j@esprit.tn', identifiant: 'JD1',
    role, typeUtilisateur: 'ENSEIGNANT', departement: null, enabled: true, createdAt: null,
  };
}

describe('BackofficeLayoutComponent', () => {
  let component: BackofficeLayoutComponent;
  let currentUser: WritableSignal<User | null>;
  let logout: jasmine.Spy;

  beforeEach(() => {
    currentUser = signal<User | null>(null);
    logout = jasmine.createSpy('logout');
    TestBed.configureTestingModule({
      imports: [BackofficeLayoutComponent],
      providers: [
        provideRouter([]),
        { provide: AuthService, useValue: { currentUser, logout } },
      ],
    });
    component = TestBed.createComponent(BackofficeLayoutComponent).componentInstance;
  });

  it('should create with the full navigation', () => {
    expect(component).toBeTruthy();
    expect(component.navItems.length).toBe(11);
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
