import { TestBed } from '@angular/core/testing';
import { Router, UrlTree, provideRouter } from '@angular/router';
import { AuthService } from '../services/auth.service';
import { equipeAffiliationGuard } from './equipe-affiliation.guard';

describe('equipeAffiliationGuard', () => {
  let authService: jasmine.SpyObj<AuthService>;
  let router: Router;

  function run(): boolean | UrlTree {
    return TestBed.runInInjectionContext(() => equipeAffiliationGuard({} as never, {} as never)) as boolean | UrlTree;
  }

  beforeEach(() => {
    authService = jasmine.createSpyObj<AuthService>('AuthService', ['isAffilieToEquipe']);
    TestBed.configureTestingModule({
      providers: [
        provideRouter([]),
        { provide: AuthService, useValue: authService },
      ],
    });
    router = TestBed.inject(Router);
  });

  it('should allow activation when the teacher is affiliated to a team', () => {
    authService.isAffilieToEquipe.and.returnValue(true);
    expect(run()).toBeTrue();
  });

  it('should redirect to available subjects when not affiliated', () => {
    authService.isAffilieToEquipe.and.returnValue(false);
    const result = run();
    expect(result).toBeInstanceOf(UrlTree);
    expect(router.serializeUrl(result as UrlTree)).toContain('/frontoffice/sujets/disponibles');
  });
});
