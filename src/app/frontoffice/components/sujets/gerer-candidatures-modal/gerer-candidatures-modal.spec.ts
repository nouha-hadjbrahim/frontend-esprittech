import { ComponentFixture, TestBed } from '@angular/core/testing';
import { of, throwError } from 'rxjs';
import { SimpleChange } from '@angular/core';
import { GererCandidaturesModal } from './gerer-candidatures-modal';
import { CandidatureService } from '../../../../core/services/candidature.service';

describe('GererCandidaturesModal', () => {
  let component: GererCandidaturesModal;
  let fixture: ComponentFixture<GererCandidaturesModal>;
  let candidatureServiceSpy: jasmine.SpyObj<CandidatureService>;

  const mockSujetValide: any = { id: 1, titre: 'Sujet A', statut: 'VALIDE', capaciteAccueil: 3 };
  const mockSujetOuvert: any = { id: 2, titre: 'Sujet B', statut: 'CANDIDATURE_OUVERTE', capaciteAccueil: 3 };
  const mockSujetRealisation: any = { id: 3, titre: 'Sujet C', statut: 'REALISATION_EN_COURS', capaciteAccueil: 3 };

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

  // ── canOuvrir / canFermer / canTerminer / canRetirerMembre / isTermine ──
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

  it('canFermer should be false for other statuts', () => {
    component.sujet = mockSujetValide;
    expect(component.canFermer).toBeFalse();
  });

  it('canTerminer should be true when statut is REALISATION_EN_COURS', () => {
    component.sujet = mockSujetRealisation;
    expect(component.canTerminer).toBeTrue();
  });

  it('canTerminer should be false when statut is REALISATION_TERMINEE', () => {
    component.sujet = { ...mockSujetRealisation, statut: 'REALISATION_TERMINEE' };
    expect(component.canTerminer).toBeFalse();
  });

  it('canRetirerMembre should be true when REALISATION_EN_COURS', () => {
    component.sujet = mockSujetRealisation;
    expect(component.canRetirerMembre).toBeTrue();
  });

  it('canRetirerMembre should be false when CANDIDATURE_OUVERTE', () => {
    component.sujet = mockSujetOuvert;
    expect(component.canRetirerMembre).toBeFalse();
  });

  it('isTermine should be true when REALISATION_TERMINEE', () => {
    component.sujet = { ...mockSujetRealisation, statut: 'REALISATION_TERMINEE' };
    expect(component.isTermine).toBeTrue();
  });

  it('isTermine should be false otherwise', () => {
    component.sujet = mockSujetRealisation;
    expect(component.isTermine).toBeFalse();
  });

  // ── canTraiterDemandes / showCandidatures ─────────────────────────
  it('canTraiterDemandes should be true when CANDIDATURE_OUVERTE', () => {
    component.sujet = mockSujetOuvert;
    expect(component.canTraiterDemandes).toBeTrue();
  });

  it('showCandidatures should be true when statut is CANDIDATURE_OUVERTE', () => {
    component.sujet = mockSujetOuvert;
    expect(component.showCandidatures).toBeTrue();
  });

  it('showCandidatures should be false when statut is VALIDE', () => {
    component.sujet = mockSujetValide;
    expect(component.showCandidatures).toBeFalse();
  });

  // ── showAffectations ─────────────────────────────────────────────
  it('showAffectations should be true when REALISATION_EN_COURS', () => {
    component.sujet = mockSujetRealisation;
    expect(component.showAffectations).toBeTrue();
  });

  it('showAffectations should be true when CANDIDATURE_OUVERTE', () => {
    component.sujet = mockSujetOuvert;
    expect(component.showAffectations).toBeTrue();
  });

  it('showAffectations should be true when REALISATION_TERMINEE', () => {
    component.sujet = { ...mockSujetRealisation, statut: 'REALISATION_TERMINEE' };
    expect(component.showAffectations).toBeTrue();
  });

  it('showAffectations should be true when affectations exist even with other statut', () => {
    component.sujet = mockSujetValide;
    component.affectations = [mockAffectation];
    expect(component.showAffectations).toBeTrue();
  });

  it('showAffectations should be false when VALIDE and no affectations', () => {
    component.sujet = mockSujetValide;
    component.affectations = [];
    expect(component.showAffectations).toBeFalse();
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

  it('should handle candidatures load error', () => {
    candidatureServiceSpy.getCandidaturesParSujet.and.returnValue(
      throwError(() => new Error('fail'))
    );
    candidatureServiceSpy.getAffectationsParSujet.and.returnValue(of([]));

    component.sujet = mockSujetOuvert;
    component.isOpen = true;
    component.ngOnChanges({
      isOpen: new SimpleChange(false, true, false),
    });

    expect(component.candidatures).toEqual([]);
  });

  it('should handle affectations load error', () => {
    candidatureServiceSpy.getCandidaturesParSujet.and.returnValue(of([]));
    candidatureServiceSpy.getAffectationsParSujet.and.returnValue(
      throwError(() => new Error('fail'))
    );

    component.sujet = mockSujetOuvert;
    component.isOpen = true;
    component.ngOnChanges({
      isOpen: new SimpleChange(false, true, false),
    });

    expect(component.affectations).toEqual([]);
    expect(component.isLoading).toBeFalse();
  });

  // ── close when isOpen=false resets state ───────────────────────────
  it('should reset state when isOpen changes to false', () => {
    component.candidatures = [mockCandidature];
    component.affectations = [mockAffectation];
    component.errorMessage = 'some error';
    component.motifTargetId = 99;
    component.motifText = 'text';

    component.isOpen = false;
    component.ngOnChanges({
      isOpen: new SimpleChange(true, false, false),
    });

    expect(component.candidatures).toEqual([]);
    expect(component.affectations).toEqual([]);
    expect(component.errorMessage).toBe('');
    expect(component.motifTargetId).toBeNull();
    expect(component.motifText).toBe('');
  });

  it('should not load data when isOpen is already true and no change', () => {
    component.sujet = mockSujetOuvert;
    component.isOpen = true;
    component.ngOnChanges({});
    expect(candidatureServiceSpy.getCandidaturesParSujet).not.toHaveBeenCalled();
  });

  it('should not load when isOpen becomes true but sujet is undefined', () => {
    component.sujet = undefined;
    component.isOpen = true;
    component.ngOnChanges({
      isOpen: new SimpleChange(false, true, false),
    });
    expect(candidatureServiceSpy.getCandidaturesParSujet).not.toHaveBeenCalled();
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
    expect(component.actionLoading).toBeFalse();
  });

  it('ouvrirCandidatures should not run when sujet is undefined', () => {
    component.sujet = undefined;
    component.ouvrirCandidatures();
    expect(candidatureServiceSpy.ouvrirCandidatures).not.toHaveBeenCalled();
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

  it('fermerCandidatures should set error on failure', () => {
    candidatureServiceSpy.fermerCandidatures.and.returnValue(
      throwError(() => ({ error: { detail: 'Erreur fermeture' } }))
    );
    component.sujet = mockSujetOuvert;
    component.fermerCandidatures();
    expect(component.errorMessage).toBe('Erreur fermeture');
  });

  it('fermerCandidatures should not run when sujet is undefined', () => {
    component.sujet = undefined;
    component.fermerCandidatures();
    expect(candidatureServiceSpy.fermerCandidatures).not.toHaveBeenCalled();
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

  it('accepterCandidature should set error on failure', () => {
    candidatureServiceSpy.accepterCandidature.and.returnValue(
      throwError(() => ({ error: { message: 'Erreur acceptation' } }))
    );
    component.sujet = mockSujetOuvert;

    component.accepterCandidature(mockCandidature);

    expect(component.errorMessage).toBe('Erreur acceptation');
    expect(component.actionLoading).toBeFalse();
  });

  it('accepterCandidature should use fallback error message', () => {
    candidatureServiceSpy.accepterCandidature.and.returnValue(
      throwError(() => new Error('unknown'))
    );
    component.sujet = mockSujetOuvert;

    component.accepterCandidature(mockCandidature);

    expect(component.errorMessage).toBe("Impossible d'accepter cette candidature.");
  });

  // ── motif refus ───────────────────────────────────────────────────
  it('ouvrirMotifRefus should set motifTargetId', () => {
    component.ouvrirMotifRefus(mockCandidature);
    expect(component.motifTargetId).toBe(10);
    expect(component.motifText).toBe('');
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

  it('confirmerMotif should not call service if motifText is whitespace only', () => {
    component.motifTargetId = 10;
    component.motifText = '   ';
    component.confirmerMotif();
    expect(candidatureServiceSpy.refuserCandidature).not.toHaveBeenCalled();
  });

  it('confirmerMotif should not call service if motifTargetId is null', () => {
    component.motifTargetId = null;
    component.motifText = 'reason';
    component.confirmerMotif();
    expect(candidatureServiceSpy.refuserCandidature).not.toHaveBeenCalled();
  });

  it('confirmerMotif should call refuserCandidature on success', () => {
    candidatureServiceSpy.refuserCandidature.and.returnValue(of(mockCandidature));
    component.motifTargetId = 10;
    component.motifText = 'Profil insuffisant';
    const changedSpy = jasmine.createSpy('changed');
    component.changed.subscribe(changedSpy);

    component.confirmerMotif();

    expect(candidatureServiceSpy.refuserCandidature).toHaveBeenCalledWith(10, 'Profil insuffisant');
    expect(component.motifTargetId).toBeNull();
    expect(changedSpy).toHaveBeenCalled();
  });

  it('confirmerMotif should set error on failure', () => {
    candidatureServiceSpy.refuserCandidature.and.returnValue(
      throwError(() => ({ error: { message: 'Erreur refus' } }))
    );
    component.motifTargetId = 10;
    component.motifText = 'Reason';

    component.confirmerMotif();

    expect(component.errorMessage).toBe('Erreur refus');
    expect(component.actionLoading).toBeFalse();
  });

  it('confirmerMotif should use fallback error message', () => {
    candidatureServiceSpy.refuserCandidature.and.returnValue(
      throwError(() => new Error('unknown'))
    );
    component.motifTargetId = 10;
    component.motifText = 'Reason';

    component.confirmerMotif();

    expect(component.errorMessage).toBe('Impossible de refuser cette candidature.');
  });

  // ── demandesCandidatures ──────────────────────────────────────────
  it('demandesCandidatures should only include DEPOSEE candidatures', () => {
    component.candidatures = [
      mockCandidature,
      { ...mockCandidature, id: 11, statut: 'ACCEPTEE' },
      { ...mockCandidature, id: 12, statut: 'REFUSEE' },
    ];
    expect(component.demandesCandidatures.length).toBe(1);
    expect(component.demandesCandidatures[0].statut).toBe('DEPOSEE');
  });

  // ── metaLabel ────────────────────────────────────────────────────
  it('metaLabel should format correctly', () => {
    component.candidatures = [mockCandidature, { ...mockCandidature, id: 11 }];
    component.affectations = [mockAffectation];
    component.sujet = mockSujetRealisation;
    expect(component.metaLabel).toBe('2 candidats · 1/3 places');
  });

  it('metaLabel should handle singular forms', () => {
    component.candidatures = [mockCandidature];
    component.affectations = [];
    component.sujet = { ...mockSujetRealisation, capaciteAccueil: 1 };
    expect(component.metaLabel).toBe('1 candidat · 0/1 place');
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

  it('declarerTerminaison should set error on failure', () => {
    candidatureServiceSpy.declarerTerminaison.and.returnValue(
      throwError(() => ({ error: { message: 'Erreur terminaison' } }))
    );
    component.sujet = mockSujetRealisation;

    component.declarerTerminaison();

    expect(component.errorMessage).toBe('Erreur terminaison');
  });

  it('declarerTerminaison should use fallback error', () => {
    candidatureServiceSpy.declarerTerminaison.and.returnValue(
      throwError(() => new Error('unknown'))
    );
    component.sujet = mockSujetRealisation;

    component.declarerTerminaison();

    expect(component.errorMessage).toBe('Impossible de déclarer la terminaison.');
  });

  it('declarerTerminaison should not run when sujet is undefined', () => {
    component.sujet = undefined;
    component.declarerTerminaison();
    expect(candidatureServiceSpy.declarerTerminaison).not.toHaveBeenCalled();
  });

  // ── ouvrirMotifRetrait / confirmerRetrait ─────────────────────────
  it('ouvrirMotifRetrait should set motifTargetId', () => {
    component.ouvrirMotifRetrait(mockAffectation);
    expect(component.motifTargetId).toBe(20);
    expect(component.motifText).toBe('');
  });

  it('confirmerRetrait should not call service if motifText is empty', () => {
    component.motifTargetId = 20;
    component.motifText = '';
    component.confirmerRetrait();
    expect(candidatureServiceSpy.retirerEtudiant).not.toHaveBeenCalled();
  });

  it('confirmerRetrait should not call service if motifTargetId is null', () => {
    component.motifTargetId = null;
    component.motifText = 'reason';
    component.confirmerRetrait();
    expect(candidatureServiceSpy.retirerEtudiant).not.toHaveBeenCalled();
  });

  it('confirmerRetrait should call retirerEtudiant on success', () => {
    candidatureServiceSpy.retirerEtudiant.and.returnValue(of(mockAffectation));
    component.motifTargetId = 20;
    component.motifText = 'Abandon';
    const changedSpy = jasmine.createSpy('changed');
    component.changed.subscribe(changedSpy);

    component.confirmerRetrait();

    expect(candidatureServiceSpy.retirerEtudiant).toHaveBeenCalledWith(20, 'Abandon');
    expect(component.motifTargetId).toBeNull();
    expect(changedSpy).toHaveBeenCalled();
  });

  it('confirmerRetrait should set error on failure', () => {
    candidatureServiceSpy.retirerEtudiant.and.returnValue(
      throwError(() => ({ error: { message: 'Erreur retrait' } }))
    );
    component.motifTargetId = 20;
    component.motifText = 'Reason';

    component.confirmerRetrait();

    expect(component.errorMessage).toBe('Erreur retrait');
    expect(component.actionLoading).toBeFalse();
  });

  it('confirmerRetrait should use fallback error message', () => {
    candidatureServiceSpy.retirerEtudiant.and.returnValue(
      throwError(() => new Error('unknown'))
    );
    component.motifTargetId = 20;
    component.motifText = 'Reason';

    component.confirmerRetrait();

    expect(component.errorMessage).toBe('Une erreur est survenue.');
  });

  // ── onOverlayClick ───────────────────────────────────────────────
  it('onOverlayClick should close when target has gcm-overlay class', () => {
    const spy = spyOn(component, 'close');
    const event = {
      target: { classList: { contains: (cls: string) => cls === 'gcm-overlay' } },
    } as unknown as MouseEvent;
    component.onOverlayClick(event);
    expect(spy).toHaveBeenCalled();
  });

  it('onOverlayClick should not close when target does not have gcm-overlay class', () => {
    const spy = spyOn(component, 'close');
    const event = {
      target: { classList: { contains: () => false } },
    } as unknown as MouseEvent;
    component.onOverlayClick(event);
    expect(spy).not.toHaveBeenCalled();
  });

  // ── getInitials / getInitialsFromName ─────────────────────────────
  it('getInitials should return initials from candidature', () => {
    expect(component.getInitials(mockCandidature)).toBe('SB');
  });

  it('getInitialsFromName should return ? when both are empty', () => {
    expect(component.getInitialsFromName(null, null)).toBe('?');
  });

  it('getInitialsFromName should handle empty strings', () => {
    expect(component.getInitialsFromName('', '')).toBe('?');
  });

  it('getInitialsFromName should handle only prenom', () => {
    expect(component.getInitialsFromName('Sami', null)).toBe('S');
  });

  it('getInitialsFromName should handle only nom', () => {
    expect(component.getInitialsFromName(null, 'Ali')).toBe('A');
  });

  // ── close ─────────────────────────────────────────────────────────
  it('close should emit closed event', () => {
    const closedSpy = jasmine.createSpy('closed');
    component.closed.subscribe(closedSpy);
    component.close();
    expect(closedSpy).toHaveBeenCalled();
  });
});
