import { TestBed } from '@angular/core/testing';
import { ActivatedRouteSnapshot, Router, RouterStateSnapshot } from '@angular/router';
import { mesSujetsGuard } from './mes-sujets.guard';
import { AuthService } from '../services/auth.service';

describe('mesSujetsGuard', () => {
  let authService: jasmine.SpyObj<AuthService>;
  let router: jasmine.SpyObj<Router>;

  beforeEach(() => {
    authService = jasmine.createSpyObj<AuthService>('AuthService', ['getRole', 'isAffilieToEquipe']);
    router = jasmine.createSpyObj<Router>('Router', ['parseUrl']);

    TestBed.configureTestingModule({
      providers: [
        { provide: AuthService, useValue: authService },
        { provide: Router, useValue: router },
      ],
    });
  });

  function run(url = '/frontoffice/sujets/mes-sujets'): any {
    const route = {} as ActivatedRouteSnapshot;
    const state = { url } as RouterStateSnapshot;
    return TestBed.runInInjectionContext(() => mesSujetsGuard(route, state));
  }

  it('should allow access for ROLE_CHEF_EQUIPE', () => {
    authService.getRole.and.returnValue('ROLE_CHEF_EQUIPE');
    expect(run()).toBeTrue();
  });

  it('should allow access for ROLE_ENSEIGNANT affiliated to equipe', () => {
    authService.getRole.and.returnValue('ROLE_ENSEIGNANT');
    authService.isAffilieToEquipe.and.returnValue(true);
    expect(run()).toBeTrue();
  });

  it('should redirect ROLE_ENSEIGNANT not affiliated', () => {
    authService.getRole.and.returnValue('ROLE_ENSEIGNANT');
    authService.isAffilieToEquipe.and.returnValue(false);
    router.parseUrl.and.returnValue({} as any);
    run();
    expect(router.parseUrl).toHaveBeenCalledWith('/frontoffice/sujets/disponibles');
  });

  it('should redirect for other roles', () => {
    authService.getRole.and.returnValue('ROLE_ETUDIANT');
    router.parseUrl.and.returnValue({} as any);
    run();
    expect(router.parseUrl).toHaveBeenCalledWith('/frontoffice/sujets/disponibles');
  });

  it('should redirect when role is null', () => {
    authService.getRole.and.returnValue(null);
    router.parseUrl.and.returnValue({} as any);
    run();
    expect(router.parseUrl).toHaveBeenCalledWith('/frontoffice/sujets/disponibles');
  });
});
