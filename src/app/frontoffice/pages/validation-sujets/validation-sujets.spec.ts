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
      'getSujetsAValider', 'validerSujet', 'invaliderSujet',
    ]);
    sujetService.getSujetsAValider.and.returnValue(of([mockSujet]));

    TestBed.configureTestingModule({
      imports: [ValidationSujets],
      providers: [{ provide: SujetProjetService, useValue: sujetService }],
    });
    component = TestBed.createComponent(ValidationSujets).componentInstance;
  });

  it('should create', () => expect(component).toBeTruthy());

  it('should load sujets on init', () => {
    component.ngOnInit();
    expect(sujetService.getSujetsAValider).toHaveBeenCalled();
    expect(component.sujets.length).toBe(1);
    expect(component.filteredSujets.length).toBe(1);
    expect(component.isLoading).toBeFalse();
  });

  it('should set loadError when loading fails', () => {
    sujetService.getSujetsAValider.and.returnValue(throwError(() => new Error('Network')));
    component.ngOnInit();
    expect(component.loadError).toContain('Impossible de charger');
    expect(component.isLoading).toBeFalse();
  });

  it('confirmValidate should call validerSujet and reload', () => {
    sujetService.validerSujet.and.returnValue(of({ ...mockSujet, statut: 'CANDIDATURE_OUVERTE' }));
    sujetService.getSujetsAValider.and.returnValue(of([]));
    component.openValidateConfirm(mockSujet);
    component.confirmValidate();
    expect(sujetService.validerSujet).toHaveBeenCalledWith(1);
    expect(component.actionLoading).toBeFalse();
    expect(component.validateConfirmOpen).toBeFalse();
    expect(component.sujets.length).toBe(0);
  });

  it('confirmValidate should open alert on failure', () => {
    sujetService.validerSujet.and.returnValue(throwError(() => ({})));
    component.openValidateConfirm(mockSujet);
    component.confirmValidate();
    expect(component.actionAlertOpen).toBeTrue();
    expect(component.actionAlertMessage).toContain('Impossible de valider');
    expect(component.actionLoading).toBeFalse();
  });

  it('openRejectDialog should set rejectDialogOpen and clear rejectMotif', () => {
    component.rejectMotif = 'old text';
    component.openRejectDialog(mockSujet);
    expect(component.rejectDialogOpen).toBeTrue();
    expect(component.sujetEnCours?.id).toBe(1);
    expect(component.rejectMotif).toBe('');
  });

  it('cancelReject should clear reject state', () => {
    component.openRejectDialog(mockSujet);
    component.rejectMotif = 'raison';
    component.cancelReject();
    expect(component.rejectDialogOpen).toBeFalse();
    expect(component.sujetEnCours).toBeUndefined();
    expect(component.rejectMotif).toBe('');
  });

  it('confirmReject should do nothing when sujetEnCours is undefined', () => {
    component.confirmReject();
    expect(sujetService.invaliderSujet).not.toHaveBeenCalled();
  });

  it('confirmReject should set rejectError when motif is blank', () => {
    component.openRejectDialog(mockSujet);
    component.rejectMotif = '   ';
    component.confirmReject();
    expect(sujetService.invaliderSujet).not.toHaveBeenCalled();
    expect(component.rejectError).toContain('motif');
  });

  it('confirmReject should call invaliderSujet and reload on success', () => {
    sujetService.invaliderSujet.and.returnValue(of({ ...mockSujet, statut: 'INVALIDE' }));
    sujetService.getSujetsAValider.and.returnValue(of([]));
    component.openRejectDialog(mockSujet);
    component.rejectMotif = 'Hors périmètre';
    component.confirmReject();
    expect(sujetService.invaliderSujet).toHaveBeenCalledWith(1, 'Hors périmètre');
    expect(component.rejectDialogOpen).toBeFalse();
    expect(component.sujets.length).toBe(0);
  });

  it('confirmReject should open alert on failure', () => {
    sujetService.invaliderSujet.and.returnValue(throwError(() => ({})));
    component.openRejectDialog(mockSujet);
    component.rejectMotif = 'Raison';
    component.confirmReject();
    expect(component.actionAlertOpen).toBeTrue();
    expect(component.actionAlertMessage).toContain('Impossible de refuser');
    expect(component.actionLoading).toBeFalse();
  });
});
