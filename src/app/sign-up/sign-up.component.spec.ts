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
    authService = jasmine.createSpyObj<AuthService>('AuthService', [
      'startRegister', 'verifyEmail', 'resendCode', 'landingRoute',
    ]);
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
    expect(component.step()).toBe('form');
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

  it('should not start registration when the form is invalid', () => {
    component.onSubmit();
    expect(authService.startRegister).not.toHaveBeenCalled();
    expect(component.form.touched).toBeTrue();
  });

  it('should send the code and move to the verify step on success', () => {
    component.form.setValue(validValues);
    authService.startRegister.and.returnValue(of(undefined));
    component.onSubmit();
    expect(authService.startRegister).toHaveBeenCalledWith({
      nom: 'Dupont', prenom: 'Jean', email: 'jean@esprit.tn', password: 'Passw0rd',
    });
    expect(component.step()).toBe('verify');
    expect(component.pendingEmail()).toBe('jean@esprit.tn');
    expect(router.navigateByUrl).not.toHaveBeenCalled();
    expect(component.loading()).toBeFalse();
  });

  it('should verify the code and redirect on success', () => {
    component.step.set('verify');
    component.pendingEmail.set('jean@esprit.tn');
    component.codeForm.setValue({ code: '123456' });
    authService.verifyEmail.and.returnValue(of({} as User));

    component.onVerify();

    expect(authService.verifyEmail).toHaveBeenCalledWith('jean@esprit.tn', '123456');
    expect(router.navigateByUrl).toHaveBeenCalledWith('/frontoffice/accueil');
    expect(component.loading()).toBeFalse();
  });

  it('should not verify when the code form is invalid', () => {
    component.step.set('verify');
    component.pendingEmail.set('jean@esprit.tn');
    component.codeForm.setValue({ code: '12' });
    component.onVerify();
    expect(authService.verifyEmail).not.toHaveBeenCalled();
  });

  it('should map an invalid code (400) to the server message on the verify step', () => {
    component.step.set('verify');
    component.pendingEmail.set('jean@esprit.tn');
    component.codeForm.setValue({ code: '000000' });
    authService.verifyEmail.and.returnValue(
      throwError(() => new HttpErrorResponse({ status: 400, error: { detail: 'Code invalide.' } })),
    );
    component.onVerify();
    expect(component.serverError()).toBe('Code invalide.');
  });

  it('should resend a code and show an info message', () => {
    component.step.set('verify');
    component.pendingEmail.set('jean@esprit.tn');
    authService.resendCode.and.returnValue(of(undefined));
    component.onResend();
    expect(authService.resendCode).toHaveBeenCalledWith('jean@esprit.tn');
    expect(component.infoMessage()).toContain('nouveau code');
  });

  it('should return to the form step', () => {
    component.step.set('verify');
    component.backToForm();
    expect(component.step()).toBe('form');
  });

  it('should show an unreachable-server error on status 0', () => {
    component.form.setValue(validValues);
    authService.startRegister.and.returnValue(throwError(() => new HttpErrorResponse({ status: 0 })));
    component.onSubmit();
    expect(component.serverError()).toContain('Serveur injoignable');
  });

  it('should map a 404 to an organization message (with and without detail)', () => {
    component.form.setValue(validValues);
    authService.startRegister.and.returnValue(
      throwError(() => new HttpErrorResponse({ status: 404, error: { detail: 'Introuvable' } })),
    );
    component.onSubmit();
    expect(component.serverError()).toBe('Introuvable');

    authService.startRegister.and.returnValue(throwError(() => new HttpErrorResponse({ status: 404 })));
    component.onSubmit();
    expect(component.serverError()).toContain('organisation ESPRIT');
  });

  it('should map a 503 to an unavailable-service message', () => {
    component.form.setValue(validValues);
    authService.startRegister.and.returnValue(throwError(() => new HttpErrorResponse({ status: 503 })));
    component.onSubmit();
    expect(component.serverError()).toContain('momentanément indisponible');
  });

  it('should map a 409 to a duplicate message', () => {
    component.form.setValue(validValues);
    authService.startRegister.and.returnValue(throwError(() => new HttpErrorResponse({ status: 409 })));
    component.onSubmit();
    expect(component.serverError()).toContain('déjà utilisé');
  });

  it('should apply field errors from a 400 response on the form step', () => {
    component.form.setValue(validValues);
    authService.startRegister.and.returnValue(
      throwError(() => new HttpErrorResponse({ status: 400, error: { errors: { email: 'Email invalide' } } })),
    );
    component.onSubmit();
    expect(component.form.get('email')?.errors?.['server']).toBe('Email invalide');
    expect(component.serverError()).toContain('champs en rouge');
  });

  it('should fall back to a generic message for unmapped errors', () => {
    component.form.setValue(validValues);
    authService.startRegister.and.returnValue(throwError(() => new HttpErrorResponse({ status: 500 })));
    component.onSubmit();
    expect(component.serverError()).toContain('Une erreur est survenue');
  });
});
