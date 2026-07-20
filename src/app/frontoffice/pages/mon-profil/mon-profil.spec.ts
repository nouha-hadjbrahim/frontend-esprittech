import { ComponentFixture, TestBed, fakeAsync, tick } from '@angular/core/testing';
import { ReactiveFormsModule } from '@angular/forms';
import { of, throwError } from 'rxjs';
import { MonProfil } from './mon-profil';
import { AuthService } from '../../../core/services/auth.service';
import { signal } from '@angular/core';
import { User } from '../../../core/models/user.model';
import { HttpErrorResponse } from '@angular/common/http';

describe('MonProfil', () => {
  let component: MonProfil;
  let fixture: ComponentFixture<MonProfil>;
  let authService: jasmine.SpyObj<AuthService>;
  let currentUserSignal: ReturnType<typeof signal<User | null>>;

  const mockUser: User = {
    id: 1,
    nom: 'Dupont',
    prenom: 'Jean',
    email: 'jean@test.com',
    role: 'ROLE_ENSEIGNANT',
    typeUtilisateur: 'ENSEIGNANT',
    departement: null,
    enabled: true,
    createdAt: null,
  };

  beforeEach(async () => {
    authService = jasmine.createSpyObj<AuthService>('AuthService', ['updateProfile', 'changePassword']);
    currentUserSignal = signal<User | null>(mockUser);
    Object.defineProperty(authService, 'currentUser', { value: currentUserSignal, writable: false, configurable: true });
    authService.updateProfile.and.returnValue(of(mockUser));
    authService.changePassword.and.returnValue(of(undefined as any));

    await TestBed.configureTestingModule({
      imports: [ReactiveFormsModule, MonProfil],
      providers: [
        { provide: AuthService, useValue: authService },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(MonProfil);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create and populate form', () => {
    expect(component).toBeTruthy();
    expect(component.profileForm.value.nom).toBe('Dupont');
    expect(component.profileForm.value.prenom).toBe('Jean');
  });

  it('should compute roleLabel and initials', () => {
    expect(component.roleLabel()).toBe('Enseignant');
    expect(component.initials()).toBe('JD');
  });

  it('should handle null user for initials and roleLabel', () => {
    currentUserSignal.set(null);
    expect(component.initials()).toBe('U');
    expect(component.roleLabel()).toBe('');
  });

  it('should save profile successfully', fakeAsync(() => {
    component.profileForm.setValue({ nom: 'Martin', prenom: 'Paul' });
    component.saveProfile();
    tick();
    expect(component.profileSuccess).toBe('Profil mis à jour avec succès.');
    expect(component.isSavingProfile).toBeFalse();
  }));

  it('should not save invalid profile', () => {
    component.profileForm.setValue({ nom: '', prenom: 'A' });
    component.saveProfile();
    expect(component.isSavingProfile).toBeFalse();
    expect(component.profileError).toBe('');
  });

  it('should handle profile save error with message', fakeAsync(() => {
    authService.updateProfile.and.returnValue(throwError(() => new HttpErrorResponse({
      error: { message: 'Email already used' },
      status: 400,
    })));
    component.profileForm.setValue({ nom: 'Martin', prenom: 'Paul' });
    component.saveProfile();
    tick();
    expect(component.profileError).toBe('Email already used');
    expect(component.isSavingProfile).toBeFalse();
  }));

  it('should handle profile error with string body', fakeAsync(() => {
    authService.updateProfile.and.returnValue(throwError(() => new HttpErrorResponse({
      error: '  Server error string  ',
      status: 500,
    })));
    component.profileForm.setValue({ nom: 'Martin', prenom: 'Paul' });
    component.saveProfile();
    tick();
    expect(component.profileError).toContain('Server error string');
  }));

  it('should handle profile error 401', fakeAsync(() => {
    authService.updateProfile.and.returnValue(throwError(() => new HttpErrorResponse({
      error: null,
      status: 401,
    })));
    component.profileForm.setValue({ nom: 'Martin', prenom: 'Paul' });
    component.saveProfile();
    tick();
    expect(component.profileError).toBe('Mot de passe actuel incorrect ou session expirée.');
  }));

  it('should handle profile error 400', fakeAsync(() => {
    authService.updateProfile.and.returnValue(throwError(() => new HttpErrorResponse({
      error: null,
      status: 400,
    })));
    component.profileForm.setValue({ nom: 'Martin', prenom: 'Paul' });
    component.saveProfile();
    tick();
    expect(component.profileError).toBe('Données invalides. Vérifiez le formulaire.');
  }));

  it('should handle profile error detail field', fakeAsync(() => {
    authService.updateProfile.and.returnValue(throwError(() => new HttpErrorResponse({
      error: { detail: 'Detail message' },
      status: 500,
    })));
    component.profileForm.setValue({ nom: 'Martin', prenom: 'Paul' });
    component.saveProfile();
    tick();
    expect(component.profileError).toBe('Detail message');
  }));

  it('should handle profile error non-Http', fakeAsync(() => {
    authService.updateProfile.and.returnValue(throwError(() => new Error('network')));
    component.profileForm.setValue({ nom: 'Martin', prenom: 'Paul' });
    component.saveProfile();
    tick();
    expect(component.profileError).toBe("Une erreur est survenue. Veuillez réessayer.");
  }));

  it('should save password successfully', fakeAsync(() => {
    component.passwordForm.setValue({
      currentPassword: 'old12345',
      newPassword: 'newPass123',
      confirmPassword: 'newPass123',
    });
    component.savePassword();
    tick();
    expect(component.passwordSuccess).toBe('Mot de passe modifié avec succès.');
    expect(component.passwordForm.value.currentPassword).toBeFalsy();
  }));

  it('should not save password when passwords mismatch', () => {
    component.passwordForm.setValue({
      currentPassword: 'old12345',
      newPassword: 'newPass123',
      confirmPassword: 'different',
    });
    component.savePassword();
    expect(component.passwordError).toBe('Les deux mots de passe ne correspondent pas.');
  });

  it('should not save invalid password form', () => {
    component.passwordForm.setValue({
      currentPassword: '',
      newPassword: '',
      confirmPassword: '',
    });
    component.savePassword();
    expect(component.isSavingPassword).toBeFalse();
  });

  it('should handle password save error', fakeAsync(() => {
    authService.changePassword.and.returnValue(throwError(() => new HttpErrorResponse({
      error: { message: 'Wrong password' },
      status: 400,
    })));
    component.passwordForm.setValue({
      currentPassword: 'old12345',
      newPassword: 'newPass123',
      confirmPassword: 'newPass123',
    });
    component.savePassword();
    tick();
    expect(component.passwordError).toBe('Wrong password');
    expect(component.isSavingPassword).toBeFalse();
  }));

  it('should handle password error with null body', fakeAsync(() => {
    authService.changePassword.and.returnValue(throwError(() => new HttpErrorResponse({
      error: null,
      status: 500,
    })));
    component.passwordForm.setValue({
      currentPassword: 'old12345',
      newPassword: 'newPass123',
      confirmPassword: 'newPass123',
    });
    component.savePassword();
    tick();
    expect(component.passwordError).toBe("Une erreur est survenue. Veuillez réessayer.");
  }));

  it('should handle password error non-Http', fakeAsync(() => {
    authService.changePassword.and.returnValue(throwError(() => new Error('network')));
    component.passwordForm.setValue({
      currentPassword: 'old12345',
      newPassword: 'newPass123',
      confirmPassword: 'newPass123',
    });
    component.savePassword();
    tick();
    expect(component.passwordError).toBe("Une erreur est survenue. Veuillez réessayer.");
  }));

  it('should handle ngOnInit with no user', () => {
    currentUserSignal.set(null);
    const fixture2 = TestBed.createComponent(MonProfil);
    fixture2.detectChanges();
    expect(fixture2.componentInstance.profileForm.value.nom).toBe('');
  });
});
