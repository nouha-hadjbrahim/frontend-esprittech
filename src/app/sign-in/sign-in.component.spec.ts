import { HttpErrorResponse } from '@angular/common/http';
import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, Router } from '@angular/router';
import { of, throwError } from 'rxjs';
import { User } from '../core/models/user.model';
import { AuthService } from '../core/services/auth.service';
import { SignInComponent } from './sign-in.component';

describe('SignInComponent', () => {
  let component: SignInComponent;
  let authService: jasmine.SpyObj<AuthService>;
  let router: jasmine.SpyObj<Router>;
  let redirectValue: string | null;

  function setup(): void {
    redirectValue = null;
    authService = jasmine.createSpyObj<AuthService>('AuthService', ['login', 'landingRoute']);
    router = jasmine.createSpyObj<Router>('Router', ['navigateByUrl']);
    authService.landingRoute.and.returnValue('/frontoffice/sujets-disponibles');

    TestBed.configureTestingModule({
      imports: [SignInComponent],
      providers: [
        { provide: AuthService, useValue: authService },
        { provide: Router, useValue: router },
        {
          provide: ActivatedRoute,
          useValue: { snapshot: { queryParamMap: { get: (_: string) => redirectValue } } },
        },
      ],
    });
    component = TestBed.createComponent(SignInComponent).componentInstance;
  }

  beforeEach(setup);

  it('should create with an invalid empty form', () => {
    expect(component).toBeTruthy();
    expect(component.form.invalid).toBeTrue();
    expect(component.f.email).toBeDefined();
  });

  it('should not call login when the form is invalid', () => {
    component.onSubmit();
    expect(authService.login).not.toHaveBeenCalled();
    expect(component.form.touched).toBeTrue();
  });

  it('should login and redirect by role when there is no redirect param', () => {
    component.form.setValue({ email: 'a@esprit.tn', password: 'pw' });
    authService.login.and.returnValue(of({} as User));
    component.onSubmit();
    expect(authService.login).toHaveBeenCalled();
    expect(router.navigateByUrl).toHaveBeenCalledWith('/frontoffice/sujets-disponibles');
    expect(component.loading()).toBeFalse();
  });

  it('should redirect to the deep-link when a redirect param is present', () => {
    redirectValue = '/backoffice/users';
    component.form.setValue({ email: 'a@esprit.tn', password: 'pw' });
    authService.login.and.returnValue(of({} as User));
    component.onSubmit();
    expect(router.navigateByUrl).toHaveBeenCalledWith('/backoffice/users');
  });

  it('should show a credentials error on 401', () => {
    component.form.setValue({ email: 'a@esprit.tn', password: 'pw' });
    authService.login.and.returnValue(throwError(() => new HttpErrorResponse({ status: 401 })));
    component.onSubmit();
    expect(component.serverError()).toBe('Email ou mot de passe incorrect.');
    expect(component.loading()).toBeFalse();
  });

  it('should show an unreachable-server error on status 0', () => {
    component.form.setValue({ email: 'a@esprit.tn', password: 'pw' });
    authService.login.and.returnValue(throwError(() => new HttpErrorResponse({ status: 0 })));
    component.onSubmit();
    expect(component.serverError()).toContain('Serveur injoignable');
  });

  it('should surface the backend detail message for other errors', () => {
    component.form.setValue({ email: 'a@esprit.tn', password: 'pw' });
    authService.login.and.returnValue(
      throwError(() => new HttpErrorResponse({ status: 500, error: { detail: 'Boom' } })),
    );
    component.onSubmit();
    expect(component.serverError()).toBe('Boom');
  });

  it('should fall back to a generic message when no detail is provided', () => {
    component.form.setValue({ email: 'a@esprit.tn', password: 'pw' });
    authService.login.and.returnValue(throwError(() => new HttpErrorResponse({ status: 500 })));
    component.onSubmit();
    expect(component.serverError()).toContain('Une erreur est survenue');
  });
});
