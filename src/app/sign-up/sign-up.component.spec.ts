import { HttpErrorResponse } from '@angular/common/http';
import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, Router } from '@angular/router';
import { of, throwError } from 'rxjs';
import { User } from '../core/models/user.model';
import { AuthService } from '../core/services/auth.service';
import { SignUpComponent } from './sign-up.component';

describe('SignUpComponent', () => {
  let component: SignUpComponent;
  let authService: jasmine.SpyObj<AuthService>;
  let router: jasmine.SpyObj<Router>;

  const validValues = {
    prenom: 'Jean',
    nom: 'Dupont',
    email: 'jean@esprit.tn',
    password: 'Passw0rd',
    confirmPassword: 'Passw0rd',
  };

  beforeEach(() => {
    authService = jasmine.createSpyObj<AuthService>('AuthService', ['register', 'landingRoute']);
    router = jasmine.createSpyObj<Router>('Router', ['navigateByUrl']);
    authService.landingRoute.and.returnValue('/frontoffice/accueil');

    TestBed.configureTestingModule({
      imports: [SignUpComponent],
      providers: [
        { provide: AuthService, useValue: authService },
        { provide: Router, useValue: router },
        { provide: ActivatedRoute, useValue: {} },
      ],
    });
    component = TestBed.createComponent(SignUpComponent).componentInstance;
  });

  it('should create with an invalid empty form', () => {
    expect(component).toBeTruthy();
    expect(component.form.invalid).toBeTrue();
    expect(component.f.email).toBeDefined();
  });

  it('should flag mismatched passwords at group level', () => {
    component.form.patchValue({ ...validValues, confirmPassword: 'Different1' });
    expect(component.form.errors?.['passwordMismatch']).toBeTrue();
  });

  it('should accept matching passwords', () => {
    component.form.setValue(validValues);
    expect(component.form.valid).toBeTrue();
  });

  it('should accept a well-formed @esprit.tn address and reject a malformed one', () => {
    // Garde-fou anti-régression du correctif ReDoS (S5852) : la partie locale ne doit
    // accepter ni espace ni second « @ ».
    component.f.email.setValue('jean.dupont@esprit.tn');
    expect(component.f.email.errors?.['pattern']).toBeUndefined();

    component.f.email.setValue('jean @esprit.tn');
    expect(component.f.email.errors?.['pattern']).toBeTruthy();
  });

  it('should not register when the form is invalid', () => {
    component.onSubmit();
    expect(authService.register).not.toHaveBeenCalled();
    expect(component.form.touched).toBeTrue();
  });

  it('should register and redirect on success', () => {
    component.form.setValue(validValues);
    authService.register.and.returnValue(of({} as User));
    component.onSubmit();
    expect(authService.register).toHaveBeenCalledWith({
      nom: 'Dupont', prenom: 'Jean', email: 'jean@esprit.tn', password: 'Passw0rd',
    });
    expect(router.navigateByUrl).toHaveBeenCalledWith('/frontoffice/accueil');
    expect(component.loading()).toBeFalse();
  });

  it('should show an unreachable-server error on status 0', () => {
    component.form.setValue(validValues);
    authService.register.and.returnValue(throwError(() => new HttpErrorResponse({ status: 0 })));
    component.onSubmit();
    expect(component.serverError()).toContain('Serveur injoignable');
  });

  it('should map a 404 to a referential message (with and without detail)', () => {
    component.form.setValue(validValues);
    authService.register.and.returnValue(
      throwError(() => new HttpErrorResponse({ status: 404, error: { detail: 'Introuvable' } })),
    );
    component.onSubmit();
    expect(component.serverError()).toBe('Introuvable');

    authService.register.and.returnValue(throwError(() => new HttpErrorResponse({ status: 404 })));
    component.onSubmit();
    expect(component.serverError()).toContain('référentiel');
  });

  it('should map a 409 to a duplicate message', () => {
    component.form.setValue(validValues);
    authService.register.and.returnValue(throwError(() => new HttpErrorResponse({ status: 409 })));
    component.onSubmit();
    expect(component.serverError()).toContain('déjà utilisé');
  });

  it('should apply field errors from a 400 response', () => {
    component.form.setValue(validValues);
    authService.register.and.returnValue(
      throwError(() => new HttpErrorResponse({ status: 400, error: { errors: { email: 'Email invalide' } } })),
    );
    component.onSubmit();
    expect(component.form.get('email')?.errors?.['server']).toBe('Email invalide');
    expect(component.serverError()).toContain('champs en rouge');
  });

  it('should fall back to a generic message for unmapped errors', () => {
    component.form.setValue(validValues);
    authService.register.and.returnValue(throwError(() => new HttpErrorResponse({ status: 500 })));
    component.onSubmit();
    expect(component.serverError()).toContain('Une erreur est survenue');
  });
});
