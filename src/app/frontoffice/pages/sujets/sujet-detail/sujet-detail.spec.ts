import { TestBed, fakeAsync, tick, discardPeriodicTasks } from '@angular/core/testing';
import { ActivatedRoute } from '@angular/router';
import { of, throwError } from 'rxjs';

import { SujetDetail } from './sujet-detail';
import { ReponseEliminatoire } from '../../../../core/models/critere.model';
import { AuthService } from '../../../../core/services/auth.service';
import { CandidatureService } from '../../../../core/services/candidature.service';
import { EvaluationService } from '../../../../core/services/evaluation.service';
import { HistoriqueService } from '../../../../core/services/historique.service';
import { IndustrialisationService } from '../../../../core/services/industrialisation.service';
import { LivrableService } from '../../../../core/services/livrable.service';
import { SujetProjetService } from '../../../../core/services/sujet-projet.service';

/**
 * NOTE ON TYPES: the model interfaces (SujetProjet, Candidature, Affectation,
 * HistoriqueEntry, Livrable, EvaluationResponse, IndustrialisationFormResponse, ...)
 * were not available at the time this spec was written, so fixtures are built as
 * loosely-typed objects (`any`) containing every field the component reads.
 * Adjust the `as any` casts if your real interfaces are stricter.
 */

describe('SujetDetail', () => {
  let component: SujetDetail;

  let routeMock: any;
  let authMock: any;
  let sujetProjetServiceMock: any;
  let evaluationServiceMock: any;
  let livrableServiceMock: any;
  let industrialisationServiceMock: any;
  let candidatureServiceMock: any;
  let historiqueServiceMock: any;

  const baseSujet: any = {
    id: 1,
    titre: 'Plateforme Web Innovante',
    encadrantId: 10,
    encadrantNom: 'Jean Dupont',
    equipeNom: 'EquipeA',
    technologies: ['Angular', 'Java', 'Docker', 'Kubernetes', 'Redis'],
    objectifs: 'Objectif un\nObjectif deux\n\n',
    capaciteAccueil: 5,
    nombreMembresActifs: 2,
    statut: 'REALISATION_EN_COURS',
    categorie: 'WEB',
    dateDebutRealisation: '2026-01-01T00:00:00Z',
    dateSoumission: '2025-12-01T00:00:00Z',
    dateCreation: '2025-11-01T00:00:00Z',
    dateTerminaison: '2026-03-01T00:00:00Z',
    domaines: ['IA', 'Cloud'],
    scoreFinal: null,
    eligibleIndustrialisation: false,
    hasEliminatoryWarnings: false,
  };

  function freshSujet(overrides: Partial<typeof baseSujet> = {}) {
    return { ...baseSujet, ...overrides };
  }

  function setRole(role: string) {
    authMock.getRole.and.returnValue(role);
  }

  function configureTestBed() {
    TestBed.configureTestingModule({
      providers: [
        { provide: ActivatedRoute, useValue: routeMock },
        { provide: AuthService, useValue: authMock },
        { provide: SujetProjetService, useValue: sujetProjetServiceMock },
        { provide: EvaluationService, useValue: evaluationServiceMock },
        { provide: LivrableService, useValue: livrableServiceMock },
        { provide: IndustrialisationService, useValue: industrialisationServiceMock },
        { provide: CandidatureService, useValue: candidatureServiceMock },
        { provide: HistoriqueService, useValue: historiqueServiceMock },
      ],
    });
  }

  function createComponent(): SujetDetail {
    configureTestBed();
    return TestBed.runInInjectionContext(() => new SujetDetail());
  }

  beforeEach(() => {
    routeMock = {
      snapshot: { paramMap: { get: jasmine.createSpy('get').and.returnValue('1') } },
    };

    authMock = jasmine.createSpyObj('AuthService', ['getRole', 'currentUser', 'equipeNom']);
    authMock.getRole.and.returnValue('ROLE_ENSEIGNANT');
    authMock.currentUser.and.returnValue({ id: 10 });
    authMock.equipeNom.and.returnValue('EquipeA');

    sujetProjetServiceMock = jasmine.createSpyObj('SujetProjetService', [
      'getSujetById',
      'declarerTerminaison',
    ]);
    sujetProjetServiceMock.getSujetById.and.returnValue(of(freshSujet()));
    sujetProjetServiceMock.declarerTerminaison.and.returnValue(of(freshSujet({ statut: 'REALISATION_TERMINEE' })));

    evaluationServiceMock = jasmine.createSpyObj('EvaluationService', [
      'getLatestEvaluation',
      'calculateScore',
    ]);
    evaluationServiceMock.getLatestEvaluation.and.returnValue(of(null));
    evaluationServiceMock.calculateScore.and.returnValue(
      of({
        scoreFinal: 80,
        eligibleIndustrialisation: true,
        hasEliminatoryWarnings: false,
        processingStatus: 'DONE',
        eligibilityStatus: 'OK',
        commentaire: '',
      }),
    );

    livrableServiceMock = jasmine.createSpyObj('LivrableService', [
      'findByProjet',
      'upload',
      'addLink',
      'delete',
      'downloadUrl',
    ]);
    livrableServiceMock.findByProjet.and.returnValue(of([]));
    livrableServiceMock.upload.and.returnValue(of({}));
    livrableServiceMock.addLink.and.returnValue(of({}));
    livrableServiceMock.delete.and.returnValue(of({}));
    livrableServiceMock.downloadUrl.and.returnValue('http://api/livrables/1/download');

    industrialisationServiceMock = jasmine.createSpyObj('IndustrialisationService', [
      'create',
      'getFormulaire',
      'saveReponses',
      'uploadPreuve',
      'soumettre',
    ]);

    candidatureServiceMock = jasmine.createSpyObj('CandidatureService', [
      'getCandidaturesParSujet',
      'getAffectationsParSujet',
      'retirerEtudiant',
    ]);
    candidatureServiceMock.getCandidaturesParSujet.and.returnValue(of([]));
    candidatureServiceMock.getAffectationsParSujet.and.returnValue(of([]));
    candidatureServiceMock.retirerEtudiant.and.returnValue(of({}));

    historiqueServiceMock = jasmine.createSpyObj('HistoriqueService', ['getBySujet']);
    historiqueServiceMock.getBySujet.and.returnValue(of([]));

    component = createComponent();
  });

  afterEach(() => {
    component.ngOnDestroy();
  });

  // ---------------------------------------------------------------------
  // ngOnInit / loadSujet
  // ---------------------------------------------------------------------
  describe('ngOnInit / loadSujet', () => {
    it('loads the sujet, membres, livrables and evaluation for a staff viewer', () => {
      component.ngOnInit();
      expect(sujetProjetServiceMock.getSujetById).toHaveBeenCalledWith(1);
      expect(component.sujet).toEqual(freshSujet());
      expect(component.isLoading).toBeFalse();
      expect(candidatureServiceMock.getAffectationsParSujet).toHaveBeenCalledWith(1);
      expect(livrableServiceMock.findByProjet).toHaveBeenCalledWith(1);
      expect(evaluationServiceMock.getLatestEvaluation).toHaveBeenCalledWith(1);
    });

    it('does not load livrables/evaluation for a non-staff viewer', () => {
      setRole('ROLE_ETUDIANT');
      authMock.currentUser.and.returnValue({ id: 999 });
      component.ngOnInit();
      expect(livrableServiceMock.findByProjet).not.toHaveBeenCalled();
      expect(evaluationServiceMock.getLatestEvaluation).not.toHaveBeenCalled();
    });

    it('resets the active tab if it is no longer allowed', () => {
      setRole('ROLE_ETUDIANT');
      authMock.currentUser.and.returnValue({ id: 999 });
      component.activeTab = 'Historique';
      component.ngOnInit();
      expect(component.activeTab).toBe('Informations');
    });

    it('sets error state when loading fails', () => {
      sujetProjetServiceMock.getSujetById.and.returnValue(throwError(() => new Error('boom')));
      component.ngOnInit();
      expect(component.error).toBeTrue();
      expect(component.isLoading).toBeFalse();
    });
  });

  // ---------------------------------------------------------------------
  // Role / permission getters
  // ---------------------------------------------------------------------
  describe('role based getters', () => {
    it('isEtudiant / isEnseignant / isChefEquipe reflect the current role', () => {
      setRole('ROLE_ETUDIANT');
      expect(component.isEtudiant).toBeTrue();
      expect(component.isEnseignant).toBeFalse();
      expect(component.isChefEquipe).toBeFalse();

      setRole('ROLE_ENSEIGNANT');
      expect(component.isEnseignant).toBeTrue();

      setRole('ROLE_CHEF_EQUIPE');
      expect(component.isChefEquipe).toBeTrue();
    });

    it('isChefOfSujetEquipe is false without a chef role or sujet', () => {
      expect(component.isChefOfSujetEquipe).toBeFalse();
      setRole('ROLE_CHEF_EQUIPE');
      expect(component.isChefOfSujetEquipe).toBeFalse(); // no sujet loaded yet
    });

    it('isChefOfSujetEquipe compares the chef equipe with the sujet equipe', () => {
      setRole('ROLE_CHEF_EQUIPE');
      component.sujet = freshSujet({ equipeNom: 'EquipeA' });
      authMock.equipeNom.and.returnValue('EquipeA');
      expect(component.isChefOfSujetEquipe).toBeTrue();

      authMock.equipeNom.and.returnValue('EquipeB');
      expect(component.isChefOfSujetEquipe).toBeFalse();

      authMock.equipeNom.and.returnValue(null);
      expect(component.isChefOfSujetEquipe).toBeFalse();
    });

    it('isOwner compares encadrantId with the current user id', () => {
      component.sujet = freshSujet({ encadrantId: 10 });
      authMock.currentUser.and.returnValue({ id: 10 });
      expect(component.isOwner).toBeTrue();

      authMock.currentUser.and.returnValue({ id: 11 });
      expect(component.isOwner).toBeFalse();

      authMock.currentUser.and.returnValue(null);
      expect(component.isOwner).toBeFalse();

      component.sujet = null;
      authMock.currentUser.and.returnValue({ id: 10 });
      expect(component.isOwner).toBeFalse();
    });

    it('canViewStaffSections / canManageCandidatures / canViewHistorique are owner or chef equipe', () => {
      component.sujet = freshSujet();
      authMock.currentUser.and.returnValue({ id: 10 });
      expect(component.canViewStaffSections).toBeTrue();
      expect(component.canManageCandidatures).toBeTrue();
      expect(component.canViewHistorique).toBeTrue();

      authMock.currentUser.and.returnValue({ id: 999 });
      setRole('ROLE_ETUDIANT');
      expect(component.canViewStaffSections).toBeFalse();
    });
  });

  // ---------------------------------------------------------------------
  // tabs
  // ---------------------------------------------------------------------
  describe('tabs', () => {
    it('only shows Informations/Membres for non staff viewers', () => {
      setRole('ROLE_ETUDIANT');
      authMock.currentUser.and.returnValue({ id: 999 });
      component.sujet = freshSujet();
      expect(component.tabs.map((t) => t.label)).toEqual(['Informations', 'Membres']);
    });

    it('adds staff tabs for owners', () => {
      component.sujet = freshSujet();
      authMock.currentUser.and.returnValue({ id: 10 });
      expect(component.tabs.map((t) => t.label)).toEqual([
        'Informations',
        'Membres',
        'Candidatures',
        'Livrables',
        'Historique',
      ]);
    });
  });

  // ---------------------------------------------------------------------
  // back link / label
  // ---------------------------------------------------------------------
  describe('backLink / backLabel', () => {
    it('returns the teacher link', () => {
      setRole('ROLE_ENSEIGNANT');
      expect(component.backLink).toBe('/frontoffice/sujets/mes-sujets');
      expect(component.backLabel).toBe('Retour à mes sujets');
    });

    it('returns the owning chef link', () => {
      setRole('ROLE_CHEF_EQUIPE');
      component.sujet = freshSujet({ encadrantId: 10 });
      authMock.currentUser.and.returnValue({ id: 10 });
      expect(component.backLink).toBe('/frontoffice/sujets/mes-sujets');
      expect(component.backLabel).toBe('Retour à mes sujets');
    });

    it('returns the non-owning chef link', () => {
      setRole('ROLE_CHEF_EQUIPE');
      component.sujet = freshSujet({ encadrantId: 10 });
      authMock.currentUser.and.returnValue({ id: 999 });
      expect(component.backLink).toBe('/frontoffice/validation-sujets');
      expect(component.backLabel).toBe('Retour à la validation');
    });

    it('returns the student link by default', () => {
      setRole('ROLE_ETUDIANT');
      expect(component.backLink).toBe('/frontoffice/sujets/disponibles');
      expect(component.backLabel).toBe('Retour aux sujets disponibles');
    });
  });

  // ---------------------------------------------------------------------
  // capacity / display getters
  // ---------------------------------------------------------------------
  describe('capacity and display getters', () => {
    it('computes nombreMembres from sujet or fallback to membres length', () => {
      component.sujet = freshSujet({ nombreMembresActifs: 3 });
      expect(component.nombreMembres).toBe(3);

      component.sujet = freshSujet({ nombreMembresActifs: undefined });
      component.membres = [{}, {}] as any;
      expect(component.nombreMembres).toBe(2);
    });

    it('capacitePourcentage handles missing capacity and clamps to 100', () => {
      component.sujet = null;
      expect(component.capacitePourcentage).toBe(0);

      component.sujet = freshSujet({ capaciteAccueil: 0, nombreMembresActifs: 2 });
      expect(component.capacitePourcentage).toBe(0);

      component.sujet = freshSujet({ capaciteAccueil: 2, nombreMembresActifs: 5 });
      expect(component.capacitePourcentage).toBe(100);
    });

    it('placesRestantes / capaciteEstComplete', () => {
      component.sujet = null;
      expect(component.placesRestantes).toBe(0);
      expect(component.capaciteEstComplete).toBeFalse();

      component.sujet = freshSujet({ capaciteAccueil: 5, nombreMembresActifs: 5 });
      expect(component.placesRestantes).toBe(0);
      expect(component.capaciteEstComplete).toBeTrue();

      component.sujet = freshSujet({ capaciteAccueil: 5, nombreMembresActifs: 2 });
      expect(component.placesRestantes).toBe(3);
      expect(component.capaciteEstComplete).toBeFalse();
    });

    it('categorieLabel / statutLabel / statutClass fall back to raw values when unmapped', () => {
      component.sujet = null;
      expect(component.categorieLabel).toBe('');
      expect(component.statutLabel).toBe('');
      expect(component.statutClass).toBe('badge--neutral');

      component.sujet = freshSujet({ categorie: 'INCONNU', statut: 'INCONNU' });
      expect(component.categorieLabel).toBe('INCONNU');
      expect(component.statutLabel).toBe('INCONNU');
      expect(component.statutClass).toBe('badge--neutral');
    });

    it('techColors cycles through the palette', () => {
      component.sujet = freshSujet({ technologies: ['a', 'b', 'c', 'd', 'e'] });
      expect(component.techColors).toEqual([
        'tag--green',
        'tag--purple',
        'tag--yellow',
        'tag--teal',
        'tag--green',
      ]);
      component.sujet = null;
      expect(component.techColors).toEqual([]);
    });

    it('objectifLines splits on newline and filters blanks, falling back to raw text', () => {
      component.sujet = null;
      expect(component.objectifLines).toEqual([]);

      component.sujet = freshSujet({ objectifs: 'A\n\nB\n' });
      expect(component.objectifLines).toEqual(['A', 'B']);

      component.sujet = freshSujet({ objectifs: '' });
      expect(component.objectifLines).toEqual(['']);
    });

    it('keywordTags takes the first 4 technologies', () => {
      component.sujet = freshSujet({ technologies: ['a', 'b', 'c', 'd', 'e'] });
      expect(component.keywordTags).toEqual(['a', 'b', 'c', 'd']);
      component.sujet = null;
      expect(component.keywordTags).toEqual([]);
    });

    it('encadrantInitials handles no name, one word and multiple words', () => {
      component.sujet = freshSujet({ encadrantNom: '' });
      expect(component.encadrantInitials).toBe('?');

      component.sujet = freshSujet({ encadrantNom: 'Madonna' });
      expect(component.encadrantInitials).toBe('MA');

      component.sujet = freshSujet({ encadrantNom: 'Jean Paul Dupont' });
      expect(component.encadrantInitials).toBe('JD');
    });

    it('periodeLabel / periodeStartLabel / periodeEndLabel', () => {
      component.sujet = null;
      expect(component.periodeLabel).toBe('—');
      expect(component.periodeStartLabel).toBe('—');
      expect(component.periodeEndLabel).toBe('…');

      component.sujet = freshSujet({
        dateDebutRealisation: '',
        dateSoumission: '',
        dateCreation: '',
        dateTerminaison: '',
      });
      expect(component.periodeLabel).toBe('—');

      component.sujet = freshSujet({
        dateDebutRealisation: '2026-01-01T00:00:00Z',
        dateTerminaison: '',
      });
      expect(component.periodeLabel).toBe('2026-01-01 → …');
      expect(component.periodeEndLabel).toBe('…');

      component.sujet = freshSujet({
        dateDebutRealisation: '2026-01-01T00:00:00Z',
        dateTerminaison: '2026-03-01T00:00:00Z',
      });
      expect(component.periodeLabel).toBe('2026-01-01 → 2026-03-01');
      expect(component.periodeStartLabel).toBe('2026-01-01');
      expect(component.periodeEndLabel).toBe('2026-03-01');
    });

    it('dureeLabel / dureeHeuresLabel require both a start and an end date', () => {
      component.sujet = null;
      expect(component.dureeLabel).toBe('—');
      expect(component.dureeHeuresLabel).toBe('');

      component.sujet = freshSujet({ dateDebutRealisation: '2026-01-01T00:00:00Z', dateTerminaison: '' });
      expect(component.dureeLabel).toBe('—');
      expect(component.dureeHeuresLabel).toBe('');

      component.sujet = freshSujet({
        dateDebutRealisation: '2026-01-01T00:00:00Z',
        dateTerminaison: '2026-01-08T00:00:00Z',
      });
      expect(component.dureeLabel).toBe('1 semaine');
      expect(component.dureeHeuresLabel).toBe('= 168 heures');

      component.sujet = freshSujet({
        dateDebutRealisation: '2026-01-01T00:00:00Z',
        dateTerminaison: '2026-01-22T00:00:00Z',
      });
      expect(component.dureeLabel).toBe('3 semaines');
    });

    it('domaineLabel joins non-empty domaines or falls back to a dash', () => {
      component.sujet = freshSujet({ domaines: ['IA', '', 'Cloud'] });
      expect(component.domaineLabel).toBe('IA, Cloud');

      component.sujet = freshSujet({ domaines: [] });
      expect(component.domaineLabel).toBe('—');

      component.sujet = freshSujet({ domaines: undefined });
      expect(component.domaineLabel).toBe('—');
    });

    it('titleMain / titleAccent split the last word of the title', () => {
      component.sujet = freshSujet({ titre: 'Plateforme Web Innovante' });
      expect(component.titleMain).toBe('Plateforme Web');
      expect(component.titleAccent).toBe('Innovante');

      component.sujet = freshSujet({ titre: 'SoloTitle' });
      expect(component.titleMain).toBe('SoloTitle');
      expect(component.titleAccent).toBe('');

      component.sujet = null;
      expect(component.titleMain).toBe('');
      expect(component.titleAccent).toBe('');
    });

    it('capaciteHint reports remaining places or full capacity', () => {
      component.sujet = null;
      expect(component.capaciteHint).toBe('');

      component.sujet = freshSujet({ capaciteAccueil: 2, nombreMembresActifs: 2 });
      expect(component.capaciteHint).toBe('Capacité complète.');

      component.sujet = freshSujet({ capaciteAccueil: 5, nombreMembresActifs: 1 });
      expect(component.capaciteHint).toBe('4 places encore disponibles.');

      component.sujet = freshSujet({ capaciteAccueil: 2, nombreMembresActifs: 1 });
      expect(component.capaciteHint).toBe('1 place encore disponible.');
    });
  });

  // ---------------------------------------------------------------------
  // canManageLivrables / canRecalculateScore / canRetirerMembre / canDeclarerTerminaison
  // ---------------------------------------------------------------------
  describe('action permission getters', () => {
    it('canManageLivrables requires ownership and an in-progress/finished statut', () => {
      component.sujet = freshSujet({ statut: 'REALISATION_EN_COURS' });
      authMock.currentUser.and.returnValue({ id: 10 });
      expect(component.canManageLivrables).toBeTrue();

      component.sujet = freshSujet({ statut: 'NOUVEAU' });
      expect(component.canManageLivrables).toBeFalse();

      authMock.currentUser.and.returnValue({ id: 999 });
      component.sujet = freshSujet({ statut: 'REALISATION_EN_COURS' });
      expect(component.canManageLivrables).toBeFalse();
    });

    it('canRequestIndustrialisation is always false', () => {
      expect(component.canRequestIndustrialisation).toBeFalse();
    });

    it('canRecalculateScore requires ownership and REALISATION_TERMINEE', () => {
      authMock.currentUser.and.returnValue({ id: 10 });
      component.sujet = freshSujet({ statut: 'REALISATION_TERMINEE' });
      expect(component.canRecalculateScore).toBeTrue();

      component.sujet = freshSujet({ statut: 'REALISATION_EN_COURS' });
      expect(component.canRecalculateScore).toBeFalse();
    });

    it('canRetirerMembre requires owner + REALISATION_EN_COURS + enseignant/chef role', () => {
      authMock.currentUser.and.returnValue({ id: 10 });
      setRole('ROLE_ENSEIGNANT');
      component.sujet = freshSujet({ statut: 'REALISATION_EN_COURS' });
      expect(component.canRetirerMembre).toBeTrue();

      component.sujet = freshSujet({ statut: 'NOUVEAU' });
      expect(component.canRetirerMembre).toBeFalse();

      component.sujet = null;
      expect(component.canRetirerMembre).toBeFalse();

      component.sujet = freshSujet({ statut: 'REALISATION_EN_COURS' });
      authMock.currentUser.and.returnValue({ id: 999 });
      expect(component.canRetirerMembre).toBeFalse();

      authMock.currentUser.and.returnValue({ id: 10 });
      setRole('ROLE_ETUDIANT');
      expect(component.canRetirerMembre).toBeFalse();
    });

    it('canDeclarerTerminaison requires ownership and REALISATION_EN_COURS', () => {
      component.sujet = null;
      expect(component.canDeclarerTerminaison).toBeFalse();

      authMock.currentUser.and.returnValue({ id: 10 });
      component.sujet = freshSujet({ statut: 'REALISATION_EN_COURS' });
      expect(component.canDeclarerTerminaison).toBeTrue();

      component.sujet = freshSujet({ statut: 'NOUVEAU' });
      expect(component.canDeclarerTerminaison).toBeFalse();
    });
  });

  // ---------------------------------------------------------------------
  // Terminaison flow (cover image + confirmation)
  // ---------------------------------------------------------------------
  describe('terminaison flow', () => {
    beforeEach(() => {
      authMock.currentUser.and.returnValue({ id: 10 });
      component.sujet = freshSujet({ statut: 'REALISATION_EN_COURS' });
    });

    it('ouvrirTerminaisonConfirm resets state and opens the modal', () => {
      component.terminaisonError = 'x';
      component.terminaisonCoverError = 'y';
      component.terminaisonCoverPreview = 'z';
      component.terminaisonCoverBase64 = 'z';
      component.terminaisonCoverContentType = 'image/png';
      component.ouvrirTerminaisonConfirm();
      expect(component.terminaisonConfirmOpen).toBeTrue();
      expect(component.terminaisonError).toBe('');
      expect(component.terminaisonCoverError).toBe('');
      expect(component.terminaisonCoverPreview).toBeNull();
      expect(component.terminaisonCoverBase64).toBeNull();
      expect(component.terminaisonCoverContentType).toBeNull();
    });

    it('annulerTerminaison resets all terminaison state', () => {
      component.terminaisonConfirmOpen = true;
      component.terminaisonLoading = true;
      component.terminaisonError = 'x';
      component.terminaisonCoverError = 'y';
      component.terminaisonCoverPreview = 'z';
      component.terminaisonCoverBase64 = 'z';
      component.terminaisonCoverContentType = 'image/png';
      component.annulerTerminaison();
      expect(component.terminaisonConfirmOpen).toBeFalse();
      expect(component.terminaisonLoading).toBeFalse();
      expect(component.terminaisonError).toBe('');
      expect(component.terminaisonCoverPreview).toBeNull();
    });

    it('terminaisonConfirmMessage mentions the sujet title, empty when no sujet', () => {
      expect(component.terminaisonConfirmMessage).toContain('Plateforme Web Innovante');
      component.sujet = null;
      expect(component.terminaisonConfirmMessage).toBe('');
    });

    it('confirmerTerminaison sends no cover payload when none was prepared, then recalculates the score', () => {
      spyOn(component, 'recalculateScore');
      component.confirmerTerminaison();
      expect(sujetProjetServiceMock.declarerTerminaison).toHaveBeenCalledWith(1, {});
      expect(component.terminaisonLoading).toBeFalse();
      expect(component.terminaisonConfirmOpen).toBeFalse();
      expect(component.sujet.statut).toBe('REALISATION_TERMINEE');
      expect(component.recalculateScore).toHaveBeenCalled();
    });

    it('confirmerTerminaison sends the prepared cover payload', () => {
      spyOn(component, 'recalculateScore');
      component.terminaisonCoverBase64 = 'BASE64DATA';
      component.terminaisonCoverContentType = 'image/jpeg';
      component.confirmerTerminaison();
      expect(sujetProjetServiceMock.declarerTerminaison).toHaveBeenCalledWith(1, {
        coverImageBase64: 'BASE64DATA',
        coverImageContentType: 'image/jpeg',
      });
    });

    it('confirmerTerminaison does nothing without a loaded sujet', () => {
      component.sujet = null;
      component.confirmerTerminaison();
      expect(sujetProjetServiceMock.declarerTerminaison).not.toHaveBeenCalled();
    });

    it('confirmerTerminaison surfaces API errors', () => {
      sujetProjetServiceMock.declarerTerminaison.and.returnValue(
        throwError(() => ({ error: { detail: 'Erreur serveur' } })),
      );
      component.confirmerTerminaison();
      expect(component.terminaisonLoading).toBeFalse();
      expect(component.terminaisonError).toBe('Erreur serveur');
    });

    it('confirmerTerminaison falls back to a generic message error', () => {
      sujetProjetServiceMock.declarerTerminaison.and.returnValue(throwError(() => ({})));
      component.confirmerTerminaison();
      expect(component.terminaisonError).toBe('Impossible de déclarer la terminaison.');
    });

    it('removeTerminaisonCover clears the cover state', () => {
      component.terminaisonCoverPreview = 'x';
      component.terminaisonCoverBase64 = 'x';
      component.terminaisonCoverContentType = 'image/png';
      component.terminaisonCoverError = 'err';
      component.removeTerminaisonCover();
      expect(component.terminaisonCoverPreview).toBeNull();
      expect(component.terminaisonCoverBase64).toBeNull();
      expect(component.terminaisonCoverContentType).toBeNull();
      expect(component.terminaisonCoverError).toBe('');
    });

    describe('onTerminaisonCoverSelected validation', () => {
      function makeEvent(file: File | undefined) {
        const input = document.createElement('input');
        input.type = 'file';
        if (file) {
          Object.defineProperty(input, 'files', { value: [file] });
        } else {
          Object.defineProperty(input, 'files', { value: [] });
        }
        return { target: input } as unknown as Event;
      }

      it('does nothing when no file was selected', () => {
        component.onTerminaisonCoverSelected(makeEvent(undefined));
        expect(component.terminaisonCoverError).toBe('');
        expect(component.terminaisonCoverBase64).toBeNull();
      });

      it('rejects an unsupported file type/extension', () => {
        const file = new File(['data'], 'doc.pdf', { type: 'application/pdf' });
        component.onTerminaisonCoverSelected(makeEvent(file));
        expect(component.terminaisonCoverError).toContain('Format non autorisé');
      });

      it('rejects an oversized file', () => {
        const big = new Uint8Array(21 * 1024 * 1024);
        const file = new File([big], 'photo.png', { type: 'image/png' });
        component.onTerminaisonCoverSelected(makeEvent(file));
        expect(component.terminaisonCoverError).toContain('trop volumineuse');
      });

      it('accepts a valid image and compresses it via canvas', (done) => {
        // Stub FileReader to synchronously resolve with a data URI.
        const fakeReader: any = {
          onload: null,
          onerror: null,
          readAsDataURL(_file: File) {
            setTimeout(() => {
              (fakeReader as any).result = 'data:image/png;base64,AAAA';
              fakeReader.onload && fakeReader.onload();
            }, 0);
          },
        };
        spyOn(window as any, 'FileReader').and.returnValue(fakeReader);

        // Stub Image so it "loads" immediately with a fixed size.
        class FakeImage {
          width = 3000;
          height = 1500;
          onload: (() => void) | null = null;
          onerror: (() => void) | null = null;
          private _src = '';
          set src(value: string) {
            this._src = value;
            setTimeout(() => this.onload && this.onload());
          }
          get src() {
            return this._src;
          }
        }
        (window as any).Image = FakeImage;

        // Stub canvas creation so toDataURL simulates the shrink-loop.
        const toDataURLSpy = jasmine
          .createSpy('toDataURL')
          .and.returnValues(
            'data:image/jpeg;base64,' + 'A'.repeat(4_000_000), // too big -> quality reduced
            'data:image/jpeg;base64,' + 'A'.repeat(1_000_000), // small enough -> loop stops
          );
        const fakeCtx = { fillStyle: '', fillRect: jasmine.createSpy('fillRect'), drawImage: jasmine.createSpy('drawImage') };
        const fakeCanvas: any = {
          width: 0,
          height: 0,
          getContext: () => fakeCtx,
          toDataURL: toDataURLSpy,
        };
        const originalCreateElement = document.createElement.bind(document);
        spyOn(document, 'createElement').and.callFake((tag: string) => {
          if (tag === 'canvas') return fakeCanvas;
          return originalCreateElement(tag);
        });

        const file = new File(['data'], 'photo.png', { type: 'image/png' });
        component.onTerminaisonCoverSelected(makeEvent(file));

        setTimeout(() => {
          expect(component.terminaisonCoverContentType).toBe('image/jpeg');
          expect(component.terminaisonCoverBase64).toBe('A'.repeat(1_000_000));
          expect(component.terminaisonCoverError).toBe('');
          expect(toDataURLSpy.calls.count()).toBe(2);
          done();
        }, 10);
      });

      it('surfaces a FileReader error', (done) => {
        const fakeReader: any = {
          onload: null,
          onerror: null,
          readAsDataURL() {
            setTimeout(() => fakeReader.onerror && fakeReader.onerror());
          },
        };
        spyOn(window as any, 'FileReader').and.returnValue(fakeReader);

        const file = new File(['data'], 'photo.png', { type: 'image/png' });
        component.onTerminaisonCoverSelected(makeEvent(file));

        setTimeout(() => {
          expect(component.terminaisonCoverError).toBe("Impossible de lire l'image sélectionnée.");
          done();
        }, 10);
      });

      it('surfaces an image load error', (done) => {
        const fakeReader: any = {
          onload: null,
          onerror: null,
          readAsDataURL() {
            setTimeout(() => {
              (fakeReader as any).result = 'data:image/png;base64,AAAA';
              fakeReader.onload && fakeReader.onload();
            });
          },
        };
        spyOn(window as any, 'FileReader').and.returnValue(fakeReader);

        class FailingImage {
          onload: (() => void) | null = null;
          onerror: (() => void) | null = null;
          set src(_value: string) {
            setTimeout(() => this.onerror && this.onerror());
          }
        }
        (window as any).Image = FailingImage;

        const file = new File(['data'], 'photo.png', { type: 'image/png' });
        component.onTerminaisonCoverSelected(makeEvent(file));

        setTimeout(() => {
          expect(component.terminaisonCoverError).toBe("Impossible de préparer l'image sélectionnée.");
          done();
        }, 10);
      });
    });
  });

  // ---------------------------------------------------------------------
  // selectTab
  // ---------------------------------------------------------------------
  describe('selectTab', () => {
    beforeEach(() => {
      component.sujet = freshSujet();
      authMock.currentUser.and.returnValue({ id: 10 });
    });

    it('switches the active tab and lazily loads data for Candidatures/Historique/Livrables', () => {
      component.selectTab('Candidatures');
      expect(component.activeTab).toBe('Candidatures');
      expect(candidatureServiceMock.getCandidaturesParSujet).toHaveBeenCalledWith(1);

      component.selectTab('Historique');
      expect(historiqueServiceMock.getBySujet).toHaveBeenCalledWith(1, 'TOUT');

      component.selectTab('Livrables');
      expect(livrableServiceMock.findByProjet).toHaveBeenCalledWith(1);
    });

    it('does not trigger loads for the Informations/Membres tabs', () => {
      component.selectTab('Informations');
      expect(candidatureServiceMock.getCandidaturesParSujet).not.toHaveBeenCalled();
      expect(historiqueServiceMock.getBySujet).not.toHaveBeenCalled();
    });
  });

  // ---------------------------------------------------------------------
  // Candidatures
  // ---------------------------------------------------------------------
  describe('candidatures', () => {
    beforeEach(() => {
      component.sujet = freshSujet();
      authMock.currentUser.and.returnValue({ id: 10 });
    });

    it('loads and filters/sorts candidatures by DEPOSEE + date desc', () => {
      candidatureServiceMock.getCandidaturesParSujet.and.returnValue(
        of([
          { id: 1, statut: 'DEPOSEE', dateDepot: '2026-01-01T00:00:00Z', etudiantPrenom: 'A', etudiantNom: 'Z' },
          { id: 2, statut: 'ACCEPTEE', dateDepot: '2026-01-05T00:00:00Z', etudiantPrenom: 'B', etudiantNom: 'Y' },
          { id: 3, statut: 'DEPOSEE', dateDepot: '2026-01-10T00:00:00Z', etudiantPrenom: 'C', etudiantNom: 'X' },
        ]),
      );
      component.loadCandidatures();
      expect(component.candidatures.map((c: any) => c.id)).toEqual([3, 1]);
      expect(component.candidaturesLoading).toBeFalse();
    });

    it('does nothing without a sujet or without permission', () => {
      component.sujet = null;
      component.loadCandidatures();
      expect(candidatureServiceMock.getCandidaturesParSujet).not.toHaveBeenCalled();

      component.sujet = freshSujet();
      authMock.currentUser.and.returnValue({ id: 999 });
      setRole('ROLE_ETUDIANT');
      component.loadCandidatures();
      expect(candidatureServiceMock.getCandidaturesParSujet).not.toHaveBeenCalled();
    });

    it('handles errors', () => {
      candidatureServiceMock.getCandidaturesParSujet.and.returnValue(throwError(() => new Error('x')));
      component.loadCandidatures();
      expect(component.candidatures).toEqual([]);
      expect(component.candidaturesError).toBe('Impossible de charger les candidatures.');
      expect(component.candidaturesLoading).toBeFalse();
    });

    it('candidatureFullName / candidatureInitials', () => {
      const c: any = { etudiantPrenom: 'jean', etudiantNom: 'dupont' };
      expect(component.candidatureFullName(c)).toBe('jean dupont');
      expect(component.candidatureInitials(c)).toBe('JD');
      expect(component.candidatureInitials({} as any)).toBe('?');
    });

    it('candidatureStatutLabel / candidatureStatutClass map known and unknown statuts', () => {
      expect(component.candidatureStatutLabel('DEPOSEE' as any)).toBe('En attente');
      expect(component.candidatureStatutLabel('ACCEPTEE' as any)).toBe('Acceptée');
      expect(component.candidatureStatutLabel('REFUSEE' as any)).toBe('Refusée');
      expect(component.candidatureStatutLabel('AUTRE' as any)).toBe('AUTRE');

      expect(component.candidatureStatutClass('DEPOSEE' as any)).toBe('candidature-card__status--pending');
      expect(component.candidatureStatutClass('ACCEPTEE' as any)).toBe('candidature-card__status--accepted');
      expect(component.candidatureStatutClass('REFUSEE' as any)).toBe('candidature-card__status--refused');
      expect(component.candidatureStatutClass('AUTRE' as any)).toBe('');
    });
  });

  // ---------------------------------------------------------------------
  // Historique
  // ---------------------------------------------------------------------
  describe('historique', () => {
    beforeEach(() => {
      component.sujet = freshSujet();
      authMock.currentUser.and.returnValue({ id: 10 });
    });

    it('loads entries and handles guard clauses', () => {
      component.sujet = null;
      component.loadHistorique();
      expect(historiqueServiceMock.getBySujet).not.toHaveBeenCalled();

      component.sujet = freshSujet();
      authMock.currentUser.and.returnValue({ id: 999 });
      setRole('ROLE_ETUDIANT');
      component.loadHistorique();
      expect(historiqueServiceMock.getBySujet).not.toHaveBeenCalled();
    });

    it('loads entries successfully, defaulting to an empty array on null', () => {
      authMock.currentUser.and.returnValue({ id: 10 });
      historiqueServiceMock.getBySujet.and.returnValue(of(null));
      component.loadHistorique();
      expect(component.historiqueEntries).toEqual([]);
      expect(component.historiqueLoading).toBeFalse();
    });

    it('handles errors', () => {
      authMock.currentUser.and.returnValue({ id: 10 });
      historiqueServiceMock.getBySujet.and.returnValue(throwError(() => new Error('x')));
      component.loadHistorique();
      expect(component.historiqueEntries).toEqual([]);
      expect(component.historiqueError).toBe("Impossible de charger l'historique.");
    });

    it('setHistoriqueFilter reloads only on change', () => {
      authMock.currentUser.and.returnValue({ id: 10 });
      component.setHistoriqueFilter('TOUT');
      expect(historiqueServiceMock.getBySujet).not.toHaveBeenCalled();

      component.setHistoriqueFilter('SUJET');
      expect(component.historiqueFilter).toBe('SUJET');
      expect(historiqueServiceMock.getBySujet).toHaveBeenCalledWith(1, 'SUJET');
    });

    it('historiqueActorName falls back to "Utilisateur"', () => {
      expect(component.historiqueActorName({ actorPrenom: 'A', actorNom: 'B' } as any)).toBe('A B');
      expect(component.historiqueActorName({} as any)).toBe('Utilisateur');
    });

    it('historiqueRoleLabel maps known roles and passes through unknowns', () => {
      expect(component.historiqueRoleLabel('ROLE_ADMIN')).toBe('Administrateur');
      expect(component.historiqueRoleLabel('ROLE_CI')).toBe('CI');
      expect(component.historiqueRoleLabel('ROLE_CHEF_EQUIPE')).toBe("Chef d'équipe");
      expect(component.historiqueRoleLabel('ROLE_ENSEIGNANT')).toBe('Encadrant');
      expect(component.historiqueRoleLabel('ROLE_ETUDIANT')).toBe('Étudiant');
      expect(component.historiqueRoleLabel('ROLE_INCONNU')).toBe('ROLE_INCONNU');
      expect(component.historiqueRoleLabel(null)).toBe('');
      expect(component.historiqueRoleLabel(undefined)).toBe('');
    });

    it('historiqueModule / historiqueModuleLabel distinguish ACCEPT/REFUSE from the rest', () => {
      expect(component.historiqueModule({ action: 'ACCEPT' } as any)).toBe('candidature');
      expect(component.historiqueModule({ action: 'REFUSE' } as any)).toBe('candidature');
      expect(component.historiqueModule({ action: 'CREATE' } as any)).toBe('sujet');
      expect(component.historiqueModuleLabel({ action: 'ACCEPT' } as any)).toBe('CANDIDATURES');
      expect(component.historiqueModuleLabel({ action: 'CREATE' } as any)).toBe('SUJETS');
    });

    it('historiqueActionTitle maps known actions, falls back to summary or action', () => {
      expect(component.historiqueActionTitle({ action: 'CREATE', entityType: 'CANDIDATURE' } as any)).toBe(
        'Dépôt candidature',
      );
      expect(component.historiqueActionTitle({ action: 'CREATE', entityType: 'SUJET' } as any)).toBe('Création sujet');
      expect(component.historiqueActionTitle({ action: 'UPDATE' } as any)).toBe('Modification sujet');
      expect(component.historiqueActionTitle({ action: 'DELETE' } as any)).toBe('Suppression sujet');
      expect(component.historiqueActionTitle({ action: 'VALIDATE' } as any)).toBe('Validation sujet');
      expect(component.historiqueActionTitle({ action: 'INVALIDATE' } as any)).toBe('Invalidation sujet');
      expect(component.historiqueActionTitle({ action: 'ACCEPT' } as any)).toBe('Acceptation candidature');
      expect(component.historiqueActionTitle({ action: 'REFUSE' } as any)).toBe('Refus candidature');
      expect(component.historiqueActionTitle({ action: 'RETRAIT' } as any)).toBe('Retrait étudiant');
      expect(component.historiqueActionTitle({ action: 'RETRAIT_ETUDIANT' } as any)).toBe('Retrait candidature');
      expect(component.historiqueActionTitle({ action: 'DECLARER_TERMINAISON' } as any)).toBe('Terminaison sujet');
      expect(component.historiqueActionTitle({ action: 'OUVRIR_CANDIDATURES' } as any)).toBe('Ouverture candidatures');
      expect(component.historiqueActionTitle({ action: 'FERMER_CANDIDATURES' } as any)).toBe('Fermeture candidatures');
      expect(component.historiqueActionTitle({ action: 'SUBMIT' } as any)).toBe('Soumission');
      expect(component.historiqueActionTitle({ action: 'AUTRE', summary: 'Résumé' } as any)).toBe('Résumé');
      expect(component.historiqueActionTitle({ action: 'AUTRE' } as any)).toBe('AUTRE');
    });

    it('historiqueTransition reads explicit statuts from JSON payloads', () => {
      const entry: any = {
        action: 'VALIDATE',
        entityType: 'SUJET',
        oldValues: JSON.stringify({ statut: 'EN_ATTENTE' }),
        newValues: JSON.stringify({ statut: 'VALIDE' }),
      };
      expect(component.historiqueTransition(entry)).toEqual({ from: 'En attente', to: 'Validé' } as any);
    });

    it('historiqueTransition infers statuts from the action when JSON is absent, and returns null when nothing can be inferred', () => {
      expect(component.historiqueTransition({ action: 'CREATE', entityType: 'SUJET' } as any)).toEqual({
        from: 'Nouveau',
        to: jasmine.any(String),
      } as any);
      expect(component.historiqueTransition({ action: 'UPDATE' } as any)).toBeNull();
    });

    it('historiqueTransition handles candidature entities via displayStatut', () => {
      const entry: any = { action: 'ACCEPT', entityType: 'CANDIDATURE' };
      const result = component.historiqueTransition(entry);
      expect(result).not.toBeNull();
      expect(result!.from).toEqual(jasmine.any(String));
      expect(result!.to).toEqual(jasmine.any(String));
    });

    it('historiqueTransition maps a RETRAIT_ETUDIANT / ARCHIVEE fallback statut', () => {
      const entry: any = { action: 'RETRAIT_ETUDIANT', entityType: 'CANDIDATURE' };
      const result = component.historiqueTransition(entry);
      expect(result!.to).toBe('Archivée');
    });

    it('historiqueMotif reads the first matching metadata key, trims it, or returns null', () => {
      expect(component.historiqueMotif({ metadata: null } as any)).toBeNull();
      expect(
        component.historiqueMotif({ metadata: JSON.stringify({ motif: '  raison  ' }) } as any),
      ).toBe('raison');
      expect(
        component.historiqueMotif({ metadata: JSON.stringify({ motifRefus: 'refus' }) } as any),
      ).toBe('refus');
      expect(
        component.historiqueMotif({ metadata: JSON.stringify({ motifRetrait: 'retrait' }) } as any),
      ).toBe('retrait');
      expect(
        component.historiqueMotif({ metadata: JSON.stringify({ commentaire: 'com' }) } as any),
      ).toBe('com');
      expect(component.historiqueMotif({ metadata: JSON.stringify({ motif: '   ' }) } as any)).toBeNull();
      expect(component.historiqueMotif({ metadata: 'not-json' } as any)).toBeNull();
    });

    it('historiqueTime formats a valid date and returns "" for an invalid one', () => {
      expect(component.historiqueTime({ createdAt: '2026-01-01T10:30:00Z' } as any)).toMatch(/\d{2}:\d{2}/);
      expect(component.historiqueTime({ createdAt: 'not-a-date' } as any)).toBe('');
    });

    it('filteredHistorique filters case-insensitively across actor/action/summary/motif', () => {
      component.historiqueEntries = [
        {
          actorPrenom: 'Jean',
          actorNom: 'Dupont',
          action: 'CREATE',
          entityType: 'SUJET',
          summary: 'Résumé A',
          metadata: JSON.stringify({ motif: 'motifA' }),
          createdAt: '2026-01-01T00:00:00Z',
        },
        {
          actorPrenom: 'Marie',
          actorNom: 'Curie',
          action: 'UPDATE',
          entityType: 'SUJET',
          summary: 'Résumé B',
          metadata: null,
          createdAt: '2026-01-02T00:00:00Z',
        },
      ] as any;

      component.historiqueSearch = '';
      expect(component.filteredHistorique.length).toBe(2);

      component.historiqueSearch = 'jean';
      expect(component.filteredHistorique.length).toBe(1);

      component.historiqueSearch = 'motifa';
      expect(component.filteredHistorique.length).toBe(1);

      component.historiqueSearch = 'nomatch';
      expect(component.filteredHistorique.length).toBe(0);
    });

    it('historiqueGroups groups filtered entries by date', () => {
      component.historiqueEntries = [
        { createdAt: '2026-01-01T10:00:00Z', action: 'CREATE', entityType: 'SUJET' },
        { createdAt: '2026-01-01T14:00:00Z', action: 'UPDATE', entityType: 'SUJET' },
        { createdAt: '2026-01-02T09:00:00Z', action: 'UPDATE', entityType: 'SUJET' },
      ] as any;
      component.historiqueSearch = '';
      const groups = component.historiqueGroups;
      expect(groups.length).toBe(2);
      expect(groups[0].count).toBe(2);
      expect(groups[1].count).toBe(1);
      expect(groups[0].dateLabel.length).toBeGreaterThan(0);
    });
  });

  // ---------------------------------------------------------------------
  // Membres
  // ---------------------------------------------------------------------
  describe('membres', () => {
    beforeEach(() => {
      component.sujet = freshSujet();
    });

    it('loads only ACTIVE membres', () => {
      candidatureServiceMock.getAffectationsParSujet.and.returnValue(
        of([
          { id: 1, statut: 'ACTIVE', etudiantPrenom: 'A', etudiantNom: 'B' },
          { id: 2, statut: 'RETIREE', etudiantPrenom: 'C', etudiantNom: 'D' },
        ]),
      );
      component.loadMembres();
      expect(component.membres.map((m: any) => m.id)).toEqual([1]);
      expect(component.membresLoading).toBeFalse();
    });

    it('does nothing without a sujet', () => {
      component.sujet = null;
      component.loadMembres();
      expect(candidatureServiceMock.getAffectationsParSujet).not.toHaveBeenCalled();
    });

    it('handles errors', () => {
      candidatureServiceMock.getAffectationsParSujet.and.returnValue(throwError(() => new Error('x')));
      component.loadMembres();
      expect(component.membres).toEqual([]);
      expect(component.membresError).toBe('Impossible de charger les membres du sujet.');
    });

    it('memberFullName / memberInitials', () => {
      expect(component.memberFullName({ etudiantPrenom: 'jean', etudiantNom: 'dupont' } as any)).toBe('jean dupont');
      expect(component.memberInitials({ etudiantPrenom: 'jean', etudiantNom: 'dupont' } as any)).toBe('JD');
      expect(component.memberInitials({} as any)).toBe('?');
    });

    it('ouvrirRetraitMembre / annulerRetraitMembre manage the confirmation state', () => {
      component.membresError = 'x';
      component.membresMessage = 'y';
      component.ouvrirRetraitMembre({ id: 5 } as any);
      expect(component.retraitTargetId).toBe(5);
      expect(component.retraitMotif).toBe('');
      expect(component.membresError).toBe('');
      expect(component.membresMessage).toBe('');

      component.annulerRetraitMembre();
      expect(component.retraitTargetId).toBeNull();
      expect(component.retraitMotif).toBe('');
    });

    it('confirmerRetraitMembre requires a target and a non-blank motif', () => {
      component.retraitTargetId = null;
      component.retraitMotif = 'motif';
      component.confirmerRetraitMembre();
      expect(candidatureServiceMock.retirerEtudiant).not.toHaveBeenCalled();

      component.retraitTargetId = 5;
      component.retraitMotif = '   ';
      component.confirmerRetraitMembre();
      expect(candidatureServiceMock.retirerEtudiant).not.toHaveBeenCalled();
    });

    it('confirmerRetraitMembre succeeds, reloads membres/sujet and shows a transient message', fakeAsync(() => {
      component.retraitTargetId = 5;
      component.retraitMotif = ' motif ';
      component.confirmerRetraitMembre();
      expect(candidatureServiceMock.retirerEtudiant).toHaveBeenCalledWith(5, 'motif');
      expect(component.retraitLoading).toBeFalse();
      expect(component.retraitTargetId).toBeNull();
      expect(component.membresMessage).toBe('Membre retiré du sujet.');
      expect(candidatureServiceMock.getAffectationsParSujet).toHaveBeenCalled();
      expect(sujetProjetServiceMock.getSujetById).toHaveBeenCalled();
      tick(2500);
      expect(component.membresMessage).toBe('');
    }));

    it('confirmerRetraitMembre surfaces API errors', () => {
      candidatureServiceMock.retirerEtudiant.and.returnValue(
        throwError(() => ({ error: { detail: 'Erreur' } })),
      );
      component.retraitTargetId = 5;
      component.retraitMotif = 'motif';
      component.confirmerRetraitMembre();
      expect(component.retraitLoading).toBeFalse();
      expect(component.membresError).toBe('Erreur');
    });

    it('confirmerRetraitMembre falls back to a generic error message', () => {
      candidatureServiceMock.retirerEtudiant.and.returnValue(throwError(() => ({})));
      component.retraitTargetId = 5;
      component.retraitMotif = 'motif';
      component.confirmerRetraitMembre();
      expect(component.membresError).toBe('Impossible de retirer ce membre.');
    });
  });

  // ---------------------------------------------------------------------
  // Livrables
  // ---------------------------------------------------------------------
  describe('livrables', () => {
    beforeEach(() => {
      component.sujet = freshSujet();
      authMock.currentUser.and.returnValue({ id: 10 });
    });

    it('loadLivrables loads for staff viewers and is a no-op otherwise', () => {
      livrableServiceMock.findByProjet.and.returnValue(of([{ id: 1 }]));
      component.loadLivrables();
      expect(component.livrables).toEqual([{ id: 1 }] as any);
      expect(component.livrablesLoading).toBeFalse();

      component.sujet = null;
      component.loadLivrables();

      component.sujet = freshSujet();
      authMock.currentUser.and.returnValue({ id: 999 });
      setRole('ROLE_ETUDIANT');
      livrableServiceMock.findByProjet.calls.reset();
      component.loadLivrables();
      expect(livrableServiceMock.findByProjet).not.toHaveBeenCalled();
    });

    it('loadLivrables handles errors', () => {
      livrableServiceMock.findByProjet.and.returnValue(throwError(() => new Error('x')));
      component.loadLivrables();
      expect(component.livrableError).toBe('Impossible de charger les livrables.');
      expect(component.livrablesLoading).toBeFalse();
    });

    it('onUploadFileSelected stores the selected file or null', () => {
      const input = document.createElement('input');
      input.type = 'file';
      const file = new File(['x'], 'a.txt');
      Object.defineProperty(input, 'files', { value: [file] });
      component.onUploadFileSelected({ target: input } as unknown as Event);
      expect(component.selectedUploadFile).toBe(file);

      Object.defineProperty(input, 'files', { value: [] });
      component.onUploadFileSelected({ target: input } as unknown as Event);
      expect(component.selectedUploadFile).toBeNull();
    });

    it('uploadLivrable requires a file and a non-blank nom', () => {
      component.selectedUploadFile = null;
      component.uploadForm.nom = 'x';
      component.uploadLivrable();
      expect(livrableServiceMock.upload).not.toHaveBeenCalled();
      expect(component.livrableError).toBe('Fichier et nom obligatoires.');

      component.selectedUploadFile = new File(['x'], 'a.txt');
      component.uploadForm.nom = '   ';
      component.uploadLivrable();
      expect(livrableServiceMock.upload).not.toHaveBeenCalled();
    });

    it('uploadLivrable succeeds and resets the form', fakeAsync(() => {
      component.selectedUploadFile = new File(['x'], 'a.txt');
      component.uploadForm = { typeLivrable: 'DOCUMENTATION', nom: ' Rapport ', description: ' desc ' };
      component.uploadLivrable();
      expect(livrableServiceMock.upload).toHaveBeenCalledWith(1, {
        typeLivrable: 'DOCUMENTATION',
        nom: 'Rapport',
        description: 'desc',
        file: jasmine.any(File),
      });
      expect(component.livrableMessage).toBe('Livrable ajouté. Vous pouvez recalculer le score du projet.');
      expect(component.selectedUploadFile).toBeNull();
      tick(2500);
      expect(component.livrableMessage).toBe('');
    }));

    it('uploadLivrable surfaces errors', () => {
      component.selectedUploadFile = new File(['x'], 'a.txt');
      component.uploadForm.nom = 'x';
      livrableServiceMock.upload.and.returnValue(throwError(() => ({ error: { detail: 'Erreur' } })));
      component.uploadLivrable();
      expect(component.livrableError).toBe('Erreur');
    });

    it('addLivrableLink requires nom and lienExterne', () => {
      component.linkForm.nom = '';
      component.linkForm.lienExterne = 'http://x';
      component.addLivrableLink();
      expect(livrableServiceMock.addLink).not.toHaveBeenCalled();

      component.linkForm.nom = 'nom';
      component.linkForm.lienExterne = '  ';
      component.addLivrableLink();
      expect(livrableServiceMock.addLink).not.toHaveBeenCalled();
    });

    it('addLivrableLink succeeds and resets the form', fakeAsync(() => {
      component.linkForm = { typeLivrable: 'LIEN_GIT', nom: ' Repo ', description: ' d ', lienExterne: ' http://x ' };
      component.addLivrableLink();
      expect(livrableServiceMock.addLink).toHaveBeenCalledWith(1, {
        typeLivrable: 'LIEN_GIT',
        nom: 'Repo',
        description: 'd',
        lienExterne: 'http://x',
      });
      expect(component.livrableMessage).toBe('Livrable ajouté. Vous pouvez recalculer le score du projet.');
      tick(2500);
      expect(component.livrableMessage).toBe('');
    }));

    it('addLivrableLink surfaces errors', () => {
      component.linkForm.nom = 'nom';
      component.linkForm.lienExterne = 'http://x';
      livrableServiceMock.addLink.and.returnValue(throwError(() => ({ error: { detail: 'Erreur' } })));
      component.addLivrableLink();
      expect(component.livrableError).toBe('Erreur');
    });

    it('deleteLivrable reloads on success and surfaces an error otherwise', () => {
      component.deleteLivrable({ id: 1 } as any);
      expect(livrableServiceMock.delete).toHaveBeenCalledWith(1);

      livrableServiceMock.delete.and.returnValue(throwError(() => new Error('x')));
      component.deleteLivrable({ id: 1 } as any);
      expect(component.livrableError).toBe('Suppression impossible.');
    });

    it('downloadLivrable delegates to the service', () => {
      expect(component.downloadLivrable({ id: 1 } as any)).toBe('http://api/livrables/1/download');
    });

    it('livrableDisplayName prefers the original file name', () => {
      expect(component.livrableDisplayName({ originalFileName: ' file.pdf ', nom: 'nom' } as any)).toBe('file.pdf');
      expect(component.livrableDisplayName({ originalFileName: '', nom: 'nom' } as any)).toBe('nom');
      expect(component.livrableDisplayName({ nom: 'nom' } as any)).toBe('nom');
    });

    it('livrableDateLabel formats or falls back to a dash', () => {
      expect(component.livrableDateLabel({ dateDepot: '' } as any)).toBe('—');
      expect(component.livrableDateLabel({ dateDepot: '2026-01-05T00:00:00Z' } as any)).toMatch(/\d{2}\/\d{2}\/\d{4}/);
    });

    it('livrableSizeLabel formats bytes/Ko/MB and returns null for missing/zero size', () => {
      expect(component.livrableSizeLabel({ size: null } as any)).toBeNull();
      expect(component.livrableSizeLabel({ size: 0 } as any)).toBeNull();
      expect(component.livrableSizeLabel({ size: 500 } as any)).toBe('500 o');
      expect(component.livrableSizeLabel({ size: 2048 } as any)).toBe('2.0 Ko');
      expect(component.livrableSizeLabel({ size: 5 * 1024 * 1024 } as any)).toBe('5.0 MB');
    });
  });

  // ---------------------------------------------------------------------
  // Evaluation / score recalculation
  // ---------------------------------------------------------------------
  describe('evaluation and score recalculation', () => {
    beforeEach(() => {
      authMock.currentUser.and.returnValue({ id: 10 });
      component.sujet = freshSujet({ statut: 'REALISATION_TERMINEE' });
    });

    it('loadEvaluation is a no-op without permission and clears the evaluation', () => {
      authMock.currentUser.and.returnValue({ id: 999 });
      setRole('ROLE_ETUDIANT');
      component.evaluation = { scoreFinal: 1 } as any;
      component.loadEvaluation();
      expect(component.evaluation).toBeNull();
      expect(evaluationServiceMock.getLatestEvaluation).not.toHaveBeenCalled();
    });

    it('loadEvaluation loads successfully and handles errors', () => {
      authMock.currentUser.and.returnValue({ id: 10 });
      evaluationServiceMock.getLatestEvaluation.and.returnValue(of({ scoreFinal: 90 }));
      component.loadEvaluation();
      expect(component.evaluation).toEqual({ scoreFinal: 90 } as any);
      expect(component.evaluationLoading).toBeFalse();

      evaluationServiceMock.getLatestEvaluation.and.returnValue(throwError(() => new Error('x')));
      component.loadEvaluation();
      expect(component.evaluation).toBeNull();
      expect(component.evaluationLoading).toBeFalse();
    });

    it('scoreCooldownActive / scoreCooldownLabel reflect the remaining time', fakeAsync(() => {
      expect(component.scoreCooldownActive).toBeFalse();
      component.recalculateScore();
      expect(component.scoreCooldownActive).toBeTrue();
      expect(component.scoreCooldownLabel).toBe('2:00');
      tick(1000);
      expect(component.scoreCooldownLabel).toBe('1:59');
      discardPeriodicTasks();
    }));

    it('recalculateScore is a no-op without permission', () => {
      authMock.currentUser.and.returnValue({ id: 999 });
      setRole('ROLE_ETUDIANT');
      component.recalculateScore();
      expect(evaluationServiceMock.calculateScore).not.toHaveBeenCalled();
    });

    it('recalculateScore blocks while the cooldown is active', fakeAsync(() => {
      component.recalculateScore();
      evaluationServiceMock.calculateScore.calls.reset();
      component.recalculateScore();
      expect(evaluationServiceMock.calculateScore).not.toHaveBeenCalled();
      expect(component.evaluationError).toContain('Veuillez patienter');
      discardPeriodicTasks();
    }));

    it('recalculateScore succeeds, updates the sujet and starts the cooldown', fakeAsync(() => {
      component.recalculateScore();
      expect(component.evaluationMessage).toBe('Score recalculé avec succès.');
      expect(component.sujet!.scoreFinal).toBe(80);
      expect(component.scoreCooldownActive).toBeTrue();
      discardPeriodicTasks();
    }));

    it('recalculateScore treats FAILED_PERMANENT / NOT_EVALUABLE as a non-success', fakeAsync(() => {
      evaluationServiceMock.calculateScore.and.returnValue(
        of({ processingStatus: 'FAILED_PERMANENT', eligibilityStatus: 'OK', commentaire: 'Echec ML' }),
      );
      component.recalculateScore();
      expect(component.evaluationError).toBe('Echec ML');
      expect(component.evaluationMessage).toBe('');
      expect(component.scoreCooldownActive).toBeFalse();
    }));

    it('recalculateScore falls back to a generic message when non-evaluable without commentaire', fakeAsync(() => {
      evaluationServiceMock.calculateScore.and.returnValue(
        of({ processingStatus: 'NOT_EVALUABLE', eligibilityStatus: 'NOT_EVALUABLE', commentaire: null }),
      );
      component.recalculateScore();
      expect(component.evaluationError).toBe('Le recalcul n’a pas produit une évaluation exploitable.');
    }));

    it('recalculateScore handles a 429/409 rate-limit error and starts the cooldown from retryAfterSeconds', fakeAsync(() => {
      evaluationServiceMock.calculateScore.and.returnValue(
        throwError(() => ({ status: 429, error: { retryAfterSeconds: 30 } })),
      );
      component.recalculateScore();
      expect(component.scoreCooldownRemaining).toBe(30);
      expect(component.evaluationError).toContain('Veuillez patienter');
      discardPeriodicTasks();
    }));

    it('recalculateScore falls back to the default cooldown when retryAfterSeconds is not a number', fakeAsync(() => {
      evaluationServiceMock.calculateScore.and.returnValue(throwError(() => ({ status: 409, error: {} })));
      component.recalculateScore();
      expect(component.scoreCooldownRemaining).toBe(120);
      discardPeriodicTasks();
    }));

    it('recalculateScore surfaces other errors without starting a cooldown', fakeAsync(() => {
      evaluationServiceMock.calculateScore.and.returnValue(
        throwError(() => ({ status: 500, error: { detail: 'Erreur serveur' } })),
      );
      component.recalculateScore();
      expect(component.evaluationError).toBe('Erreur serveur');
      expect(component.scoreCooldownActive).toBeFalse();
    }));

    it('recalculateScore falls back to a generic error message', fakeAsync(() => {
      evaluationServiceMock.calculateScore.and.returnValue(throwError(() => ({ status: 500, error: {} })));
      component.recalculateScore();
      expect(component.evaluationError).toBe('Recalcul impossible.');
    }));

    it('ngOnDestroy clears any running cooldown timer', fakeAsync(() => {
      component.recalculateScore();
      expect(component.scoreCooldownActive).toBeTrue();
      component.ngOnDestroy();
      expect(component.scoreCooldownActive).toBeFalse();
      tick(200000);
    }));
  });

  // ---------------------------------------------------------------------
  // noteResultDisplay
  // ---------------------------------------------------------------------
  describe('noteResultDisplay', () => {
    it('prefers ML score/max with a normalized percentage when present', () => {
      expect(
        component.noteResultDisplay({ mlScore: 8, mlMaxScore: 10, normalizedScore: 0.8 } as any),
      ).toBe('8/10 - 80/100');
      expect(component.noteResultDisplay({ mlScore: 8, mlMaxScore: 10, normalizedScore: null } as any)).toBe('8/10');
    });

    it('falls back to noteValue/bareme with an optional label', () => {
      expect(
        component.noteResultDisplay({ noteValue: 15, bareme: 20, noteLabel: 'Bien' } as any),
      ).toBe('15/20 - Bien');
      expect(component.noteResultDisplay({ noteValue: 15, bareme: 20 } as any)).toBe('15/20');
    });

    it('falls back to noteObtenue when noteValue is absent', () => {
      expect(component.noteResultDisplay({ noteObtenue: 12, bareme: 20 } as any)).toBe('12/20');
    });

    it('falls back to a bare label or note when there is no bareme', () => {
      expect(component.noteResultDisplay({ noteValue: 0, bareme: 0, noteLabel: 'Non noté' } as any)).toBe('Non noté');
      expect(component.noteResultDisplay({ noteValue: 5, bareme: 0 } as any)).toBe('5');
      expect(component.noteResultDisplay({} as any)).toBe('0');
    });
  });

  // ---------------------------------------------------------------------
  // Industrialisation
  // ---------------------------------------------------------------------
  describe('industrialisation', () => {
    const questionBoolElim: any = { id: 1, libelle: 'Q1', obligatoire: true, typeReponse: 'BOOLEAN', typeCritere: 'ELIMINATOIRE' };
    const questionNote: any = { id: 2, libelle: 'Q2', obligatoire: true, typeReponse: 'NUMERIQUE', typeCritere: 'NOTE' };
    const questionText: any = { id: 3, libelle: 'Q3', obligatoire: false, typeReponse: 'TEXTE', typeCritere: 'AUTRE' };
    const questionUrl: any = { id: 4, libelle: 'Q4', obligatoire: true, typeReponse: 'URL', typeCritere: 'AUTRE' };
    const questionFichier: any = { id: 5, libelle: 'Q5', obligatoire: true, typeReponse: 'FICHIER', typeCritere: 'AUTRE' };
    const questionChoix: any = { id: 6, libelle: 'Q6', obligatoire: false, typeReponse: 'CHOIX', typeCritere: 'AUTRE' };

    function baseForm(overrides: any = {}): any {
      return {
        questions: [questionBoolElim, questionNote, questionText, questionUrl, questionFichier, questionChoix],
        reponses: [],
        candidature: { id: 42, warnings: [], livrables: [], reponses: [] },
        ...overrides,
      };
    }

    beforeEach(() => {
      component.sujet = freshSujet();
      authMock.currentUser.and.returnValue({ id: 10 });
    });

    it('openIndustrialisation / closeIndustrialisation reset the modal state', () => {
      component.industrialisationForm = baseForm();
      component.industrialisationError = 'e';
      component.industrialisationMessage = 'm';
      component.industrialisationSubmitAttempted = true;
      component.industrialisationUploadingQuestionId = 3;
      component.answers = { 1: {} as any };

      component.openIndustrialisation();
      expect(component.industrialisationOpen).toBeTrue();
      expect(component.industrialisationForm).toBeNull();
      expect(component.industrialisationError).toBe('');
      expect(component.industrialisationMessage).toBe('');
      expect(component.industrialisationSubmitAttempted).toBeFalse();
      expect(component.industrialisationUploadingQuestionId).toBeNull();
      expect(component.answers).toEqual({});

      component.industrialisationSubmitAttempted = true;
      component.industrialisationUploadingQuestionId = 3;
      component.closeIndustrialisation();
      expect(component.industrialisationOpen).toBeFalse();
      expect(component.industrialisationSubmitAttempted).toBeFalse();
      expect(component.industrialisationUploadingQuestionId).toBeNull();
    });

    it('createIndustrialisation loads the formulaire on success', () => {
      industrialisationServiceMock.create.and.returnValue(of({ id: 42 }));
      spyOn(component, 'loadIndustrialisationForm');
      component.industrialisationType = 'INTERNE';
      component.industrialisationCommentaire = ' commentaire ';
      component.createIndustrialisation();
      expect(industrialisationServiceMock.create).toHaveBeenCalledWith(1, {
        typeIndustrialisation: 'INTERNE',
        commentaire: 'commentaire',
        confirmEliminatoryWarnings: false,
      });
      expect(component.loadIndustrialisationForm).toHaveBeenCalledWith(42);
    });

    it('createIndustrialisation opens the eliminatory-warning confirmation on a 409', () => {
      industrialisationServiceMock.create.and.returnValue(
        throwError(() => ({ status: 409, error: { requiresConfirmation: true, warnings: ['w'] } })),
      );
      component.createIndustrialisation();
      expect(component.eliminatoryWarningConfirmation).toEqual({ requiresConfirmation: true, warnings: ['w'] } as any);
      expect(component.pendingIndustrialisationAction).toBe('create');
      expect(component.industrialisationSaving).toBeFalse();
    });

    it('createIndustrialisation surfaces a plain error', () => {
      industrialisationServiceMock.create.and.returnValue(
        throwError(() => ({ error: { detail: 'Erreur creation' } })),
      );
      component.createIndustrialisation();
      expect(component.industrialisationError).toBe('Erreur creation');
      expect(component.industrialisationSaving).toBeFalse();
    });

    it('createIndustrialisation falls back to a generic error', () => {
      industrialisationServiceMock.create.and.returnValue(throwError(() => ({})));
      component.createIndustrialisation();
      expect(component.industrialisationError).toBe('Creation de la demande impossible.');
    });

    it('loadIndustrialisationForm seeds answers from any existing reponses', () => {
      const form = baseForm({
        reponses: [
          {
            questionId: 1,
            valeurTexte: 'x',
            valeurBoolean: true,
            valeurNumerique: 5,
            valeurUrl: 'http://x',
            reponseEliminatoire: ReponseEliminatoire.OK,
            noteObtenue: 10,
            justificatif: 'just',
          },
        ],
      });
      industrialisationServiceMock.getFormulaire.and.returnValue(of(form));
      component.loadIndustrialisationForm(42);
      expect(component.industrialisationForm).toEqual(form);
      expect(component.answers[1].valeurBoolean).toBeTrue();
      expect(component.answers[2].valeurTexte).toBe('');
      expect(component.industrialisationSaving).toBeFalse();
      expect(component.industrialisationSubmitAttempted).toBeFalse();
    });

    it('loadIndustrialisationForm surfaces an error', () => {
      industrialisationServiceMock.getFormulaire.and.returnValue(throwError(() => new Error('x')));
      component.loadIndustrialisationForm(42);
      expect(component.industrialisationError).toBe('Chargement du formulaire impossible.');
      expect(component.industrialisationSaving).toBeFalse();
    });

    it('saveIndustrialisationAnswers is a no-op without a loaded form', () => {
      component.industrialisationForm = null;
      component.saveIndustrialisationAnswers();
      expect(industrialisationServiceMock.saveReponses).not.toHaveBeenCalled();
    });

    it('saveIndustrialisationAnswers succeeds and merges the updated candidature', () => {
      component.industrialisationForm = baseForm();
      industrialisationServiceMock.saveReponses.and.returnValue(of({ id: 42, warnings: [] }));
      component.saveIndustrialisationAnswers();
      expect(component.industrialisationMessage).toBe('Reponses enregistrees.');
      expect(component.industrialisationForm!.candidature).toEqual({ id: 42, warnings: [] } as any);
      expect(component.industrialisationSaving).toBeFalse();
    });

    it('saveIndustrialisationAnswers surfaces errors (with and without a detail)', () => {
      component.industrialisationForm = baseForm();
      industrialisationServiceMock.saveReponses.and.returnValue(
        throwError(() => ({ error: { detail: 'Erreur' } })),
      );
      component.saveIndustrialisationAnswers();
      expect(component.industrialisationError).toBe('Erreur');

      industrialisationServiceMock.saveReponses.and.returnValue(throwError(() => ({})));
      component.saveIndustrialisationAnswers();
      expect(component.industrialisationError).toBe('Enregistrement impossible.');
    });

    it('uploadProof is a no-op without a form or a selected file', () => {
      component.industrialisationForm = null;
      component.uploadProof(questionFichier, { target: document.createElement('input') } as unknown as Event);
      expect(industrialisationServiceMock.uploadPreuve).not.toHaveBeenCalled();

      component.industrialisationForm = baseForm();
      const input = document.createElement('input');
      Object.defineProperty(input, 'files', { value: [] });
      component.uploadProof(questionFichier, { target: input } as unknown as Event);
      expect(industrialisationServiceMock.uploadPreuve).not.toHaveBeenCalled();
    });

    it('uploadProof succeeds and resets the file input', () => {
      component.industrialisationForm = baseForm();
      industrialisationServiceMock.uploadPreuve.and.returnValue(of({ id: 42, warnings: [] }));
      const input = document.createElement('input');
      const file = new File(['x'], 'proof.pdf');
      Object.defineProperty(input, 'files', { value: [file] });
      input.value = 'C:\\fakepath\\proof.pdf';
      component.uploadProof(questionFichier, { target: input } as unknown as Event);
      expect(industrialisationServiceMock.uploadPreuve).toHaveBeenCalledWith(42, 5, file);
      expect(component.industrialisationMessage).toBe('Preuve ajoutee.');
      expect(component.industrialisationUploadingQuestionId).toBeNull();
      expect(input.value).toBe('');
    });

    it('uploadProof surfaces errors (with and without a detail)', () => {
      component.industrialisationForm = baseForm();
      const input = document.createElement('input');
      const file = new File(['x'], 'proof.pdf');
      Object.defineProperty(input, 'files', { value: [file] });

      industrialisationServiceMock.uploadPreuve.and.returnValue(
        throwError(() => ({ error: { detail: 'Erreur upload' } })),
      );
      component.uploadProof(questionFichier, { target: input } as unknown as Event);
      expect(component.industrialisationError).toBe('Erreur upload');
      expect(component.industrialisationUploadingQuestionId).toBeNull();

      industrialisationServiceMock.uploadPreuve.and.returnValue(throwError(() => ({})));
      component.uploadProof(questionFichier, { target: input } as unknown as Event);
      expect(component.industrialisationError).toBe('Upload de preuve impossible.');
    });

    it('submitIndustrialisation delegates to submitIndustrialisationWithConfirmation(false)', () => {
      spyOn(component, 'submitIndustrialisationWithConfirmation');
      component.submitIndustrialisation();
      expect(component.submitIndustrialisationWithConfirmation).toHaveBeenCalledWith(false);
    });

    it('submitIndustrialisationWithConfirmation is a no-op without a form', () => {
      component.industrialisationForm = null;
      component.submitIndustrialisationWithConfirmation(false);
      expect(industrialisationServiceMock.saveReponses).not.toHaveBeenCalled();
    });

    it('submitIndustrialisationWithConfirmation blocks on missing required answers', () => {
      component.industrialisationForm = baseForm();
      component.answers = {};
      component.submitIndustrialisationWithConfirmation(false);
      expect(component.industrialisationSubmitAttempted).toBeTrue();
      expect(component.industrialisationError).toContain('Reponse obligatoire manquante');
      expect(industrialisationServiceMock.saveReponses).not.toHaveBeenCalled();
    });

    function fullyAnsweredForm() {
      const form = baseForm();
      component.industrialisationForm = form;
      component.answers = {
        1: { questionId: 1, valeurBoolean: true, reponseEliminatoire: ReponseEliminatoire.OK },
        2: { questionId: 2, valeurNumerique: 12, noteObtenue: 12 },
        3: { questionId: 3, valeurTexte: 'texte' },
        4: { questionId: 4, valeurUrl: 'http://x' },
        5: { questionId: 5 },
        6: { questionId: 6, valeurTexte: 'choix' },
      } as any;
      // question 5 is FICHIER: mark it answered via an uploaded proof.
      form.candidature.reponses = [{ questionId: 5, preuveObjectName: 'obj' }];
      return form;
    }

    it('submitIndustrialisationWithConfirmation saves then submits successfully', () => {
      fullyAnsweredForm();
      industrialisationServiceMock.saveReponses.and.returnValue(of({ id: 42, warnings: [] }));
      industrialisationServiceMock.soumettre.and.returnValue(of({ id: 42, warnings: [] }));
      component.submitIndustrialisationWithConfirmation(false);
      expect(industrialisationServiceMock.soumettre).toHaveBeenCalledWith(42, { confirmEliminatoryWarnings: false });
      expect(component.industrialisationMessage).toBe('Demande soumise a la CI.');
      expect(component.industrialisationSaving).toBeFalse();
      expect(component.industrialisationOpen).toBeFalse();
      expect(component.activeTab).toBe('Industrialisation');
      expect(sujetProjetServiceMock.getSujetById).toHaveBeenCalled();
    });

    it('submitIndustrialisationWithConfirmation opens the eliminatory confirmation on a 409 from soumettre', () => {
      fullyAnsweredForm();
      industrialisationServiceMock.saveReponses.and.returnValue(of({ id: 42, warnings: [] }));
      industrialisationServiceMock.soumettre.and.returnValue(
        throwError(() => ({ status: 409, error: { requiresConfirmation: true } })),
      );
      component.submitIndustrialisationWithConfirmation(false);
      expect(component.eliminatoryWarningConfirmation).toEqual({ requiresConfirmation: true } as any);
      expect(component.pendingIndustrialisationAction).toBe('submit');
    });

    it('submitIndustrialisationWithConfirmation surfaces a soumettre error', () => {
      fullyAnsweredForm();
      industrialisationServiceMock.saveReponses.and.returnValue(of({ id: 42, warnings: [] }));
      industrialisationServiceMock.soumettre.and.returnValue(
        throwError(() => ({ error: { detail: 'Erreur soumission' } })),
      );
      component.submitIndustrialisationWithConfirmation(false);
      expect(component.industrialisationError).toBe('Erreur soumission');
      expect(component.industrialisationSaving).toBeFalse();
    });

    it('submitIndustrialisationWithConfirmation surfaces a saveReponses error before reaching soumettre', () => {
      fullyAnsweredForm();
      industrialisationServiceMock.saveReponses.and.returnValue(
        throwError(() => ({ error: { detail: 'Erreur enregistrement' } })),
      );
      component.submitIndustrialisationWithConfirmation(false);
      expect(component.industrialisationError).toBe('Erreur enregistrement');
      expect(industrialisationServiceMock.soumettre).not.toHaveBeenCalled();
    });

    it('submitIndustrialisationWithConfirmation falls back to a generic saveReponses error', () => {
      fullyAnsweredForm();
      industrialisationServiceMock.saveReponses.and.returnValue(throwError(() => ({})));
      component.submitIndustrialisationWithConfirmation(false);
      expect(component.industrialisationError).toBe('Enregistrement des reponses impossible.');
    });

    it('confirmEliminatoryWarnings replays the pending create action', () => {
      component.pendingIndustrialisationAction = 'create';
      component.eliminatoryWarningConfirmation = { requiresConfirmation: true } as any;
      spyOn(component, 'createIndustrialisation');
      component.confirmEliminatoryWarnings();
      expect(component.createIndustrialisation).toHaveBeenCalledWith(true);
      expect(component.eliminatoryWarningConfirmation).toBeNull();
      expect(component.pendingIndustrialisationAction).toBeNull();
    });

    it('confirmEliminatoryWarnings replays the pending submit action', () => {
      component.pendingIndustrialisationAction = 'submit';
      spyOn(component, 'submitIndustrialisationWithConfirmation');
      component.confirmEliminatoryWarnings();
      expect(component.submitIndustrialisationWithConfirmation).toHaveBeenCalledWith(true);
    });

    it('confirmEliminatoryWarnings does nothing when there is no pending action', () => {
      component.pendingIndustrialisationAction = null;
      spyOn(component, 'createIndustrialisation');
      spyOn(component, 'submitIndustrialisationWithConfirmation');
      component.confirmEliminatoryWarnings();
      expect(component.createIndustrialisation).not.toHaveBeenCalled();
      expect(component.submitIndustrialisationWithConfirmation).not.toHaveBeenCalled();
    });

    it('cancelEliminatoryWarnings clears the confirmation state', () => {
      component.eliminatoryWarningConfirmation = { requiresConfirmation: true } as any;
      component.pendingIndustrialisationAction = 'create';
      component.industrialisationSaving = true;
      component.cancelEliminatoryWarnings();
      expect(component.eliminatoryWarningConfirmation).toBeNull();
      expect(component.pendingIndustrialisationAction).toBeNull();
      expect(component.industrialisationSaving).toBeFalse();
    });

    it('setBooleanAnswer records the value and derives an eliminatory result', () => {
      component.industrialisationForm = baseForm();
      component.answers = {};
      component.setBooleanAnswer(questionBoolElim, true);
      expect(component.answers[1].valeurBoolean).toBeTrue();
      expect(component.answers[1].reponseEliminatoire).toBe(ReponseEliminatoire.OK);

      component.setBooleanAnswer(questionBoolElim, false);
      expect(component.answers[1].reponseEliminatoire).toBe(ReponseEliminatoire.NOT_OK);
    });

    it('onIndustrialisationAnswerChange clears transient messages', () => {
      component.industrialisationMessage = 'm';
      component.industrialisationError = 'e';
      component.onIndustrialisationAnswerChange();
      expect(component.industrialisationMessage).toBe('');
      expect(component.industrialisationError).toBe('');
    });

    it('automaticEliminatoryResult handles non-eliminatoire questions, missing answers, boolean and other types', () => {
      component.answers = {};
      expect(component.automaticEliminatoryResult(questionText)).toBeNull();
      expect(component.automaticEliminatoryResult(questionBoolElim)).toBeNull();

      component.answers[1] = { questionId: 1, valeurBoolean: true } as any;
      expect(component.automaticEliminatoryResult(questionBoolElim)).toBe(ReponseEliminatoire.OK);
      component.answers[1] = { questionId: 1, valeurBoolean: false } as any;
      expect(component.automaticEliminatoryResult(questionBoolElim)).toBe(ReponseEliminatoire.NOT_OK);
      component.answers[1] = { questionId: 1, valeurBoolean: undefined } as any;
      expect(component.automaticEliminatoryResult(questionBoolElim)).toBeNull();

      const elimText: any = { ...questionText, typeCritere: 'ELIMINATOIRE', typeReponse: 'TEXTE', id: 7 };
      component.answers[7] = { questionId: 7, valeurTexte: 'answered' } as any;
      expect(component.automaticEliminatoryResult(elimText)).toBe(ReponseEliminatoire.OK);
      component.answers[7] = { questionId: 7, valeurTexte: '' } as any;
      expect(component.automaticEliminatoryResult(elimText)).toBeNull();
    });

    it('eliminatoryPreviewLabel / eliminatoryPreviewClass reflect OK / NOT_OK / pending', () => {
      component.answers = { 1: { questionId: 1, valeurBoolean: true } as any };
      expect(component.eliminatoryPreviewLabel(questionBoolElim)).toBe('Conforme');
      expect(component.eliminatoryPreviewClass(questionBoolElim)).toBe('auto-result--ok');

      component.answers = { 1: { questionId: 1, valeurBoolean: false } as any };
      expect(component.eliminatoryPreviewLabel(questionBoolElim)).toBe('Alerte');
      expect(component.eliminatoryPreviewClass(questionBoolElim)).toBe('auto-result--ko');

      component.answers = {};
      expect(component.eliminatoryPreviewLabel(questionBoolElim)).toBe('En attente');
      expect(component.eliminatoryPreviewClass(questionBoolElim)).toBe('auto-result--pending');
    });

    it('hasBlockingEliminatoryAnswer detects a NOT_OK answer among the questions', () => {
      component.industrialisationForm = null;
      expect(component.hasBlockingEliminatoryAnswer()).toBeFalse();

      component.industrialisationForm = baseForm();
      component.answers = { 1: { questionId: 1, valeurBoolean: true } as any };
      expect(component.hasBlockingEliminatoryAnswer()).toBeFalse();

      component.answers = { 1: { questionId: 1, valeurBoolean: false } as any };
      expect(component.hasBlockingEliminatoryAnswer()).toBeTrue();
    });

    it('submissionWarnings appends the missing-livrables warning only once and only when needed', () => {
      component.industrialisationForm = baseForm({ candidature: { id: 42, warnings: ['Autre'], livrables: [], reponses: [] } });
      expect(component.submissionWarnings).toEqual(['Autre', component.missingLivrablesWarning]);

      component.industrialisationForm = baseForm({
        candidature: { id: 42, warnings: [component.missingLivrablesWarning], livrables: [], reponses: [] },
      });
      expect(component.submissionWarnings).toEqual([component.missingLivrablesWarning]);

      component.industrialisationForm = baseForm({
        candidature: { id: 42, warnings: [], livrables: [{ id: 1 }], reponses: [] },
      });
      expect(component.submissionWarnings).toEqual([]);

      component.industrialisationForm = null;
      component.livrables = [];
      expect(component.submissionWarnings).toEqual([component.missingLivrablesWarning]);
    });

    it('canSubmitIndustrialisation requires a form, no ongoing activity and no missing answers', () => {
      component.industrialisationForm = null;
      expect(component.canSubmitIndustrialisation()).toBeFalse();

      const form = fullyAnsweredForm();
      expect(component.canSubmitIndustrialisation()).toBeTrue();

      component.industrialisationSaving = true;
      expect(component.canSubmitIndustrialisation()).toBeFalse();
      component.industrialisationSaving = false;

      component.industrialisationUploadingQuestionId = 1;
      expect(component.canSubmitIndustrialisation()).toBeFalse();
      component.industrialisationUploadingQuestionId = null;

      component.answers = {};
      expect(component.canSubmitIndustrialisation()).toBeFalse();
      void form;
    });

    it('isIndustrialisationBusy reflects saving or an in-flight upload', () => {
      component.industrialisationSaving = false;
      component.industrialisationUploadingQuestionId = null;
      expect(component.isIndustrialisationBusy()).toBeFalse();
      component.industrialisationSaving = true;
      expect(component.isIndustrialisationBusy()).toBeTrue();
      component.industrialisationSaving = false;
      component.industrialisationUploadingQuestionId = 5;
      expect(component.isIndustrialisationBusy()).toBeTrue();
    });

    it('isQuestionUploading matches the uploading question id', () => {
      component.industrialisationUploadingQuestionId = 5;
      expect(component.isQuestionUploading(questionFichier)).toBeTrue();
      expect(component.isQuestionUploading(questionText)).toBeFalse();
    });

    it('isRequiredQuestionInvalid / isRequiredNoteInvalid only flag after a submit attempt', () => {
      component.industrialisationForm = baseForm();
      component.answers = {};
      component.industrialisationSubmitAttempted = false;
      expect(component.isRequiredQuestionInvalid(questionBoolElim)).toBeFalse();

      component.industrialisationSubmitAttempted = true;
      expect(component.isRequiredQuestionInvalid(questionBoolElim)).toBeTrue();
      expect(component.isRequiredQuestionInvalid(questionText)).toBeFalse(); // not obligatoire

      expect(component.isRequiredNoteInvalid(questionNote)).toBeTrue();
      component.answers[2] = { questionId: 2, valeurNumerique: 10, noteObtenue: 10 } as any;
      expect(component.isRequiredNoteInvalid(questionNote)).toBeFalse();
    });

    it('questionnaireReadyForSubmission / step helpers reflect the completion state', () => {
      component.industrialisationForm = null;
      expect(component.questionnaireReadyForSubmission()).toBeFalse();
      expect(component.isIndustrialisationStepActive(1)).toBeTrue();
      expect(component.isIndustrialisationStepActive(2)).toBeFalse();
      expect(component.isIndustrialisationStepActive(3)).toBeFalse();
      expect(component.isIndustrialisationStepCompleted(1)).toBeFalse();

      component.industrialisationForm = baseForm();
      component.answers = {};
      expect(component.questionnaireReadyForSubmission()).toBeFalse();
      expect(component.isIndustrialisationStepActive(1)).toBeFalse();
      expect(component.isIndustrialisationStepActive(2)).toBeTrue();
      expect(component.isIndustrialisationStepCompleted(1)).toBeTrue();
      expect(component.isIndustrialisationStepCompleted(2)).toBeFalse();

      fullyAnsweredForm();
      expect(component.questionnaireReadyForSubmission()).toBeTrue();
      expect(component.isIndustrialisationStepActive(2)).toBeFalse();
      expect(component.isIndustrialisationStepActive(3)).toBeTrue();
      expect(component.isIndustrialisationStepCompleted(2)).toBeTrue();
      expect(component.isIndustrialisationStepCompleted(3)).toBeFalse();
    });

    it('isQuestionAnswered covers every response type, including an unanswered/absent answer', () => {
      component.answers = {};
      expect(component.isQuestionAnswered(questionBoolElim)).toBeFalse();

      component.answers[1] = { questionId: 1, valeurBoolean: true } as any;
      expect(component.isQuestionAnswered(questionBoolElim)).toBeTrue();

      component.answers[2] = { questionId: 2, valeurNumerique: null } as any;
      expect(component.isQuestionAnswered(questionNote)).toBeFalse();
      component.answers[2] = { questionId: 2, valeurNumerique: 5 } as any;
      expect(component.isQuestionAnswered(questionNote)).toBeTrue();

      component.answers[4] = { questionId: 4, valeurUrl: '  ' } as any;
      expect(component.isQuestionAnswered(questionUrl)).toBeFalse();
      component.answers[4] = { questionId: 4, valeurUrl: 'http://x' } as any;
      expect(component.isQuestionAnswered(questionUrl)).toBeTrue();

      component.industrialisationForm = baseForm();
      expect(component.isQuestionAnswered(questionFichier)).toBeFalse();
      component.industrialisationForm!.candidature.reponses = [{ questionId: 5, preuveObjectName: 'x' }];
      expect(component.isQuestionAnswered(questionFichier)).toBeTrue();

      component.answers[3] = { questionId: 3, valeurTexte: '' } as any;
      expect(component.isQuestionAnswered(questionText)).toBeFalse();
      component.answers[3] = { questionId: 3, valeurTexte: 'x' } as any;
      expect(component.isQuestionAnswered(questionText)).toBeTrue();

      component.answers[6] = { questionId: 6, valeurTexte: 'choix' } as any;
      expect(component.isQuestionAnswered(questionChoix)).toBeTrue();
    });

    it('isNoteAnswered is vacuously true for non-NOTE criteria', () => {
      expect(component.isNoteAnswered(questionText)).toBeTrue();
      component.answers = { 2: { questionId: 2, noteObtenue: null } as any };
      expect(component.isNoteAnswered(questionNote)).toBeFalse();
      component.answers = { 2: { questionId: 2, noteObtenue: 15 } as any };
      expect(component.isNoteAnswered(questionNote)).toBeTrue();
    });

    it('questionTypeLabel covers every response type', () => {
      expect(component.questionTypeLabel(questionBoolElim)).toBe('Oui / Non');
      expect(component.questionTypeLabel(questionNote)).toBe('Numerique');
      expect(component.questionTypeLabel(questionUrl)).toBe('URL');
      expect(component.questionTypeLabel(questionFichier)).toBe('Fichier');
      expect(component.questionTypeLabel(questionChoix)).toBe('Choix');
      expect(component.questionTypeLabel(questionText)).toBe('Texte');
    });

    it('hasUploadedProof checks both the form-level and candidature-level reponses', () => {
      component.industrialisationForm = baseForm();
      expect(component.hasUploadedProof(questionFichier)).toBeFalse();

      component.industrialisationForm!.reponses = [{ questionId: 5, preuveObjectName: 'x' }];
      expect(component.hasUploadedProof(questionFichier)).toBeTrue();

      component.industrialisationForm!.reponses = [];
      component.industrialisationForm!.candidature.reponses = [{ questionId: 5, preuveOriginalFileName: 'x.pdf' }];
      expect(component.hasUploadedProof(questionFichier)).toBeTrue();
    });

    it('buildIndustrialisationAnswers (exercised through saveIndustrialisationAnswers) builds a payload per question type', () => {
      const form = fullyAnsweredForm();
      let captured: any;
      industrialisationServiceMock.saveReponses.and.callFake((_id: number, payload: any) => {
        captured = payload;
        return of(form.candidature);
      });
      component.saveIndustrialisationAnswers();
      const byId = (id: number) => captured.reponses.find((r: any) => r.questionId === id);
      expect(byId(1).reponseEliminatoire).toBe(ReponseEliminatoire.OK);
      expect(byId(2).noteObtenue).toBe(12);
      expect(byId(2).valeurNumerique).toBe(12);
      expect(byId(3).valeurTexte).toBe('texte');
      expect(byId(4).valeurUrl).toBe('http://x');
      expect(byId(6).valeurTexte).toBe('choix');
    });
  });
});