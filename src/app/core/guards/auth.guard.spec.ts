import { TestBed } from '@angular/core/testing';
import { ActivatedRouteSnapshot, Router, RouterStateSnapshot, UrlTree, provideRouter } from '@angular/router';
import { TokenService } from '../services/token.service';
import { authGuard } from './auth.guard';

describe('authGuard', () => {
  let tokenService: jasmine.SpyObj<TokenService>;
  let router: Router;

  function run(url = '/backoffice/users'): boolean | UrlTree {
    const route = {} as ActivatedRouteSnapshot;
    const state = { url } as RouterStateSnapshot;
    return TestBed.runInInjectionContext(() => authGuard(route, state)) as boolean | UrlTree;
  }

  beforeEach(() => {
    tokenService = jasmine.createSpyObj<TokenService>('TokenService', ['isTokenExpired']);
    TestBed.configureTestingModule({
      providers: [
        provideRouter([]),
        { provide: TokenService, useValue: tokenService },
      ],
    });
    router = TestBed.inject(Router);
  });

  it('should allow activation when the token is valid', () => {
    tokenService.isTokenExpired.and.returnValue(false);
    expect(run()).toBeTrue();
  });

  it('should redirect to /sign-in keeping the requested url when the token is expired', () => {
    tokenService.isTokenExpired.and.returnValue(true);
    const result = run('/backoffice/users');
    expect(result).toBeInstanceOf(UrlTree);
    const serialized = router.serializeUrl(result as UrlTree);
    expect(serialized).toContain('/sign-in');
    expect(serialized).toContain('redirect=%2Fbackoffice%2Fusers');
  });
});
