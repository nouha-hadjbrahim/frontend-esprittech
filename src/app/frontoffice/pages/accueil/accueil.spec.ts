import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { of, throwError } from 'rxjs';
import { AccueilService } from '../../../core/services/accueil.service';
import { AuthService } from '../../../core/services/auth.service';
import { Accueil } from './accueil';

describe('Accueil', () => {
  let component: Accueil;
  let fixture: ComponentFixture<Accueil>;
  let accueilService: jasmine.SpyObj<AccueilService>;
  let authService: jasmine.SpyObj<AuthService>;

  beforeEach(async () => {
    accueilService = jasmine.createSpyObj<AccueilService>('AccueilService', ['getStats']);
    authService = jasmine.createSpyObj<AuthService>('AuthService', ['getRole', 'isAffilieToEquipe']);
    accueilService.getStats.and.returnValue(of({
      projetsActifs: 10,
      etudiants: 50,
      encadrants: 20,
      equipesRdi: 5,
      industrialises: 3,
    }));

    await TestBed.configureTestingModule({
      imports: [Accueil],
      providers: [
        provideRouter([]),
        { provide: AccueilService, useValue: accueilService },
        { provide: AuthService, useValue: authService },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(Accueil);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create and load stats', () => {
    expect(component).toBeTruthy();
    expect(accueilService.getStats).toHaveBeenCalled();
    expect(component.stats()?.projetsActifs).toBe(10);
  });

  it('should format stat with and without plus', () => {
    expect(component.formatStat(5, true)).toBe('5+');
    expect(component.formatStat(5, false)).toBe('5');
    expect(component.formatStat(null, true)).toBe('—');
    expect(component.formatStat(undefined, false)).toBe('—');
  });

  it('should return showUnivers based on role', () => {
    authService.getRole.and.returnValue('ROLE_ETUDIANT');
    expect(component.showUnivers).toBeFalse();
    authService.getRole.and.returnValue('ROLE_ENSEIGNANT');
    expect(component.showUnivers).toBeTrue();
    authService.getRole.and.returnValue('ROLE_ADMIN');
    expect(component.showUnivers).toBeTrue();
  });

  it('should return exploreLink based on role', () => {
    authService.getRole.and.returnValue('ROLE_ENSEIGNANT');
    expect(component.exploreLink).toBe('/frontoffice/catalogue');
    authService.getRole.and.returnValue('ROLE_CHEF_EQUIPE');
    expect(component.exploreLink).toBe('/frontoffice/catalogue');
    authService.getRole.and.returnValue('ROLE_CI');
    expect(component.exploreLink).toBe('/frontoffice/catalogue');
    authService.getRole.and.returnValue('ROLE_ETUDIANT');
    expect(component.exploreLink).toBe('/frontoffice/sujets/disponibles');
  });

  it('should return universCards for chef equippe', () => {
    authService.getRole.and.returnValue('ROLE_CHEF_EQUIPE');
    authService.isAffilieToEquipe.and.returnValue(true);
    const cards = component.universCards;
    expect(cards.length).toBe(3);
    expect(cards[0].link).toBe('/frontoffice/equipes-recherche/mon-equipe');
    expect(cards[1].link).toBe('/frontoffice/sujets/mes-sujets');
  });

  it('should return universCards for enseignant not affiliated', () => {
    authService.getRole.and.returnValue('ROLE_ENSEIGNANT');
    authService.isAffilieToEquipe.and.returnValue(false);
    const cards = component.universCards;
    expect(cards[0].link).toBe('/frontoffice/equipes-recherche/equipes');
    expect(cards[1].link).toBe('/frontoffice/sujets/disponibles');
    expect(cards[2].link).toBe('/frontoffice/demandes-industrialisation');
  });

  it('should return universCards for CI role', () => {
    authService.getRole.and.returnValue('ROLE_CI');
    const cards = component.universCards;
    expect(cards[2].link).toBe('/ci/industrialisation');
  });

  it('should return universCards for etudiant affiliated', () => {
    authService.getRole.and.returnValue('ROLE_ETUDIANT');
    authService.isAffilieToEquipe.and.returnValue(true);
    const cards = component.universCards;
    expect(cards[1].link).toBe('/frontoffice/sujets/mes-sujets');
  });

  it('should have partners and pourquoiFeatures', () => {
    expect(component.partners.length).toBeGreaterThan(0);
    expect(component.pourquoiFeatures.length).toBe(4);
  });

  it('should call scrollDown and scrollTo', () => {
    spyOn(component, 'scrollTo');
    authService.getRole.and.returnValue('ROLE_ENSEIGNANT');
    component.scrollDown();
    expect(component.scrollTo).toHaveBeenCalledWith('univers');

    authService.getRole.and.returnValue('ROLE_ETUDIANT');
    component.scrollDown();
    expect(component.scrollTo).toHaveBeenCalledWith('pourquoi');
  });

  it('should handle getStats error', () => {
    accueilService.getStats.and.returnValue(throwError(() => new Error('fail')));
    fixture = TestBed.createComponent(Accueil);
    component = fixture.componentInstance;
    fixture.detectChanges();
    expect(component.stats()).toBeNull();
  });
});
