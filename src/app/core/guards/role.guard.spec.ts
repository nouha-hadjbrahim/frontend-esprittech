import { TestBed } from '@angular/core/testing';
import { Router, UrlTree, provideRouter } from '@angular/router';
import { JwtPayload, Role } from '../models/user.model';
import { AuthService } from '../services/auth.service';
import { TokenService } from '../services/token.service';
import { roleGuard } from './role.guard';

describe('roleGuard', () => {
  let tokenService: jasmine.SpyObj<TokenService>;
  let authService: jasmine.SpyObj<AuthService>;
  let router: Router;

  function run(allowed: Role[]): boolean | UrlTree {
    const guard = roleGuard(allowed);
    return TestBed.runInInjectionContext(() => guard({} as never, {} as never)) as boolean | UrlTree;
  }

  beforeEach(() => {
    tokenService = jasmine.createSpyObj<TokenService>('TokenService', ['isTokenExpired', 'decodeToken']);
    authService = jasmine.createSpyObj<AuthService>('AuthService', ['landingRoute']);
    TestBed.configureTestingModule({
      providers: [
        provideRouter([]),
        { provide: TokenService, useValue: tokenService },
        { provide: AuthService, useValue: authService },
      ],
    });
    router = TestBed.inject(Router);
  });

  it('should redirect to /sign-in when the token is expired', () => {
    tokenService.isTokenExpired.and.returnValue(true);
    const result = run(['ROLE_ADMIN']);
    expect(result).toBeInstanceOf(UrlTree);
    expect(router.serializeUrl(result as UrlTree)).toContain('/sign-in');
  });

  it('should allow activation when the role is allowed', () => {
    tokenService.isTokenExpired.and.returnValue(false);
    tokenService.decodeToken.and.returnValue({ role: 'ROLE_ADMIN' } as JwtPayload);
    expect(run(['ROLE_ADMIN', 'ROLE_CI'])).toBeTrue();
  });

  it('should redirect to the landing route when the role is not allowed', () => {
    tokenService.isTokenExpired.and.returnValue(false);
    tokenService.decodeToken.and.returnValue({ role: 'ROLE_ETUDIANT' } as JwtPayload);
    authService.landingRoute.and.returnValue('/frontoffice/sujets-disponibles');
    const result = run(['ROLE_ADMIN']);
    expect(result).toBeInstanceOf(UrlTree);
    expect(router.serializeUrl(result as UrlTree)).toContain('/frontoffice/sujets-disponibles');
  });

  it('should redirect to the landing route when the token has no role claim', () => {
    tokenService.isTokenExpired.and.returnValue(false);
    tokenService.decodeToken.and.returnValue(null);
    authService.landingRoute.and.returnValue('/frontoffice/sujets-disponibles');
    const result = run(['ROLE_ADMIN']);
    expect(result).toBeInstanceOf(UrlTree);
  });
});
