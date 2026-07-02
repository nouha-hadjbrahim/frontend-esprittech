import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { SujetCard } from './sujet-card';
import { SujetProjet } from '../../../../core/models/sujet-projet.model';

describe('SujetCard', () => {
  let component: SujetCard;
  let fixture: ComponentFixture<SujetCard>;

  const mockSujet: SujetProjet = {
    id: 1,
    titre: 'Système IA',
    categorie: 'STAGE_INGENIEUR' as any,
    description: 'Description test',
    objectifs: 'Objectifs test',
    prerequis: ['Python'],
    domaines: ['Intelligence Artificielle'],
    technologies: ['Python', 'TensorFlow'],
    capaciteAccueil: 2,
    statut: 'CANDIDATURE_OUVERTE' as any,
    scoreFinal: null,
    eligibleIndustrialisation: false,
    catalogue: true,
    encadrantId: 10,
    encadrantNom: 'Dr. Sami',
    dateCreation: new Date().toISOString(),
    dateSoumission: new Date().toISOString(),
    dateValidation: null,
    dateDebutRealisation: null,
    dateTerminaison: null,
    motifInvalidation: null,
  } as any;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [SujetCard],
      providers: [provideRouter([])],
    }).compileComponents();

    fixture = TestBed.createComponent(SujetCard);
    component = fixture.componentInstance;
    component.sujet = mockSujet;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  // ── domainesLabel ─────────────────────────────────────────────────
  it('domainesLabel should join domaines with comma', () => {
    component.sujet = { ...mockSujet, domaines: ['IA', 'Data Science'] } as any;
    expect(component.domainesLabel).toBe('IA, Data Science');
  });

  it('domainesLabel should return — when domaines is empty', () => {
    component.sujet = { ...mockSujet, domaines: [] } as any;
    expect(component.domainesLabel).toBe('—');
  });

  // ── showCandidaturesAction ────────────────────────────────────────
  it('showCandidaturesAction should be true for VALIDE', () => {
    component.sujet = { ...mockSujet, statut: 'VALIDE' } as any;
    expect(component.showCandidaturesAction).toBeTrue();
  });

  it('showCandidaturesAction should be true for CANDIDATURE_OUVERTE', () => {
    expect(component.showCandidaturesAction).toBeTrue();
  });

  it('showCandidaturesAction should be false for REALISATION_EN_COURS', () => {
    component.sujet = { ...mockSujet, statut: 'REALISATION_EN_COURS' } as any;
    expect(component.showCandidaturesAction).toBeFalse();
  });

  it('showCandidaturesAction should be false for SOUMIS_EN_VALIDATION', () => {
    component.sujet = { ...mockSujet, statut: 'SOUMIS_EN_VALIDATION' } as any;
    expect(component.showCandidaturesAction).toBeFalse();
  });

  it('showCandidaturesAction should be false for INVALIDE', () => {
    component.sujet = { ...mockSujet, statut: 'INVALIDE' } as any;
    expect(component.showCandidaturesAction).toBeFalse();
  });

  // ── Output events ─────────────────────────────────────────────────
  it('onEditClick should emit edit event', () => {
    const editSpy = jasmine.createSpy('edit');
    component.edit.subscribe(editSpy);
    component.onEditClick(new Event('click'));
    expect(editSpy).toHaveBeenCalled();
  });

  it('onDeleteClick should emit delete event', () => {
    const deleteSpy = jasmine.createSpy('delete');
    component.delete.subscribe(deleteSpy);
    component.onDeleteClick(new Event('click'));
    expect(deleteSpy).toHaveBeenCalled();
  });

  it('onGererCandidaturesClick should emit gererCandidatures event', () => {
    const gererSpy = jasmine.createSpy('gererCandidatures');
    component.gererCandidatures.subscribe(gererSpy);
    component.onGererCandidaturesClick();
    expect(gererSpy).toHaveBeenCalled();
  });

  it('onPostulerClick should emit postuler event', () => {
    const postulerSpy = jasmine.createSpy('postuler');
    component.postuler.subscribe(postulerSpy);
    component.onPostulerClick();
    expect(postulerSpy).toHaveBeenCalled();
  });

  // ── detailsOnly / dejaPostule inputs ─────────────────────────────
  it('detailsOnly should default to false', () => {
    expect(component.detailsOnly).toBeFalse();
  });

  it('dejaPostule should default to false', () => {
    expect(component.dejaPostule).toBeFalse();
  });

  it('isOwner should default to false', () => {
    expect(component.isOwner).toBeFalse();
  });
});
