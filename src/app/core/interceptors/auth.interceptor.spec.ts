import { HttpClient, provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { Subject, of, throwError } from 'rxjs';
import { AuthResponse } from '../models/auth-response.model';
import { AuthService } from '../services/auth.service';
import { TokenService } from '../services/token.service';
import { authInterceptor } from './auth.interceptor';

const API = 'http://localhost:8080/api';

describe('authInterceptor', () => {
  let http: HttpClient;
  let httpMock: HttpTestingController;
  let tokenService: jasmine.SpyObj<TokenService>;
  let authService: jasmine.SpyObj<AuthService>;

  beforeEach(() => {
    tokenService = jasmine.createSpyObj<TokenService>('TokenService', ['getToken', 'getRefreshToken']);
    authService = jasmine.createSpyObj<AuthService>('AuthService', ['refreshToken', 'logout']);
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(withInterceptors([authInterceptor])),
        provideHttpClientTesting(),
        { provide: TokenService, useValue: tokenService },
        { provide: AuthService, useValue: authService },
      ],
    });
    http = TestBed.inject(HttpClient);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpMock.verify());

  it('should attach a Bearer token to authenticated requests', () => {
    tokenService.getToken.and.returnValue('tok');
    http.get(`${API}/equipes`).subscribe();
    const req = httpMock.expectOne(`${API}/equipes`);
    expect(req.request.headers.get('Authorization')).toBe('Bearer tok');
    req.flush([]);
  });

  it('should not attach a token to auth endpoints', () => {
    tokenService.getToken.and.returnValue('tok');
    http.post(`${API}/auth/login`, {}).subscribe();
    const req = httpMock.expectOne(`${API}/auth/login`);
    expect(req.request.headers.has('Authorization')).toBeFalse();
    req.flush({});
  });

  it('should not attach a token when none is stored', () => {
    tokenService.getToken.and.returnValue(null);
    http.get(`${API}/equipes`).subscribe();
    const req = httpMock.expectOne(`${API}/equipes`);
    expect(req.request.headers.has('Authorization')).toBeFalse();
    req.flush([]);
  });

  it('should propagate non-401 errors without refreshing', () => {
    tokenService.getToken.and.returnValue('tok');
    let status = 0;
    http.get(`${API}/equipes`).subscribe({ error: (e) => (status = e.status) });
    httpMock.expectOne(`${API}/equipes`).flush('boom', { status: 500, statusText: 'Server Error' });
    expect(status).toBe(500);
    expect(authService.refreshToken).not.toHaveBeenCalled();
  });

  it('should propagate a 401 from an auth endpoint without refreshing', () => {
    tokenService.getToken.and.returnValue(null);
    let errored = false;
    http.post(`${API}/auth/login`, {}).subscribe({ error: () => (errored = true) });
    httpMock.expectOne(`${API}/auth/login`).flush('nope', { status: 401, statusText: 'Unauthorized' });
    expect(errored).toBeTrue();
    expect(authService.refreshToken).not.toHaveBeenCalled();
  });

  it('should logout when a 401 occurs and there is no refresh token', () => {
    tokenService.getToken.and.returnValue('tok');
    tokenService.getRefreshToken.and.returnValue(null);
    let errored = false;
    http.get(`${API}/equipes`).subscribe({ error: () => (errored = true) });
    httpMock.expectOne(`${API}/equipes`).flush('nope', { status: 401, statusText: 'Unauthorized' });
    expect(authService.logout).toHaveBeenCalled();
    expect(errored).toBeTrue();
  });

  it('should refresh the token on 401 and retry the request', () => {
    tokenService.getToken.and.returnValue('old');
    tokenService.getRefreshToken.and.returnValue('refresh');
    authService.refreshToken.and.returnValue(
      of({ accessToken: 'new', refreshToken: 'r', tokenType: 'Bearer', user: {} as never }),
    );

    let body: unknown = null;
    http.get(`${API}/equipes`).subscribe((res) => (body = res));
    httpMock.expectOne(`${API}/equipes`).flush('nope', { status: 401, statusText: 'Unauthorized' });

    // The retried request carries the refreshed token.
    const retried = httpMock.expectOne(`${API}/equipes`);
    expect(retried.request.headers.get('Authorization')).toBe('Bearer new');
    retried.flush({ ok: true });
    expect(body).toEqual({ ok: true });
    expect(authService.logout).not.toHaveBeenCalled();
  });

  it('should logout when the refresh itself fails', () => {
    tokenService.getToken.and.returnValue('old');
    tokenService.getRefreshToken.and.returnValue('refresh');
    authService.refreshToken.and.returnValue(throwError(() => new Error('refresh failed')));

    let errored = false;
    http.get(`${API}/equipes`).subscribe({ error: () => (errored = true) });
    httpMock.expectOne(`${API}/equipes`).flush('nope', { status: 401, statusText: 'Unauthorized' });

    expect(authService.logout).toHaveBeenCalled();
    expect(errored).toBeTrue();
  });

  it('should queue concurrent requests during a single refresh', () => {
    tokenService.getToken.and.returnValue('old');
    tokenService.getRefreshToken.and.returnValue('refresh');
    const refresh$ = new Subject<AuthResponse>();
    authService.refreshToken.and.returnValue(refresh$.asObservable());

    let firstBody: unknown = null;
    let secondBody: unknown = null;
    http.get(`${API}/a`).subscribe((res) => (firstBody = res));
    http.get(`${API}/b`).subscribe((res) => (secondBody = res));

    // Both initial requests fail with 401; the first starts the refresh, the second waits.
    httpMock.expectOne(`${API}/a`).flush('nope', { status: 401, statusText: 'Unauthorized' });
    httpMock.expectOne(`${API}/b`).flush('nope', { status: 401, statusText: 'Unauthorized' });
    expect(authService.refreshToken).toHaveBeenCalledTimes(1);

    // Complete the single refresh: both queued requests replay with the new token.
    refresh$.next({ accessToken: 'fresh', refreshToken: 'r', tokenType: 'Bearer', user: {} as never });
    refresh$.complete();

    const retriedA = httpMock.expectOne(`${API}/a`);
    const retriedB = httpMock.expectOne(`${API}/b`);
    expect(retriedA.request.headers.get('Authorization')).toBe('Bearer fresh');
    expect(retriedB.request.headers.get('Authorization')).toBe('Bearer fresh');
    retriedA.flush({ a: 1 });
    retriedB.flush({ b: 2 });

    expect(firstBody).toEqual({ a: 1 });
    expect(secondBody).toEqual({ b: 2 });
  });
});
