import { TestBed } from '@angular/core/testing';
import { ActivatedRouteSnapshot, Router, RouterStateSnapshot, UrlTree, provideRouter } from '@angular/router';
import { AuthService } from '../services/auth.service';
import { authGuard } from './auth.guard';

describe('authGuard', () => {
  let authService: jasmine.SpyObj<AuthService>;
  let router: Router;

  function run(url = '/backoffice/users'): boolean | UrlTree {
    const route = {} as ActivatedRouteSnapshot;
    const state = { url } as RouterStateSnapshot;
    return TestBed.runInInjectionContext(() => authGuard(route, state)) as boolean | UrlTree;
  }

  beforeEach(() => {
    authService = jasmine.createSpyObj<AuthService>('AuthService', ['isAuthenticated']);
    TestBed.configureTestingModule({
      providers: [
        provideRouter([]),
        { provide: AuthService, useValue: authService },
      ],
    });
    router = TestBed.inject(Router);
  });

  it('should allow activation when a user is authenticated', () => {
    authService.isAuthenticated.and.returnValue(true);
    expect(run()).toBeTrue();
  });

  it('should redirect to /sign-in keeping the requested url when not authenticated', () => {
    authService.isAuthenticated.and.returnValue(false);
    const result = run('/backoffice/users');
    expect(result).toBeInstanceOf(UrlTree);
    const serialized = router.serializeUrl(result as UrlTree);
    expect(serialized).toContain('/sign-in');
    expect(serialized).toContain('redirect=%2Fbackoffice%2Fusers');
  });
});
