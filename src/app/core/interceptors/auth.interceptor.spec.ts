import { HttpClient, provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { Subject, of, throwError } from 'rxjs';
import { User } from '../models/user.model';
import { AuthService } from '../services/auth.service';
import { authInterceptor } from './auth.interceptor';

const API = 'http://localhost:8080/api';

describe('authInterceptor', () => {
  let http: HttpClient;
  let httpMock: HttpTestingController;
  let authService: jasmine.SpyObj<AuthService>;
  let router: jasmine.SpyObj<Router>;

  beforeEach(() => {
    authService = jasmine.createSpyObj<AuthService>('AuthService', [
      'refreshToken',
      'clearSession',
      'isLoggedIn',
      'accessToken',
    ]);
    authService.isLoggedIn.and.returnValue(true);
    authService.accessToken.and.returnValue('test-token');
    router = jasmine.createSpyObj<Router>('Router', ['navigate']);
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(withInterceptors([authInterceptor])),
        provideHttpClientTesting(),
        { provide: AuthService, useValue: authService },
        { provide: Router, useValue: router },
      ],
    });
    http = TestBed.inject(HttpClient);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpMock.verify());

  it('should send requests with credentials and bearer token when available', () => {
    http.get(`${API}/equipes`).subscribe();
    const req = httpMock.expectOne(`${API}/equipes`);
    expect(req.request.withCredentials).toBeTrue();
    expect(req.request.headers.get('Authorization')).toBe('Bearer test-token');
    req.flush([]);
  });

  it('should propagate non-401 errors without refreshing', () => {
    let status = 0;
    http.get(`${API}/equipes`).subscribe({ error: (e) => (status = e.status) });
    httpMock.expectOne(`${API}/equipes`).flush('boom', { status: 500, statusText: 'Server Error' });
    expect(status).toBe(500);
    expect(authService.refreshToken).not.toHaveBeenCalled();
  });

  it('should propagate a 401 from an auth endpoint without refreshing', () => {
    let errored = false;
    http.post(`${API}/auth/login`, {}).subscribe({ error: () => (errored = true) });
    httpMock.expectOne(`${API}/auth/login`).flush('nope', { status: 401, statusText: 'Unauthorized' });
    expect(errored).toBeTrue();
    expect(authService.refreshToken).not.toHaveBeenCalled();
  });

  it('should refresh on 401 and retry the original request', () => {
    authService.refreshToken.and.returnValue(of({} as User));

    let body: unknown = null;
    http.get(`${API}/equipes`).subscribe((res) => (body = res));
    httpMock.expectOne(`${API}/equipes`).flush('nope', { status: 401, statusText: 'Unauthorized' });

    const retried = httpMock.expectOne(`${API}/equipes`);
    expect(retried.request.withCredentials).toBeTrue();
    retried.flush({ ok: true });

    expect(body).toEqual({ ok: true });
    expect(authService.clearSession).not.toHaveBeenCalled();
  });

  it('should clear the session and redirect when the refresh itself fails', () => {
    authService.refreshToken.and.returnValue(throwError(() => new Error('refresh failed')));

    let errored = false;
    http.get(`${API}/equipes`).subscribe({ error: () => (errored = true) });
    httpMock.expectOne(`${API}/equipes`).flush('nope', { status: 401, statusText: 'Unauthorized' });

    expect(authService.clearSession).toHaveBeenCalled();
    expect(router.navigate).toHaveBeenCalledWith(['/sign-in']);
    expect(errored).toBeTrue();
  });

  it('should queue concurrent requests during a single refresh', () => {
    const refresh$ = new Subject<User>();
    authService.refreshToken.and.returnValue(refresh$.asObservable());

    let firstBody: unknown = null;
    let secondBody: unknown = null;
    http.get(`${API}/a`).subscribe((res) => (firstBody = res));
    http.get(`${API}/b`).subscribe((res) => (secondBody = res));

    // Both initial requests fail with 401; the first starts the refresh, the second waits.
    httpMock.expectOne(`${API}/a`).flush('nope', { status: 401, statusText: 'Unauthorized' });
    httpMock.expectOne(`${API}/b`).flush('nope', { status: 401, statusText: 'Unauthorized' });
    expect(authService.refreshToken).toHaveBeenCalledTimes(1);

    // Complete the single refresh: both queued requests replay.
    refresh$.next({} as User);
    refresh$.complete();

    const retriedA = httpMock.expectOne(`${API}/a`);
    const retriedB = httpMock.expectOne(`${API}/b`);
    retriedA.flush({ a: 1 });
    retriedB.flush({ b: 2 });

    expect(firstBody).toEqual({ a: 1 });
    expect(secondBody).toEqual({ b: 2 });
  });
});
