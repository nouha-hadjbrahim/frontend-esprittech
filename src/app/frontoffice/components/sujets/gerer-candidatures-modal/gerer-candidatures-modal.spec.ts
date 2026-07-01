import { ComponentFixture, TestBed } from '@angular/core/testing';
import { of, throwError } from 'rxjs';
import { SimpleChange } from '@angular/core';
import { GererCandidaturesModal } from './gerer-candidatures-modal';
import { CandidatureService } from '../../../../core/services/candidature.service';

describe('GererCandidaturesModal', () => {
  let component: GererCandidaturesModal;
  let fixture: ComponentFixture<GererCandidaturesModal>;
  let candidatureServiceSpy: jasmine.SpyObj<CandidatureService>;

  const mockSujetValide: any = { id: 1, titre: 'Sujet A', statut: 'VALIDE' };
  const mockSujetOuvert: any = { id: 2, titre: 'Sujet B', statut: 'CANDIDATURE_OUVERTE' };
  const mockSujetRealisation: any = { id: 3, titre: 'Sujet C', statut: 'REALISATION_EN_COURS' };

  const mockCandidature: any = {
    id: 10, sujetId: 2, etudiantId: 5,
    etudiantNom: 'Ben Ali', etudiantPrenom: 'Sami',
    statut: 'DEPOSEE', motifRefus: null,
    messageEtudiant: 'Motivé', dateDepot: new Date().toISOString(), dateDecision: null,
  };

  const mockAffectation: any = {
    id: 20, sujetId: 3, etudiantId: 5,
    etudiantNom: 'Ben Ali', etudiantPrenom: 'Sami',
    statut: 'ACTIVE', dateDebut: new Date().toISOString(),
    dateRetrait: null, motifRetrait: null,
  };

  beforeEach(async () => {
    candidatureServiceSpy = jasmine.createSpyObj('CandidatureService', [
      'getCandidaturesParSujet', 'getAffectationsParSujet',
      'ouvrirCandidatures', 'fermerCandidatures',
      'accepterCandidature', 'refuserCandidature',
      'retirerEtudiant', 'declarerTerminaison',
    ]);

    candidatureServiceSpy.getCandidaturesParSujet.and.returnValue(of([]));
    candidatureServiceSpy.getAffectationsParSujet.and.returnValue(of([]));

    await TestBed.configureTestingModule({
      imports: [GererCandidaturesModal],
      providers: [{ provide: CandidatureService, useValue: candidatureServiceSpy }],
    }).compileComponents();

    fixture = TestBed.createComponent(GererCandidaturesModal);
    component = fixture.componentInstance;
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  // ── canOuvrir / canFermer / canTerminer ────────────────────────────
  it('canOuvrir should be true when statut is VALIDE', () => {
    component.sujet = mockSujetValide;
    expect(component.canOuvrir).toBeTrue();
  });

  it('canOuvrir should be false when statut is CANDIDATURE_OUVERTE', () => {
    component.sujet = mockSujetOuvert;
    expect(component.canOuvrir).toBeFalse();
  });

  it('canFermer should be true when statut is CANDIDATURE_OUVERTE', () => {
    component.sujet = mockSujetOuvert;
    expect(component.canFermer).toBeTrue();
  });

  it('canTerminer should be true when statut is REALISATION_EN_COURS', () => {
    component.sujet = mockSujetRealisation;
    expect(component.canTerminer).toBeTrue();
  });

  it('canTerminer should be false when statut is REALISATION_TERMINEE', () => {
    component.sujet = { ...mockSujetRealisation, statut: 'REALISATION_TERMINEE' };
    expect(component.canTerminer).toBeFalse();
  });

  // ── showCandidatures / showAffectations ───────────────────────────
  it('showCandidatures should be true when statut is CANDIDATURE_OUVERTE', () => {
    component.sujet = mockSujetOuvert;
    expect(component.showCandidatures).toBeTrue();
  });

  it('showCandidatures should be false when statut is VALIDE', () => {
    component.sujet = mockSujetValide;
    expect(component.showCandidatures).toBeFalse();
  });

  it('showAffectations should be true when statut is REALISATION_EN_COURS', () => {
    component.sujet = mockSujetRealisation;
    expect(component.showAffectations).toBeTrue();
  });

  // ── loadData on open ───────────────────────────────────────────────
  it('should load candidatures and affectations when modal opens', () => {
    candidatureServiceSpy.getCandidaturesParSujet.and.returnValue(of([mockCandidature]));
    candidatureServiceSpy.getAffectationsParSujet.and.returnValue(of([mockAffectation]));

    component.sujet = mockSujetOuvert;
    component.isOpen = true;
    component.ngOnChanges({
      isOpen: new SimpleChange(false, true, false),
    });

    expect(candidatureServiceSpy.getCandidaturesParSujet).toHaveBeenCalledWith(2);
    expect(component.candidatures.length).toBe(1);
    expect(component.affectations.length).toBe(1);
  });

  // ── ouvrirCandidatures ────────────────────────────────────────────
  it('ouvrirCandidatures should call service and emit changed', () => {
    candidatureServiceSpy.ouvrirCandidatures.and.returnValue(of(undefined));
    component.sujet = mockSujetValide;
    const changedSpy = jasmine.createSpy('changed');
    component.changed.subscribe(changedSpy);

    component.ouvrirCandidatures();

    expect(candidatureServiceSpy.ouvrirCandidatures).toHaveBeenCalledWith(1);
    expect(changedSpy).toHaveBeenCalled();
  });

  it('ouvrirCandidatures should set error on failure', () => {
    candidatureServiceSpy.ouvrirCandidatures.and.returnValue(
      throwError(() => ({ error: { message: 'Erreur ouverture' } }))
    );
    component.sujet = mockSujetValide;
    component.ouvrirCandidatures();
    expect(component.errorMessage).toBe('Erreur ouverture');
  });

  // ── fermerCandidatures ────────────────────────────────────────────
  it('fermerCandidatures should call service, emit changed and close modal', () => {
    candidatureServiceSpy.fermerCandidatures.and.returnValue(of(undefined));
    component.sujet = mockSujetOuvert;
    const changedSpy = jasmine.createSpy('changed');
    const closedSpy = jasmine.createSpy('closed');
    component.changed.subscribe(changedSpy);
    component.closed.subscribe(closedSpy);

    component.fermerCandidatures();

    expect(candidatureServiceSpy.fermerCandidatures).toHaveBeenCalledWith(2);
    expect(changedSpy).toHaveBeenCalled();
    expect(closedSpy).toHaveBeenCalled();
  });

  // ── accepterCandidature ───────────────────────────────────────────
  it('accepterCandidature should call service with candidature id', () => {
    candidatureServiceSpy.accepterCandidature.and.returnValue(of(mockCandidature));
    component.sujet = mockSujetOuvert;
    const changedSpy = jasmine.createSpy('changed');
    component.changed.subscribe(changedSpy);

    component.accepterCandidature(mockCandidature);

    expect(candidatureServiceSpy.accepterCandidature).toHaveBeenCalledWith(10);
    expect(changedSpy).toHaveBeenCalled();
  });

  // ── motif refus ───────────────────────────────────────────────────
  it('ouvrirMotifRefus should set motifTargetId', () => {
    component.ouvrirMotifRefus(mockCandidature);
    expect(component.motifTargetId).toBe(10);
  });

  it('annulerMotif should reset motif state', () => {
    component.motifTargetId = 10;
    component.motifText = 'test';
    component.annulerMotif();
    expect(component.motifTargetId).toBeNull();
    expect(component.motifText).toBe('');
  });

  it('confirmerMotif should not call service if motifText is empty', () => {
    component.motifTargetId = 10;
    component.motifText = '';
    component.confirmerMotif();
    expect(candidatureServiceSpy.refuserCandidature).not.toHaveBeenCalled();
  });

  it('confirmerMotif should call refuserCandidature', () => {
    candidatureServiceSpy.refuserCandidature.and.returnValue(of(mockCandidature));
    component.motifTargetId = 10;
    component.motifText = 'Profil insuffisant';
    component.confirmerMotif();
    expect(candidatureServiceSpy.refuserCandidature).toHaveBeenCalledWith(10, 'Profil insuffisant');
  });

  it('demandesCandidatures should only include DEPOSEE candidatures', () => {
    component.candidatures = [
      mockCandidature,
      { ...mockCandidature, id: 11, statut: 'ACCEPTEE' },
      { ...mockCandidature, id: 12, statut: 'REFUSEE' },
    ];
    expect(component.demandesCandidatures.length).toBe(1);
    expect(component.demandesCandidatures[0].statut).toBe('DEPOSEE');
  });

  // ── affectationsActives / Archivees ──────────────────────────────
  it('affectationsActives should filter ACTIVE affectations', () => {
    component.affectations = [
      mockAffectation,
      { ...mockAffectation, id: 21, statut: 'RETIREE_ARCHIVEE' },
    ];
    expect(component.affectationsActives.length).toBe(1);
    expect(component.affectationsActives[0].statut).toBe('ACTIVE');
  });

  it('affectationsArchivees should filter RETIREE_ARCHIVEE affectations', () => {
    component.affectations = [
      mockAffectation,
      { ...mockAffectation, id: 21, statut: 'RETIREE_ARCHIVEE' },
    ];
    expect(component.affectationsArchivees.length).toBe(1);
    expect(component.affectationsArchivees[0].statut).toBe('RETIREE_ARCHIVEE');
  });

  // ── declarerTerminaison ───────────────────────────────────────────
  it('declarerTerminaison should call service and emit changed', () => {
    candidatureServiceSpy.declarerTerminaison.and.returnValue(of(undefined));
    component.sujet = mockSujetRealisation;
    const changedSpy = jasmine.createSpy('changed');
    component.changed.subscribe(changedSpy);

    component.declarerTerminaison();

    expect(candidatureServiceSpy.declarerTerminaison).toHaveBeenCalledWith(3);
    expect(changedSpy).toHaveBeenCalled();
  });

  // ── close ─────────────────────────────────────────────────────────
  it('close should emit closed event', () => {
    const closedSpy = jasmine.createSpy('closed');
    component.closed.subscribe(closedSpy);
    component.close();
    expect(closedSpy).toHaveBeenCalled();
  });
});
