import { ComponentFixture, TestBed, fakeAsync, tick } from '@angular/core/testing';
import { of, throwError } from 'rxjs';
import { CandidatureIndustrialisation, IndustrialisationScore } from '../../core/models/industrialisation.model';
import { IndustrialisationService } from '../../core/services/industrialisation.service';
import { LivrableService } from '../../core/services/livrable.service';
import { CiIndustrialisationComponent } from './ci-industrialisation.component';

describe('CiIndustrialisationComponent', () => {
  let component: CiIndustrialisationComponent;
  let fixture: ComponentFixture<CiIndustrialisationComponent>;
  let industrialisationService: jasmine.SpyObj<IndustrialisationService>;
  let livrableService: jasmine.SpyObj<LivrableService>;

  const candidature: CandidatureIndustrialisation = {
    id: 11,
    projetId: 42,
    projetTitre: 'Plateforme IoT',
    projetStatut: 'REALISATION_TERMINEE',
    projetCategorie: 'RDI',
    projetDomaine: 'IoT',
    projetDescription: 'Desc',
    projetTechnologies: 'Angular, Spring Boot',
    demandeurNom: 'Jean Dupont',
    demandeurId: 7,
    typeIndustrialisation: 'INTERNE',
    statut: 'SOUMISE',
    dateDemande: '2026-01-01T00:00:00Z',
    dateSoumission: '2026-01-02T00:00:00Z',
    dateReceptionCI: null,
    ciDecideurId: null,
    ciDecideurNom: null,
    dateDecisionCI: null,
    decisionGoNoGo: null,
    orientation: null,
    motifDecision: null,
    commentaire: null,
    scoreEvaluationProjet: 80,
    eligibleIndustrialisation: true,
    bloqueParEliminatoire: false,
    livrables: [],
    reponses: [],
    historique: [],
    latestEvaluation: {
      id: 1,
      sujetProjetId: 42,
      scoreFinal: 80,
      eligibleIndustrialisation: true,
      bloqueParEliminatoire: false,
      dateCalcul: '2026-01-02T00:00:00Z',
      commentaire: '',
      calculatedBy: 'SYSTEM',
      recalculationReason: null,
      resultats: [],
    },
  };

  const score: IndustrialisationScore = {
    candidatureId: 11,
    projetId: 42,
    scoreFinal: 82,
    decisionRecommandee: 'GO',
    estBloqueParEliminatoire: false,
    blocagesEliminatoires: [],
    scoreQuestions: 80,
    scoreLivrables: 90,
    scoreCriteresNotes: 75,
    detailsCalcul: [
      { composant: 'QUESTIONNAIRE', reference: 'Q1', libelle: 'Question', score: 80, poids: 1, statut: 'OK', details: '', revueManuelleRequise: false },
    ],
    elementsManquants: [],
    message: 'GO recommande',
  };

  beforeEach(async () => {
    industrialisationService = jasmine.createSpyObj<IndustrialisationService>('IndustrialisationService', [
      'findCiRequests',
      'getCiDetail',
      'getCiScore',
      'decideGo',
      'decideNoGo',
    ]);
    livrableService = jasmine.createSpyObj<LivrableService>('LivrableService', ['downloadUrl']);
    industrialisationService.findCiRequests.and.returnValue(of([candidature]));
    industrialisationService.getCiDetail.and.returnValue(of(candidature));
    industrialisationService.getCiScore.and.returnValue(of(score));
    industrialisationService.decideGo.and.returnValue(of(candidature));
    industrialisationService.decideNoGo.and.returnValue(of(candidature));
    livrableService.downloadUrl.and.returnValue('http://download/1');

    await TestBed.configureTestingModule({
      imports: [CiIndustrialisationComponent],
      providers: [
        { provide: IndustrialisationService, useValue: industrialisationService },
        { provide: LivrableService, useValue: livrableService },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(CiIndustrialisationComponent);
    component = fixture.componentInstance;
  });

  it('should load requests and auto-open the first detail', () => {
    component.ngOnInit();

    expect(industrialisationService.findCiRequests).toHaveBeenCalled();
    expect(component.demandes().length).toBe(1);
    expect(component.selected()?.id).toBe(11);
    expect(component.score()?.scoreFinal).toBe(82);
  });

  it('should show missing livrables warning on CI detail', () => {
    component.selected.set({ ...candidature, warnings: [] });
    component.score.set(score);

    fixture.detectChanges();

    expect(component.submissionWarnings(component.selected())).toContain(component.missingLivrablesWarning);
    expect(fixture.nativeElement.textContent).toContain(component.missingLivrablesWarning);
    expect(fixture.nativeElement.querySelector('.alert--warning')?.textContent).toContain(component.missingLivrablesWarning);
  });

  it('should filter, compute labels and utility values', () => {
    component.demandes.set([candidature]);
    component.searchTerm = 'plateforme';
    expect(component.displayedDemandes().length).toBe(1);

    expect(component.statusLabel('GO' as never)).toBe('GO confirme');
    expect(component.statusClass('NO_GO' as never)).toBe('status-pill--nogo');
    expect(component.scoreClass(candidature)).toBe('score-card--success');
    expect(component.requestReference(candidature)).toBe('CI-0011');
    expect(component.projectYear(candidature)).toBe('2026');
    expect(component.technologyTags(candidature)).toEqual(['Angular', 'Spring Boot']);
    expect(component.initials(candidature)).toBe('PI');
    expect(component.downloadLivrable(1)).toBe('http://download/1');
    expect(component.livrableActionLabel({ objectName: 'obj' } as never)).toBe('Telecharger');
    expect(component.answerValue({ valeurBoolean: true } as never)).toBe('Oui');
    expect(component.blockingCriteriaCount(candidature)).toBe(0);
    expect(component.recommendation(candidature)).toBe('GO recommande');
    expect(component.recommendationExplanation(candidature)).toContain('GO');
    expect(component.analysisIssueCount(candidature)).toBe(0);
    expect(component.decisionLabel('NO_GO')).toBe('NO GO');
    expect(component.decisionClass('A_INSTRUIRE')).toBe('status-pill--instruction');
    expect(component.manualReviewCount(score)).toBe(0);
    expect(component.componentLabel('LIVRABLES')).toBe('Livrables');
  });

  it('should validate and execute decisions', fakeAsync(() => {
    component.selected.set(candidature);
    component.openDecision('GO');
    expect(component.decisionMode).toBe('GO');
    component.decideGo();
    expect(component.error()).toBe('Orientation obligatoire.');

    component.orientation = 'DSI';
    component.commentaire = 'Go';
    component.decideGo();
    expect(industrialisationService.decideGo).toHaveBeenCalledWith(11, { orientation: 'DSI', commentaire: 'Go' });

    tick(2500);

    component.selected.set(candidature);
    component.openDecision('NO_GO');
    component.decideNoGo();
    expect(component.error()).toBe('Motif obligatoire.');

    component.motif = 'No go';
    component.decideNoGo();
    expect(industrialisationService.decideNoGo).toHaveBeenCalledWith(11, { motif: 'No go' });
  }));

  it('should expose loading and error states', () => {
    industrialisationService.findCiRequests.and.returnValue(throwError(() => new Error('boom')));
    component.load();
    expect(component.error()).toBe('Impossible de charger les demandes.');
  });

  it('should compute domains, instruction counts, filters and sort orders', () => {
    const older = {
      ...candidature,
      id: 8,
      projetTitre: 'Ancien projet',
      projetDomaine: 'AI',
      statut: 'GO',
      scoreEvaluationProjet: 40,
      latestEvaluation: null,
      dateDemande: '2025-01-01T00:00:00Z',
      dateSoumission: null,
    } as CandidatureIndustrialisation;
    const noDomain = { ...candidature, id: 9, projetDomaine: '  ' } as CandidatureIndustrialisation;
    component.demandes.set([older, candidature, noDomain]);

    expect(component.domaines()).toEqual(['AI', 'IoT']);
    expect(component.demandesEnInstruction()).toBe(2);

    component.searchTerm = 'plateforme';
    expect(component.displayedDemandes().map((demande) => demande.id)).toEqual([11, 9]);

    component.searchTerm = '';
    component.domaineFilter = 'AI';
    expect(component.displayedDemandes().map((demande) => demande.id)).toEqual([8]);

    component.domaineFilter = '';
    component.sortBy = 'score-desc';
    expect(component.displayedDemandes()[0].id).toBe(11);

    component.sortBy = 'score-asc';
    expect(component.displayedDemandes()[0].id).toBe(8);

    component.sortBy = 'title-asc';
    expect(component.displayedDemandes()[0].id).toBe(8);
  });

  it('should handle detail and decision service errors', () => {
    industrialisationService.getCiDetail.and.returnValue(throwError(() => new Error('boom')));

    component.openDetail(11);

    expect(component.error()).toBe('Impossible de charger le detail.');
    expect(component.detailLoading()).toBeFalse();

    component.selected.set(candidature);
    component.orientation = 'DSI';
    industrialisationService.decideGo.and.returnValue(throwError(() => ({ error: { detail: 'Go refuse' } })));
    component.decideGo();
    expect(component.error()).toBe('Go refuse');

    industrialisationService.decideGo.and.returnValue(throwError(() => new Error('boom')));
    component.decideGo();
    expect(component.error()).toBe('Decision Go impossible.');

    component.motif = 'Motif';
    industrialisationService.decideNoGo.and.returnValue(throwError(() => ({ error: { detail: 'No go refuse' } })));
    component.decideNoGo();
    expect(component.error()).toBe('No go refuse');

    industrialisationService.decideNoGo.and.returnValue(throwError(() => new Error('boom')));
    component.decideNoGo();
    expect(component.error()).toBe('Decision No Go impossible.');
  });

  it('should load score for a converted candidature without sujet relation', () => {
    const converted = {
      ...candidature,
      id: 18,
      projetId: 55,
      scoreEvaluationProjet: 84,
      latestEvaluation: {
        id: 9,
        sujetProjetId: null,
        projetCatalogueId: 55,
        scoreFinal: 84,
        eligibleIndustrialisation: true,
        bloqueParEliminatoire: false,
        dateCalcul: '2026-01-02T00:00:00Z',
        commentaire: '',
        calculatedBy: 'SYSTEM',
        recalculationReason: null,
        resultats: [
          { id: 1, critereId: 20, critereLibelle: 'Qualite technique', typeCritere: 'NOTE', noteValue: 4, normalizedScore: 0.84 },
        ],
      },
    } as CandidatureIndustrialisation;
    const convertedScore = {
      ...score,
      candidatureId: 18,
      projetId: 55,
      scoreFinal: 84,
      detailsCalcul: [
        { composant: 'CRITERES_NOTES', reference: '20', libelle: 'Qualite technique', score: 84, poids: 1, statut: 'NOTE_PROJET', details: 'Evidence', revueManuelleRequise: false },
      ],
    } as IndustrialisationScore;

    industrialisationService.getCiDetail.and.returnValue(of(converted));
    industrialisationService.getCiScore.and.returnValue(of(convertedScore));

    component.openDetail(18);

    expect(industrialisationService.getCiDetail).toHaveBeenCalledWith(18);
    expect(industrialisationService.getCiScore).toHaveBeenCalledWith(18);
    expect(component.selected()?.id).toBe(18);
    expect(component.score()?.scoreFinal).toBe(84);
    expect(component.score()?.detailsCalcul.length).toBe(1);
    expect(component.error()).toBeNull();
  });

  it('should keep detail when score fails and display Non calculé', () => {
    industrialisationService.getCiDetail.and.returnValue(of({
      ...candidature,
      scoreEvaluationProjet: null,
      latestEvaluation: null,
    }));
    industrialisationService.getCiScore.and.returnValue(throwError(() => new Error('score boom')));

    component.openDetail(11);

    expect(component.selected()?.id).toBe(11);
    expect(component.score()).toBeNull();
    expect(component.detailLoading()).toBeFalse();
    expect(component.error()).toBeNull();
    expect(component.scoreDisplay(component.selected()!)).toBe('Non calculé');
  });

  it('should show error banner only for genuine detail request failures', () => {
    industrialisationService.getCiDetail.and.returnValue(throwError(() => ({ status: 500 })));
    component.openDetail(18);
    expect(component.error()).toBe('Impossible de charger le detail.');
    expect(component.selected()).toBeNull();
  });

  it('should not reinterpret candidatureId as sujetId or projetId for score calls', () => {
    industrialisationService.getCiDetail.and.returnValue(of({ ...candidature, id: 18, projetId: 55 }));
    industrialisationService.getCiScore.and.returnValue(of({ ...score, candidatureId: 18, projetId: 55 }));

    component.openDetail(18);

    expect(industrialisationService.getCiScore).toHaveBeenCalledOnceWith(18);
    expect(industrialisationService.getCiScore).not.toHaveBeenCalledWith(55);
    expect(industrialisationService.getCiScore).not.toHaveBeenCalledWith(42);
  });

  it('should open/close decision and livrables modals and finish after a decision', fakeAsync(() => {
    component.openLivrablesModal();
    expect(component.livrablesModalOpen).toBeTrue();
    component.closeLivrablesModal();
    expect(component.livrablesModalOpen).toBeFalse();

    component.openDecision('GO');
    expect(component.decisionMode).toBe('GO');
    component.closeDecision();
    expect(component.decisionMode).toBeNull();

    component.afterDecision(candidature, 'Decision enregistree.');
    expect(component.selected()).toBe(candidature);
    expect(component.message()).toBe('Decision enregistree.');
    expect(industrialisationService.findCiRequests).toHaveBeenCalled();

    tick(2500);
    expect(component.message()).toBeNull();
  }));

  it('should cover status, score and recommendation fallback branches', () => {
    const blocked = {
      ...candidature,
      id: 12,
      eligibleIndustrialisation: false,
      bloqueParEliminatoire: true,
      latestEvaluation: {
        ...candidature.latestEvaluation!,
        scoreFinal: 50,
        evaluationComplete: false,
        resultats: [
          { id: 1, critereId: 1, critereLibelle: 'Git', typeCritere: 'ELIMINATOIRE', reponseEliminatoire: 'NOT_OK', ruleConfigured: false },
        ],
      },
    } as CandidatureIndustrialisation;
    const lowScore = { ...candidature, id: 13, scoreEvaluationProjet: 40, latestEvaluation: null } as CandidatureIndustrialisation;
    const noDate = { ...candidature, id: 14, projetDateCreation: null, dateDemande: '' } as CandidatureIndustrialisation;

    component.score.set({ ...score, candidatureId: 12, decisionRecommandee: 'NO_GO', estBloqueParEliminatoire: true });
    expect(component.scoreValue(blocked)).toBe(score.scoreFinal);
    expect(component.scoreClass(blocked)).toBe('score-card--danger');
    expect(component.recommendation(blocked)).toBe('NO GO recommande');
    expect(component.recommendationExplanation(blocked)).toBe(score.message);

    component.score.set({ ...score, candidatureId: 12, decisionRecommandee: 'A_INSTRUIRE', estBloqueParEliminatoire: false });
    expect(component.recommendation(blocked)).toBe('A instruire');

    component.score.set(null);
    const reviewRequired = {
      ...candidature,
      eligibleIndustrialisation: true,
      latestEvaluation: {
        ...candidature.latestEvaluation!,
        eligibilityStatus: 'REVIEW_REQUIRED',
        mlStatus: 'PARTIAL_ANALYSIS',
        validationStatus: 'PENDING',
        finalValidatedScore: null,
      },
    } as CandidatureIndustrialisation;
    expect(component.eligibilityDisplay(reviewRequired)).toBe('Revue requise');
    expect(component.scoreTitle(reviewRequired)).toBe('Score provisoire');
    expect(component.scoreValue(blocked)).toBe(50);
    expect(component.scoreClass(blocked)).toBe('score-card--warning');
    expect(component.scoreClass(lowScore)).toBe('score-card--warning');
    expect(component.blockingCriteriaCount(blocked)).toBe(1);
    expect(component.blockingCriteriaCount({ ...blocked, latestEvaluation: null })).toBe(1);
    expect(component.recommendation(blocked)).toBe('Analyse nécessaire');
    expect(component.recommendation({ ...candidature, latestEvaluation: { ...candidature.latestEvaluation!, evaluationComplete: false } })).toBe('Analyse nécessaire');
    expect(component.recommendation({ ...candidature, latestEvaluation: null })).toBe('GO recommande');
    expect(component.recommendation(lowScore)).toBe('Analyse nécessaire');
    expect(component.recommendationExplanation(blocked)).toContain('Alerte éliminatoire');
    expect(component.recommendationExplanation({ ...candidature, latestEvaluation: { ...candidature.latestEvaluation!, evaluationComplete: false } })).toContain('Analyse nécessaire');
    expect(component.analysisIssueCount(blocked)).toBe(1);

    expect(component.statusLabel('REFUSEE')).toBe('NO GO');
    expect(component.statusLabel('RECUE_PAR_CI')).toBe('En instruction');
    expect(component.statusLabel('BROUILLON')).toBe('Brouillon');
    expect(component.statusClass('GO')).toBe('status-pill--go');
    expect(component.canDecide(null)).toBeFalse();
    expect(component.canDecide({ ...candidature, statut: 'GO' })).toBeFalse();
    expect(component.projectYear(noDate)).toBe('-');
  });

  it('should cover utility formatting branches', () => {
    expect(component.formatSize(null)).toBe('-');
    expect(component.formatSize(512)).toBe('1 Ko');
    expect(component.formatSize(2 * 1024 * 1024)).toBe('2.0 Mo');
    expect(component.livrableActionLabel({ objectName: null } as never)).toBe('Ouvrir');
    expect(component.answerValue({ valeurTexte: 'Texte' } as never)).toBe('Texte');
    expect(component.answerValue({ valeurUrl: 'https://example.com' } as never)).toBe('https://example.com');
    expect(component.answerValue({ valeurNumerique: 12 } as never)).toBe('12');
    expect(component.answerValue({ valeurBoolean: false } as never)).toBe('Non');
    expect(component.answerValue({ preuveOriginalFileName: 'preuve.pdf' } as never)).toBe('preuve.pdf');
    expect(component.answerValue({ reponseEliminatoire: 'OK' } as never)).toBe('OK');
    expect(component.answerValue({} as never)).toBe('-');
    expect(component.initials({ ...candidature, projetTitre: '   ' })).toBe('CI');
    expect(component.technologyTags({ ...candidature, projetTechnologies: 'A; B\nC,D,E,F,G' })).toEqual(['A', 'B', 'C', 'D', 'E', 'F']);
    expect(component.manualReviewCount({ ...score, detailsCalcul: [{ ...score.detailsCalcul[0], revueManuelleRequise: true }] })).toBe(1);
    expect(component.manualReviewCount(null)).toBe(0);
    expect(component.componentLabel('QUESTIONNAIRE_Q1')).toBe('Questionnaire');
    expect(component.componentLabel('CRITERES_NOTES')).toBe('Critères notés');
    expect(component.componentLabel('AUTRE')).toBe('AUTRE');
    expect(component.decisionLabel('A_INSTRUIRE')).toBe('A instruire');
    expect(component.decisionClass('GO')).toBe('status-pill--go');
    expect(component.decisionClass('NO_GO')).toBe('status-pill--nogo');
  });

  it('should compute personInitials correctly', () => {
    expect(component.personInitials('Jean Dupont')).toBe('JD');
    expect(component.personInitials('  ')).toBe('CI');
    expect(component.personInitials('Alice')).toBe('A');
  });

  it('should return submissionWarnings for null candidature', () => {
    expect(component.submissionWarnings(null)).toEqual([]);
  });

  it('should return submissionWarnings preserving existing warnings', () => {
    const withWarnings = { ...candidature, livrables: [], warnings: ['Existing warning'] };
    const result = component.submissionWarnings(withWarnings);
    expect(result).toContain('Existing warning');
    expect(result).toContain(component.missingLivrablesWarning);
  });

  it('should not duplicate missingLivrablesWarning when already present', () => {
    const withWarning = { ...candidature, livrables: [], warnings: [component.missingLivrablesWarning] };
    const result = component.submissionWarnings(withWarning);
    const count = result.filter((w) => w === component.missingLivrablesWarning).length;
    expect(count).toBe(1);
  });

  it('should compute eligibilityDisplay for all statuses', () => {
    const eligible = { ...candidature, latestEvaluation: { ...candidature.latestEvaluation!, eligibilityStatus: 'ELIGIBLE' } };
    expect(component.eligibilityDisplay(eligible)).toBe('Éligible');

    const notEligibleEtat = { ...candidature, latestEvaluation: { ...candidature.latestEvaluation!, eligibilityStatus: 'NON_ELIGIBLE_EN_L_ETAT' } };
    expect(component.eligibilityDisplay(notEligibleEtat)).toBe('Non éligible en l\u2019état');

    const notEvaluable = { ...candidature, latestEvaluation: { ...candidature.latestEvaluation!, eligibilityStatus: 'NOT_EVALUABLE' } };
    expect(component.eligibilityDisplay(notEvaluable)).toBe('Non évaluable');

    const falseEligible = { ...candidature, eligibleIndustrialisation: false };
    expect(component.eligibilityDisplay(falseEligible)).toBe('Non éligible');

    const trueEligible = { ...candidature, eligibleIndustrialisation: true, latestEvaluation: null };
    expect(component.eligibilityDisplay(trueEligible)).toBe('Éligible industrialisation');
  });

  it('should compute scoreTitle for all branches', () => {
    const validated = { ...candidature, latestEvaluation: { ...candidature.latestEvaluation!, validationStatus: 'VALIDATED', finalValidatedScore: 80 } };
    expect(component.scoreTitle(validated)).toBe('Score final validé');

    const overridden = { ...candidature, latestEvaluation: { ...candidature.latestEvaluation!, validationStatus: 'OVERRIDDEN', finalValidatedScore: 90 } };
    expect(component.scoreTitle(overridden)).toBe('Score final validé');

    const latest = { ...candidature, latestEvaluation: { ...candidature.latestEvaluation! } };
    expect(component.scoreTitle(latest)).toBe('Score officiel provisoire');

    const noLatest = { ...candidature, latestEvaluation: null };
    expect(component.scoreTitle(noLatest)).toBe('Score final');
  });

  it('should compute scoreValue for uncalculated evaluation', () => {
    const uncalc = {
      ...candidature,
      latestEvaluation: { ...candidature.latestEvaluation!, mlStatus: 'FAILED_RETRYABLE', processingStatus: null },
    };
    expect(component.scoreValue(uncalc)).toBeNull();
  });

  it('should compute scoreValue for candidature with finalValidatedScore', () => {
    const withValidated = {
      ...candidature,
      latestEvaluation: { ...candidature.latestEvaluation!, finalValidatedScore: 95, scoreFinal: 70 },
    };
    component.score.set(null);
    expect(component.scoreValue(withValidated)).toBe(95);
  });

  it('should compute scoreValue for candidature with scoreFinal only', () => {
    const withScore = {
      ...candidature,
      latestEvaluation: { ...candidature.latestEvaluation!, finalValidatedScore: null, scoreFinal: 70 },
    };
    component.score.set(null);
    expect(component.scoreValue(withScore)).toBe(70);
  });

  it('should compute scoreValue for candidature with scoreEvaluationProjet 0', () => {
    const zeroScore = { ...candidature, scoreEvaluationProjet: 0, latestEvaluation: null };
    expect(component.scoreValue(zeroScore)).toBeNull();
  });

  it('should compute scoreValue for candidature with null scoreEvaluationProjet', () => {
    const nullScore = { ...candidature, scoreEvaluationProjet: null, latestEvaluation: null };
    expect(component.scoreValue(nullScore)).toBeNull();
  });

  it('should compute scoreClass for NOT_EVALUABLE', () => {
    const notEvaluable = {
      ...candidature,
      latestEvaluation: { ...candidature.latestEvaluation!, eligibilityStatus: 'NOT_EVALUABLE' },
    };
    component.score.set(null);
    expect(component.scoreClass(notEvaluable)).toBe('score-card--danger');
  });

  it('should compute scoreClass for REVIEW_REQUIRED', () => {
    const review = {
      ...candidature,
      latestEvaluation: { ...candidature.latestEvaluation!, eligibilityStatus: 'REVIEW_REQUIRED' },
    };
    component.score.set(null);
    expect(component.scoreClass(review)).toBe('score-card--warning');
  });

  it('should compute scoreDisplay correctly', () => {
    expect(component.scoreDisplay(candidature)).toBe('80');
    const noScore = { ...candidature, scoreEvaluationProjet: null, latestEvaluation: null };
    component.score.set(null);
    expect(component.scoreDisplay(noScore)).toBe('-');
  });

  it('should compute currentDecisionOrEligibility', () => {
    const uncalc = {
      ...candidature,
      latestEvaluation: { ...candidature.latestEvaluation!, mlStatus: 'FAILED_RETRYABLE' },
    };
    expect(component.currentDecisionOrEligibility(uncalc)).toBe('Éligible industrialisation');
  });

  it('should compute currentDecisionOrEligibility with score', () => {
    expect(component.currentDecisionOrEligibility(candidature)).toBe('Éligible industrialisation');
  });

  it('should compute useBackendIndustrialisationScore and backendIndustrialisationScore', () => {
    expect(component.useBackendIndustrialisationScore(candidature)).toBeFalse();
    expect(component.backendIndustrialisationScore(candidature)).toBeNull();

    const noBackend = { ...candidature, latestEvaluation: { ...candidature.latestEvaluation!, mlStatus: 'FAILED_RETRYABLE' } };
    component.score.set(null);
    expect(component.useBackendIndustrialisationScore(noBackend)).toBeFalse();
    expect(component.backendIndustrialisationScore(noBackend)).toBeNull();
  });

  it('should compute decisionHelperTone correctly', () => {
    expect(component.decisionHelperTone(candidature)).toBe('go');

    component.score.set({ ...score, decisionRecommandee: 'NO_GO' });
    expect(component.decisionHelperTone({ ...candidature, id: 11 })).toBe('nogo');

    component.score.set(null);
    const neutral = { ...candidature, scoreEvaluationProjet: 40, latestEvaluation: null };
    expect(component.decisionHelperTone(neutral)).toBe('neutral');
  });

  it('should compute recommendation for uncalculated evaluation', () => {
    const uncalc = {
      ...candidature,
      latestEvaluation: { ...candidature.latestEvaluation!, mlStatus: 'FAILED_RETRYABLE' },
    };
    expect(component.recommendation(uncalc)).toBe('Analyse non calculée');
  });

  it('should compute recommendationExplanation for uncalculated evaluation', () => {
    const uncalc = {
      ...candidature,
      latestEvaluation: { ...candidature.latestEvaluation!, mlStatus: 'FAILED_RETRYABLE' },
    };
    expect(component.recommendationExplanation(uncalc)).toContain('Aucun score');
  });

  it('should compute recommendationExplanation with elim warning count > 0', () => {
    const withElimWarning = {
      ...candidature,
      latestEvaluation: null,
      scoreEvaluationProjet: 40,
      elimWarningsCount: 1,
    } as any;
    expect(component.recommendationExplanation(withElimWarning)).toContain('Alerte éliminatoire');
  });

  it('should compute recommendationExplanation default branch', () => {
    const defaultCase = { ...candidature, latestEvaluation: null, scoreEvaluationProjet: 40 };
    expect(component.recommendationExplanation(defaultCase)).toContain('decision GO');
  });

  it('should compute analysisIssueCount with warnings and errorMessage', () => {
    const withIssues = {
      ...candidature,
      latestEvaluation: {
        ...candidature.latestEvaluation!,
        resultats: [{ id: 1, critereId: 1, critereLibelle: 'test', typeCritere: 'NOTE', ruleConfigured: false } as any],
        mlWarnings: ['WARN1'],
        errorMessage: 'Some error',
      },
    };
    expect(component.analysisIssueCount(withIssues)).toBe(3);
  });

  it('should compute analysisIssueCount with no evaluation', () => {
    const noEval = { ...candidature, latestEvaluation: null };
    expect(component.analysisIssueCount(noEval)).toBe(0);
  });

  it('should compute eliminatoryWarningCount from candidature.eliminatoryWarningsCount', () => {
    const withCount = { ...candidature, eliminatoryWarningsCount: 3, latestEvaluation: null } as any;
    component.score.set(null);
    expect(component.eliminatoryWarningCount(withCount)).toBe(3);
  });

  it('should compute eliminatoryWarningCount from bloqueParEliminatoire', () => {
    const blocked = { ...candidature, bloqueParEliminatoire: true, latestEvaluation: null };
    component.score.set(null);
    expect(component.eliminatoryWarningCount(blocked)).toBe(1);
  });

  it('should load and auto-select first visible when selected no longer visible', () => {
    industrialisationService.findCiRequests.and.returnValue(of([]));
    component.load();
    expect(component.selected()).toBeNull();
    expect(component.score()).toBeNull();
  });

  it('should load and keep selected when still visible', () => {
    component.selected.set(candidature);
    industrialisationService.findCiRequests.and.returnValue(of([candidature]));
    component.load();
    expect(component.selected()?.id).toBe(11);
  });

  it('should handle onStatutChange and onTypeChange', () => {
    component.onStatutChange('GO');
    expect(component.statutFilter).toBe('GO');
    expect(industrialisationService.findCiRequests).toHaveBeenCalled();

    component.onTypeChange('EXTERNE');
    expect(component.typeFilter).toBe('EXTERNE');
  });

  it('should handle onDomaineChange and onSortChange', () => {
    component.onDomaineChange('IoT');
    expect(component.domaineFilter).toBe('IoT');

    component.onSortChange('score-asc');
    expect(component.sortBy).toBe('score-asc');
  });

  it('should handle normalize edge cases', () => {
    const privateComp = component as any;
    expect(privateComp.normalize(null)).toBe('');
    expect(privateComp.normalize(undefined)).toBe('');
    expect(privateComp.normalize('Hello')).toBe('hello');
  });

  it('should handle currentScoreCardValue and currentScoreCardSuffix', () => {
    expect(component.currentScoreCardValue(candidature)).toBe('80');
    expect(component.currentScoreCardSuffix(candidature)).toBe('/100');
  });
});
