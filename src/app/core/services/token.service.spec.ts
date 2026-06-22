import { TestBed } from '@angular/core/testing';
import { User } from '../models/user.model';
import { TokenService } from './token.service';

/** Construit un JWT factice (header.payload.signature) avec le payload fourni. */
function makeJwt(payload: Record<string, unknown>): string {
  const header = btoa(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
  const body = btoa(JSON.stringify(payload));
  return `${header}.${body}.signature`;
}

const USER: User = {
  id: 1,
  nom: 'Dupont',
  prenom: 'Jean',
  email: 'jean@esprit.tn',
  identifiant: 'JD1',
  role: 'ROLE_ETUDIANT',
  typeUtilisateur: 'ETUDIANT',
  departement: null,
  enabled: true,
  createdAt: null,
};

describe('TokenService', () => {
  let service: TokenService;

  beforeEach(() => {
    localStorage.clear();
    TestBed.configureTestingModule({});
    service = TestBed.inject(TokenService);
  });

  afterEach(() => localStorage.clear());

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('should set, get and remove the access token', () => {
    service.setToken('abc');
    expect(service.getToken()).toBe('abc');
    service.removeToken();
    expect(service.getToken()).toBeNull();
  });

  it('should set and get the refresh token', () => {
    service.setRefreshToken('refresh-123');
    expect(service.getRefreshToken()).toBe('refresh-123');
  });

  it('should store and retrieve the user', () => {
    service.setUser(USER);
    expect(service.getUser()).toEqual(USER);
  });

  it('should return null when no user is stored', () => {
    expect(service.getUser()).toBeNull();
  });

  it('should return null when the stored user is not valid JSON', () => {
    localStorage.setItem('esprittech.user', '{not-json');
    expect(service.getUser()).toBeNull();
  });

  it('should clear all auth data', () => {
    service.setToken('a');
    service.setRefreshToken('b');
    service.setUser(USER);
    service.clear();
    expect(service.getToken()).toBeNull();
    expect(service.getRefreshToken()).toBeNull();
    expect(service.getUser()).toBeNull();
  });

  describe('decodeToken', () => {
    it('should return null for a null token', () => {
      expect(service.decodeToken(null)).toBeNull();
    });

    it('should return null when the token has not exactly 3 parts', () => {
      expect(service.decodeToken('only.two')).toBeNull();
    });

    it('should return null when the payload cannot be decoded', () => {
      expect(service.decodeToken('a.b.c')).toBeNull();
    });

    it('should decode a valid JWT payload', () => {
      const token = makeJwt({ sub: 'jean@esprit.tn', role: 'ROLE_ETUDIANT', exp: 9999999999 });
      const payload = service.decodeToken(token);
      expect(payload?.role).toBe('ROLE_ETUDIANT');
      expect(payload?.sub).toBe('jean@esprit.tn');
    });

    it('should decode the stored token by default', () => {
      const token = makeJwt({ sub: 'x', exp: 9999999999 });
      service.setToken(token);
      expect(service.decodeToken()).not.toBeNull();
    });
  });

  describe('isTokenExpired', () => {
    it('should return true when there is no token', () => {
      expect(service.isTokenExpired(null)).toBeTrue();
    });

    it('should return true when the payload has no exp claim', () => {
      expect(service.isTokenExpired(makeJwt({ sub: 'x' }))).toBeTrue();
    });

    it('should return true for an expired token', () => {
      const past = Math.floor(Date.now() / 1000) - 100;
      expect(service.isTokenExpired(makeJwt({ exp: past }))).toBeTrue();
    });

    it('should return false for a valid, non-expired token', () => {
      const future = Math.floor(Date.now() / 1000) + 3600;
      expect(service.isTokenExpired(makeJwt({ exp: future }))).toBeFalse();
    });
  });
});
