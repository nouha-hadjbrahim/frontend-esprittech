import { TestBed } from '@angular/core/testing';
import { Router, UrlTree, provideRouter } from '@angular/router';
import { Role } from '../models/user.model';
import { AuthService } from '../services/auth.service';
import { roleGuard } from './role.guard';

describe('roleGuard', () => {
  let authService: jasmine.SpyObj<AuthService>;
  let router: Router;

  function run(allowed: Role[]): boolean | UrlTree {
    const guard = roleGuard(allowed);
    return TestBed.runInInjectionContext(() => guard({} as never, {} as never)) as boolean | UrlTree;
  }

  beforeEach(() => {
    authService = jasmine.createSpyObj<AuthService>('AuthService', ['getRole', 'landingRoute']);
    TestBed.configureTestingModule({
      providers: [
        provideRouter([]),
        { provide: AuthService, useValue: authService },
      ],
    });
    router = TestBed.inject(Router);
  });

  it('should redirect to /sign-in when no user is authenticated', () => {
    authService.getRole.and.returnValue(null);
    const result = run(['ROLE_ADMIN']);
    expect(result).toBeInstanceOf(UrlTree);
    expect(router.serializeUrl(result as UrlTree)).toContain('/sign-in');
  });

  it('should allow activation when the role is allowed', () => {
    authService.getRole.and.returnValue('ROLE_ADMIN');
    expect(run(['ROLE_ADMIN', 'ROLE_CI'])).toBeTrue();
  });

  it('should redirect to the landing route when the role is not allowed', () => {
    authService.getRole.and.returnValue('ROLE_ETUDIANT');
    authService.landingRoute.and.returnValue('/frontoffice/sujets-disponibles');
    const result = run(['ROLE_ADMIN']);
    expect(result).toBeInstanceOf(UrlTree);
    expect(router.serializeUrl(result as UrlTree)).toContain('/frontoffice/sujets-disponibles');
  });
});
