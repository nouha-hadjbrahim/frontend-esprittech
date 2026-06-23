import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideHttpClient } from '@angular/common/http';
import { TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { AuthResponse } from '../models/auth-response.model';
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
  };
}

function authResponse(role: Role): AuthResponse {
  return {
    accessToken: 'access-token',
    refreshToken: 'refresh-token',
    tokenType: 'Bearer',
    user: userWith(role),
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

  it('should register and persist the session', () => {
    const res = authResponse('ROLE_ETUDIANT');
    service
      .register({ nom: 'D', prenom: 'J', email: 'j@esprit.tn', identifiant: 'JD1', password: 'Passw0rd' })
      .subscribe();
    const req = http.expectOne(`${API}/register`);
    expect(req.request.method).toBe('POST');
    req.flush(res);

    expect(service.currentUser()).toEqual(res.user);
    expect(service.isAuthenticated()).toBeTrue();
    expect(localStorage.getItem('esprittech.accessToken')).toBe('access-token');
    expect(localStorage.getItem('esprittech.refreshToken')).toBe('refresh-token');
  });

  it('should login and persist the session', () => {
    const res = authResponse('ROLE_ADMIN');
    service.login({ email: 'j@esprit.tn', password: 'x' }).subscribe();
    const req = http.expectOne(`${API}/login`);
    expect(req.request.method).toBe('POST');
    req.flush(res);

    expect(service.currentUser()?.role).toBe('ROLE_ADMIN');
  });

  it('should refresh the token using the stored refresh token', () => {
    localStorage.setItem('esprittech.refreshToken', 'stored-refresh');
    service.refreshToken().subscribe();
    const req = http.expectOne(`${API}/refresh`);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual({ refreshToken: 'stored-refresh' });
    req.flush(authResponse('ROLE_CI'));
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

  it('should logout, clear the session and redirect to sign-in', () => {
    localStorage.setItem('esprittech.accessToken', 'a');
    service.logout();
    expect(service.currentUser()).toBeNull();
    expect(localStorage.getItem('esprittech.accessToken')).toBeNull();
    expect(routerSpy.navigate).toHaveBeenCalledWith(['/sign-in']);
  });

  it('isLoggedIn should be false without a valid token', () => {
    expect(service.isLoggedIn()).toBeFalse();
  });

  it('isLoggedIn should be true with a valid (non-expired) token', () => {
    const future = Math.floor(Date.now() / 1000) + 3600;
    const token = `h.${btoa(JSON.stringify({ exp: future }))}.s`;
    localStorage.setItem('esprittech.accessToken', token);
    expect(service.isLoggedIn()).toBeTrue();
  });

  it('getRole should return null when no user is connected', () => {
    expect(service.getRole()).toBeNull();
  });

  describe('landingRoute', () => {
    function loginAs(role: Role): void {
      service.login({ email: 'a@esprit.tn', password: 'x' }).subscribe();
      http.expectOne(`${API}/login`).flush(authResponse(role));
    }

    it('should route ROLE_ADMIN to backoffice users', () => {
      loginAs('ROLE_ADMIN');
      expect(service.getRole()).toBe('ROLE_ADMIN');
      expect(service.landingRoute()).toBe('/backoffice/users');
    });

    it('should route ROLE_ENSEIGNANT to the catalogue', () => {
      loginAs('ROLE_ENSEIGNANT');
      expect(service.landingRoute()).toBe('/frontoffice/catalogue');
    });

    it('should route ROLE_ETUDIANT to available subjects', () => {
      loginAs('ROLE_ETUDIANT');
      expect(service.landingRoute()).toBe('/frontoffice/sujets-disponibles');
    });

    it('should route ROLE_CHEF_EQUIPE to the dashboard', () => {
      loginAs('ROLE_CHEF_EQUIPE');
      expect(service.landingRoute()).toBe('/frontoffice/tableau-de-bord');
    });

    it('should route ROLE_CI to the dashboard', () => {
      loginAs('ROLE_CI');
      expect(service.landingRoute()).toBe('/frontoffice/tableau-de-bord');
    });

    it('should fall back to available subjects when no role is present', () => {
      expect(service.landingRoute()).toBe('/frontoffice/sujets-disponibles');
    });
  });
});
