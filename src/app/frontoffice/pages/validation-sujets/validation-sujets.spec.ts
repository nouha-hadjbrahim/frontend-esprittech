import { TestBed } from '@angular/core/testing';
import { of, throwError } from 'rxjs';
import { ValidationSujets } from './validation-sujets';
import { SujetProjetService } from '../../../core/services/sujet-projet.service';

const mockSujet: any = {
  id: 1, titre: 'Sujet IA', categorie: 'STAGE_INGENIEUR',
  statut: 'SOUMIS_EN_VALIDATION', encadrantId: 10, encadrantNom: 'Dr. Martin',
  domaines: ['IA'], technologies: ['Python'], capaciteAccueil: 2,
  dateCreation: '2026-06-01T00:00:00Z', dateSoumission: '2026-06-02T00:00:00Z',
};

describe('ValidationSujets', () => {
  let component: ValidationSujets;
  let sujetService: jasmine.SpyObj<SujetProjetService>;

  beforeEach(() => {
    sujetService = jasmine.createSpyObj('SujetProjetService', [
      'getSujetsEnAttenteValidation', 'validerSujet', 'invaliderSujet',
    ]);
    sujetService.getSujetsEnAttenteValidation.and.returnValue(of([mockSujet]));

    TestBed.configureTestingModule({
      imports: [ValidationSujets],
      providers: [{ provide: SujetProjetService, useValue: sujetService }],
    });
    component = TestBed.createComponent(ValidationSujets).componentInstance;
  });

  it('should create', () => expect(component).toBeTruthy());

  // ── loadSujets ────────────────────────────────────────────────────

  it('should load sujets on init', () => {
    component.ngOnInit();
    expect(sujetService.getSujetsEnAttenteValidation).toHaveBeenCalled();
    expect(component.sujets.length).toBe(1);
    expect(component.isLoading).toBeFalse();
  });

  it('should set errorMessage when loading fails', () => {
    sujetService.getSujetsEnAttenteValidation.and.returnValue(throwError(() => new Error('Network')));
    component.ngOnInit();
    expect(component.errorMessage).toContain('Impossible de charger');
    expect(component.isLoading).toBeFalse();
  });

  // ── valider ───────────────────────────────────────────────────────

  it('valider should call validerSujet and reload', () => {
    sujetService.validerSujet.and.returnValue(of({ ...mockSujet, statut: 'VALIDE' }));
    sujetService.getSujetsEnAttenteValidation.and.returnValue(of([]));
    component.valider(mockSujet);
    expect(sujetService.validerSujet).toHaveBeenCalledWith(1);
    expect(component.actionLoadingId).toBeNull();
    expect(component.sujets.length).toBe(0);
  });

  it('valider should set errorMessage on failure', () => {
    sujetService.validerSujet.and.returnValue(
      throwError(() => ({ error: { message: 'Non autorisé' } }))
    );
    component.valider(mockSujet);
    expect(component.errorMessage).toBe('Non autorisé');
    expect(component.actionLoadingId).toBeNull();
  });

  it('valider should use fallback error message when no message in error', () => {
    sujetService.validerSujet.and.returnValue(throwError(() => ({})));
    component.valider(mockSujet);
    expect(component.errorMessage).toBe('Impossible de valider ce sujet.');
  });

  // ── motif invalidation ────────────────────────────────────────────

  it('ouvrirMotifInvalidation should set motifTargetId and clear motifText', () => {
    component.motifText = 'old text';
    component.ouvrirMotifInvalidation(mockSujet);
    expect(component.motifTargetId).toBe(1);
    expect(component.motifText).toBe('');
  });

  it('annulerMotif should clear motif state', () => {
    component.motifTargetId = 1;
    component.motifText = 'raison';
    component.annulerMotif();
    expect(component.motifTargetId).toBeNull();
    expect(component.motifText).toBe('');
  });

  it('confirmerInvalidation should do nothing when motifTargetId is null', () => {
    component.motifTargetId = null;
    component.motifText = 'raison';
    component.confirmerInvalidation();
    expect(sujetService.invaliderSujet).not.toHaveBeenCalled();
  });

  it('confirmerInvalidation should do nothing when motifText is blank', () => {
    component.motifTargetId = 1;
    component.motifText = '   ';
    component.confirmerInvalidation();
    expect(sujetService.invaliderSujet).not.toHaveBeenCalled();
  });

  it('confirmerInvalidation should call invaliderSujet and reload on success', () => {
    sujetService.invaliderSujet.and.returnValue(of({ ...mockSujet, statut: 'INVALIDE' }));
    sujetService.getSujetsEnAttenteValidation.and.returnValue(of([]));
    component.motifTargetId = 1;
    component.motifText = 'Hors périmètre';
    component.confirmerInvalidation();
    expect(sujetService.invaliderSujet).toHaveBeenCalledWith(1, 'Hors périmètre');
    expect(component.motifTargetId).toBeNull();
    expect(component.sujets.length).toBe(0);
  });

  it('confirmerInvalidation should set errorMessage on failure', () => {
    sujetService.invaliderSujet.and.returnValue(
      throwError(() => ({ error: { message: 'Erreur backend' } }))
    );
    component.motifTargetId = 1;
    component.motifText = 'Raison';
    component.confirmerInvalidation();
    expect(component.errorMessage).toBe('Erreur backend');
    expect(component.actionLoadingId).toBeNull();
  });

  it('confirmerInvalidation should use fallback error message', () => {
    sujetService.invaliderSujet.and.returnValue(throwError(() => ({})));
    component.motifTargetId = 1;
    component.motifText = 'Raison';
    component.confirmerInvalidation();
    expect(component.errorMessage).toContain("Impossible d'invalider");
  });
});
