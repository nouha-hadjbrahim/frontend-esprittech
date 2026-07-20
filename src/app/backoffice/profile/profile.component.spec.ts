import { WritableSignal, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { Role, User } from '../../core/models/user.model';
import { AuthService } from '../../core/services/auth.service';
import { ProfileComponent } from './profile.component';

function userWith(role: Role): User {
  return {
    id: 1, nom: 'Dupont', prenom: 'Jean', email: 'j@esprit.tn',
    role, typeUtilisateur: 'ENSEIGNANT', departement: null, enabled: true, createdAt: null,
    isAffilieToEquipe: false, equipeId: null, equipeNom: null,
  };
}

describe('ProfileComponent', () => {
  let component: ProfileComponent;
  let currentUser: WritableSignal<User | null>;

  beforeEach(() => {
    currentUser = signal<User | null>(null);
    TestBed.configureTestingModule({
      imports: [ProfileComponent],
      providers: [{ provide: AuthService, useValue: { currentUser } }],
    });
    component = TestBed.createComponent(ProfileComponent).componentInstance;
  });

  it('should create with default form data', () => {
    expect(component).toBeTruthy();
    expect(component.profileData.email).toBe('admin@esprit.tn');
    expect(component.passwordData.current).toBe('');
  });

  it('should fall back to "AD" initials and empty role label without a user', () => {
    expect(component.initials()).toBe('AD');
    expect(component.roleLabel()).toBe('');
  });

  it('should compute initials and role label from the user', () => {
    currentUser.set(userWith('ROLE_ADMIN'));
    expect(component.initials()).toBe('JD');
    expect(component.roleLabel()).toBe('Super-administrateur');
    expect(component.roleBadgeClass()).toBe('badge--role-admin');
  });
});
