import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { Role, User } from '../models/user.model';
import { AuthService } from './auth.service';

const API = 'http://localhost:8080/api/auth';

function userWith(role: Role): User {
  return {
    id: 1,
    nom: 'Dupont',
    prenom: 'Jean',
    email: 'jean@esprit.tn',
    identifiant: 'JD1',
    role,
    typeUtilisateur: 'ETUDIANT',
    departement: null,
    enabled: true,
    createdAt: null,
    isAffilieToEquipe: false,
    equipeId: null,
    equipeNom: null,
  };
}

describe('AuthService', () => {
  let service: AuthService;
  let http: HttpTestingController;
  let routerSpy: jasmine.SpyObj<Router>;

  beforeEach(() => {
    localStorage.clear();
    routerSpy = jasmine.createSpyObj<Router>('Router', ['navigate']);
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: Router, useValue: routerSpy },
      ],
    });
    service = TestBed.inject(AuthService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    http.verify();
    localStorage.clear();
  });

  it('should be created with no authenticated user', () => {
    expect(service).toBeTruthy();
    expect(service.currentUser()).toBeNull();
    expect(service.isAuthenticated()).toBeFalse();
  });

  it('should purge any legacy localStorage keys on creation', () => {
    localStorage.setItem('esprittech.accessToken', 'leftover');
    localStorage.setItem('esprittech.user', '{}');
    localStorage.setItem('auth_token', 'leftover');

    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: Router, useValue: routerSpy },
      ],
    });
    TestBed.inject(AuthService);
    http = TestBed.inject(HttpTestingController);

    expect(localStorage.getItem('esprittech.accessToken')).toBeNull();
    expect(localStorage.getItem('esprittech.user')).toBeNull();
    expect(localStorage.getItem('auth_token')).toBeNull();
  });

  it('should login and store the user in memory (no token in localStorage)', () => {
    const user = userWith('ROLE_ADMIN');
    service.login({ email: 'j@esprit.tn', password: 'x' }).subscribe();
    const req = http.expectOne(`${API}/login`);
    expect(req.request.method).toBe('POST');
    req.flush(user);

    expect(service.currentUser()?.role).toBe('ROLE_ADMIN');
    expect(service.isAuthenticated()).toBeTrue();
    expect(localStorage.getItem('esprittech.accessToken')).toBeNull();
    expect(localStorage.getItem('esprittech.user')).toBeNull();
  });

  it('should register and store the user in memory', () => {
    const user = userWith('ROLE_ETUDIANT');
    service
      .register({ nom: 'D', prenom: 'J', email: 'j@esprit.tn', identifiant: 'JD1', password: 'Passw0rd' })
      .subscribe();
    const req = http.expectOne(`${API}/register`);
    expect(req.request.method).toBe('POST');
    req.flush(user);

    expect(service.currentUser()).toEqual(user);
  });

  it('should refresh by posting to /refresh without sending a token in the body', () => {
    service.refreshToken().subscribe();
    const req = http.expectOne(`${API}/refresh`);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual({});
    req.flush(userWith('ROLE_CI'));
    expect(service.currentUser()?.role).toBe('ROLE_CI');
  });

  it('should fetch the current user and update local state', () => {
    const user = userWith('ROLE_ENSEIGNANT');
    service.getCurrentUser().subscribe();
    const req = http.expectOne(`${API}/me`);
    expect(req.request.method).toBe('GET');
    req.flush(user);
    expect(service.currentUser()).toEqual(user);
  });

  it('restoreSession should populate the user when /me succeeds', () => {
    const user = userWith('ROLE_ADMIN');
    service.restoreSession().subscribe();
    http.expectOne(`${API}/me`).flush(user);
    expect(service.currentUser()).toEqual(user);
  });

  it('restoreSession should stay logged out (without error) when /me fails', () => {
    let errored = false;
    service.restoreSession().subscribe({ error: () => (errored = true) });
    http.expectOne(`${API}/me`).flush('nope', { status: 401, statusText: 'Unauthorized' });
    expect(errored).toBeFalse();
    expect(service.currentUser()).toBeNull();
  });

  it('should logout: call the backend, clear the session and redirect to sign-in', () => {
    service.login({ email: 'j@esprit.tn', password: 'x' }).subscribe();
    http.expectOne(`${API}/login`).flush(userWith('ROLE_ADMIN'));
    expect(service.isAuthenticated()).toBeTrue();

    service.logout();
    const req = http.expectOne(`${API}/logout`);
    expect(req.request.method).toBe('POST');
    req.flush(null, { status: 204, statusText: 'No Content' });

    expect(service.currentUser()).toBeNull();
    expect(routerSpy.navigate).toHaveBeenCalledWith(['/sign-in']);
  });

  it('should still clear the session and redirect if the logout request fails', () => {
    service.logout();
    http.expectOne(`${API}/logout`).flush('err', { status: 500, statusText: 'Server Error' });
    expect(service.currentUser()).toBeNull();
    expect(routerSpy.navigate).toHaveBeenCalledWith(['/sign-in']);
  });

  it('isLoggedIn should reflect the in-memory user', () => {
    expect(service.isLoggedIn()).toBeFalse();
    service.login({ email: 'j@esprit.tn', password: 'x' }).subscribe();
    http.expectOne(`${API}/login`).flush(userWith('ROLE_ADMIN'));
    expect(service.isLoggedIn()).toBeTrue();
  });

  it('getRole should return null when no user is connected', () => {
    expect(service.getRole()).toBeNull();
  });

  describe('landingRoute', () => {
    function loginAs(role: Role): void {
      service.login({ email: 'a@esprit.tn', password: 'x' }).subscribe();
      http.expectOne(`${API}/login`).flush(userWith(role));
    }

    it('should route ROLE_ADMIN to backoffice users', () => {
      loginAs('ROLE_ADMIN');
      expect(service.getRole()).toBe('ROLE_ADMIN');
      expect(service.landingRoute()).toBe('/backoffice/users');
    });

    it('should route ROLE_ENSEIGNANT to mes sujets', () => {
      loginAs('ROLE_ENSEIGNANT');
      expect(service.landingRoute()).toBe('/frontoffice/sujets/mes-sujets');
    });

    it('should route ROLE_ETUDIANT to available subjects', () => {
      loginAs('ROLE_ETUDIANT');
      expect(service.landingRoute()).toBe('/frontoffice/sujets/disponibles');
    });

    it('should route ROLE_CHEF_EQUIPE to the dashboard', () => {
      loginAs('ROLE_CHEF_EQUIPE');
      expect(service.landingRoute()).toBe('/frontoffice/tableau-de-bord');
    });

    it('should route ROLE_CI to the industrialisation workspace', () => {
      loginAs('ROLE_CI');
      expect(service.landingRoute()).toBe('/ci/industrialisation');
    });

    it('should fall back to available subjects when no role is present', () => {
      expect(service.landingRoute()).toBe('/frontoffice/sujets/disponibles');
    });
  });
});
