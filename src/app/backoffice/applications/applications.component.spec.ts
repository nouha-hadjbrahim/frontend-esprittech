import { TestBed } from '@angular/core/testing';
import { of, throwError } from 'rxjs';
import { ApplicationsComponent } from './applications.component';
import { SujetProjetService } from '../../core/services/sujet-projet.service';
import { CandidatureService } from '../../core/services/candidature.service';

const mockSujet: any = {
  id: 1, titre: 'Sujet IA', categorie: 'STAGE_INGENIEUR',
  statut: 'VALIDE', encadrantId: 10, encadrantNom: 'Dr. Martin',
  domaines: ['IA'], technologies: ['Python'], capaciteAccueil: 2,
  dateCreation: '2026-06-01T00:00:00Z',
};

const mockSujet2: any = { ...mockSujet, id: 2, statut: 'CANDIDATURE_OUVERTE', titre: 'Sujet Web' };

describe('ApplicationsComponent', () => {
  let component: ApplicationsComponent;
  let sujetService: jasmine.SpyObj<SujetProjetService>;
  let candidatureService: jasmine.SpyObj<CandidatureService>;

  beforeEach(() => {
    sujetService = jasmine.createSpyObj('SujetProjetService', ['getSujetsPourCandidatures']);
    candidatureService = jasmine.createSpyObj('CandidatureService', [
      'ouvrirCandidatures', 'fermerCandidatures',
    ]);
    sujetService.getSujetsPourCandidatures.and.returnValue(of([mockSujet, mockSujet2]));

    TestBed.configureTestingModule({
      imports: [ApplicationsComponent],
      providers: [
        { provide: SujetProjetService, useValue: sujetService },
        { provide: CandidatureService, useValue: candidatureService },
      ],
    });
    component = TestBed.createComponent(ApplicationsComponent).componentInstance;
  });

  it('should create', () => expect(component).toBeTruthy());

  // ── loadSujets ────────────────────────────────────────────────────

  it('should load sujets on init', () => {
    component.ngOnInit();
    expect(sujetService.getSujetsPourCandidatures).toHaveBeenCalled();
    expect(component.sujets.length).toBe(2);
    expect(component.isLoading).toBeFalse();
  });

  it('should set errorMessage when loading fails', () => {
    sujetService.getSujetsPourCandidatures.and.returnValue(throwError(() => new Error('Network')));
    component.ngOnInit();
    expect(component.errorMessage).toContain('Impossible de charger');
    expect(component.isLoading).toBeFalse();
  });

  // ── ouvrirCandidatures ────────────────────────────────────────────

  it('ouvrirCandidatures should call service and reload', () => {
    candidatureService.ouvrirCandidatures.and.returnValue(of(undefined));
    sujetService.getSujetsPourCandidatures.and.returnValue(of([]));
    component.ouvrirCandidatures(mockSujet);
    expect(candidatureService.ouvrirCandidatures).toHaveBeenCalledWith(1);
    expect(component.actionLoadingId).toBeNull();
    expect(component.sujets.length).toBe(0);
  });

  it('ouvrirCandidatures should set errorMessage on failure', () => {
    candidatureService.ouvrirCandidatures.and.returnValue(throwError(() => new Error('fail')));
    component.ouvrirCandidatures(mockSujet);
    expect(component.errorMessage).toContain("Impossible d'ouvrir");
    expect(component.actionLoadingId).toBeNull();
  });

  // ── fermerCandidatures ────────────────────────────────────────────

  it('fermerCandidatures should call service and reload', () => {
    candidatureService.fermerCandidatures.and.returnValue(of(undefined));
    sujetService.getSujetsPourCandidatures.and.returnValue(of([]));
    component.fermerCandidatures(mockSujet2);
    expect(candidatureService.fermerCandidatures).toHaveBeenCalledWith(2);
    expect(component.actionLoadingId).toBeNull();
  });

  it('fermerCandidatures should set errorMessage on failure', () => {
    candidatureService.fermerCandidatures.and.returnValue(throwError(() => new Error('fail')));
    component.fermerCandidatures(mockSujet2);
    expect(component.errorMessage).toContain('Impossible de fermer');
    expect(component.actionLoadingId).toBeNull();
  });

  // ── Modal ─────────────────────────────────────────────────────────

  it('openModal should set selectedSujet and open modal', () => {
    component.openModal(mockSujet);
    expect(component.selectedSujet).toEqual(mockSujet);
    expect(component.modalOpen).toBeTrue();
  });

  it('closeModal should close modal and clear selectedSujet', () => {
    component.modalOpen = true;
    component.selectedSujet = mockSujet;
    component.closeModal();
    expect(component.modalOpen).toBeFalse();
    expect(component.selectedSujet).toBeUndefined();
  });

  it('onModalChanged should reload sujets', () => {
    sujetService.getSujetsPourCandidatures.and.returnValue(of([]));
    component.onModalChanged();
    expect(sujetService.getSujetsPourCandidatures).toHaveBeenCalled();
  });
});
