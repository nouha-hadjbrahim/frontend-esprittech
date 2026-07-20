import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { of, throwError } from 'rxjs';
import { EvaluationResponse, ProjetEvaluable } from '../../core/models/evaluation.model';
import { AuthService } from '../../core/services/auth.service';
import { EvaluationService } from '../../core/services/evaluation.service';
import { ProjetEvaluableService } from '../../core/services/projet-evaluable.service';
import { EvaluationPageComponent } from './evaluation-page.component';

describe('EvaluationPageComponent', () => {
  let component: EvaluationPageComponent;
  let projetService: jasmine.SpyObj<ProjetEvaluableService>;
  let evaluationService: jasmine.SpyObj<EvaluationService>;
  let authService: jasmine.SpyObj<AuthService>;

  const projects: ProjetEvaluable[] = [
    {
      id: 1,
      titre: 'Plateforme IoT',
      statut: 'REALISATION_TERMINEE',
      scoreFinal: null,
      eligibleIndustrialisation: undefined,
      bloqueParEliminatoire: false,
    },
    {
      id: 2,
      titre: 'Moteur IA',
      statut: 'REALISATION_TERMINEE',
      scoreFinal: 88,
      eligibleIndustrialisation: true,
      bloqueParEliminatoire: false,
    },
    {
      id: 3,
      titre: 'Brouillon',
      statut: 'EN_ATTENTE',
      scoreFinal: 20,
      eligibleIndustrialisation: false,
      bloqueParEliminatoire: true,
    },
  ];

  const evaluation: EvaluationResponse = {
    id: 7,
    sujetProjetId: 1,
    scoreFinal: 67,
    eligibleIndustrialisation: false,
    bloqueParEliminatoire: true,
    dateCalcul: '2026-01-01T00:00:00Z',
    commentaire: '',
    calculatedBy: 'ROLE_ADMIN Admin Root',
    recalculationReason: 'Recalcul manuel',
    resultats: [],
    mlStatus: 'COMPLETED',
    mlModelVersion: '2.0.0',
    pipelineVersion: 'multimodal-semantic-v2',
    mlGlobalConfidence: 0.8,
    mlScore: 67,
    finalValidatedScore: null,
    validationStatus: 'PENDING',
  };

  beforeEach(() => {
    projetService = jasmine.createSpyObj<ProjetEvaluableService>('ProjetEvaluableService', ['getEvaluables']);
    evaluationService = jasmine.createSpyObj<EvaluationService>('EvaluationService', [
      'calculateScore',
      'getLatestEvaluation',
      'getEvaluationHistory',
      'validateEvaluation',
      'rejectEvaluation',
      'overrideEvaluation',
    ]);
    authService = jasmine.createSpyObj<AuthService>('AuthService', ['getRole']);

    projetService.getEvaluables.and.returnValue(of(projects));
    evaluationService.calculateScore.and.returnValue(of(evaluation));
    evaluationService.getLatestEvaluation.and.returnValue(of(evaluation));
    evaluationService.getEvaluationHistory.and.returnValue(of([evaluation]));
    evaluationService.validateEvaluation.and.returnValue(of({ ...evaluation, validationStatus: 'VALIDATED', finalValidatedScore: 67 }));
    evaluationService.rejectEvaluation.and.returnValue(of({ ...evaluation, validationStatus: 'REJECTED' }));
    evaluationService.overrideEvaluation.and.returnValue(of({ ...evaluation, validationStatus: 'OVERRIDDEN', finalValidatedScore: 91 }));
    authService.getRole.and.returnValue('ROLE_ADMIN');

    TestBed.configureTestingModule({
      imports: [EvaluationPageComponent],
      providers: [
        provideRouter([]),
        { provide: ProjetEvaluableService, useValue: projetService },
        { provide: EvaluationService, useValue: evaluationService },
        { provide: AuthService, useValue: authService },
      ],
    });

    component = TestBed.createComponent(EvaluationPageComponent).componentInstance;
  });

  it('should load only completed projects and expose counters', () => {
    component.ngOnInit();

    expect(projetService.getEvaluables).toHaveBeenCalled();
    expect(component.projects().map((project) => project.id)).toEqual([1, 2]);
    expect(component.loadingProjects()).toBeFalse();
    expect(component.evaluatedCount).toBe(1);
    expect(component.eligibleCount).toBe(1);
    expect(component.nonEligibleCount).toBe(0);
  });

  it('should expose an empty-state error when no completed project is available', () => {
    projetService.getEvaluables.and.returnValue(of([projects[2]]));

    component.loadProjects();

    expect(component.projects()).toEqual([]);
    expect(component.projectsError()).toContain('Aucun projet');
    expect(component.loadingProjects()).toBeFalse();
  });

  it('should expose a load error when project retrieval fails', () => {
    projetService.getEvaluables.and.returnValue(throwError(() => new Error('boom')));

    component.loadProjects();

    expect(component.projectsError()).toContain('Impossible de charger');
    expect(component.loadingProjects()).toBeFalse();
  });

  it('should filter projects with normalized text and eligibility labels', () => {
    component.projects.set(projects);

    expect(component.filteredProjects().length).toBe(3);

    component.updateProjectSearch('eligible');
    expect(component.filteredProjects().map((project) => project.id)).toEqual([2, 3]);

    component.updateProjectSearch('non eligible');
    expect(component.filteredProjects().map((project) => project.id)).toEqual([3]);

    component.updateProjectSearch('en attente');
    expect(component.filteredProjects().map((project) => project.id)).toEqual([1]);

    component.updateProjectSearch('plateforme');
    expect(component.filteredProjects().map((project) => project.id)).toEqual([1]);
  });

  it('should select a project and clear the evaluation when latest retrieval fails', () => {
    component.selectProject(projects[0]);
    expect(evaluationService.getLatestEvaluation).toHaveBeenCalledWith(1);
    expect(evaluationService.getEvaluationHistory).toHaveBeenCalledWith(1);
    expect(component.selectedProject).toEqual(jasmine.objectContaining({
      id: 1,
      scoreFinal: 67,
      eligibleIndustrialisation: false,
      bloqueParEliminatoire: true,
    }));
    expect(component.evalResult()).toBe(evaluation);
    expect(component.evalHistory()).toEqual([evaluation]);

    component.evalResult.set(evaluation);
    evaluationService.getLatestEvaluation.and.returnValue(throwError(() => new Error('boom')));
    component.selectProject(projects[1]);

    expect(component.evalResult()).toBeNull();
    expect(component.evalError()).toBeNull();
  });
it('should calculate score, update the matching row and leave other rows untouched', () => {
  component.projects.set(projects.slice(0, 2));

  component.calculate(projects[0]);

  expect(evaluationService.calculateScore).toHaveBeenCalledWith(1);
  expect(evaluationService.getEvaluationHistory).toHaveBeenCalledWith(1);
  expect(component.evalResult()).toBe(evaluation);
  expect(component.selectedProject).toEqual(jasmine.objectContaining({
    id: 1,
    scoreFinal: 67,
    eligibleIndustrialisation: false,
    bloqueParEliminatoire: true,
  }));
  expect(component.savingProjectId()).toBeNull();

  expect(component.projects()[0]).toEqual(jasmine.objectContaining({
    id: 1,
    scoreFinal: 67,
    eligibleIndustrialisation: false,
    bloqueParEliminatoire: true,
  }));

    expect(component.projects()[1]).toBe(projects[1]);
});
  it('should label failed evaluations as non calculated and expose current eligibility', () => {
    const failed = {
      ...evaluation,
      scoreFinal: 0,
      mlScore: null,
      mlStatus: 'FAILED_RETRYABLE',
      eligibilityStatus: 'REVIEW_REQUIRED',
      finalValidatedScore: null,
    } as EvaluationResponse;

    expect(component.scoreFor(failed)).toBeNull();
    expect(component.scoreLabelFor(failed)).toBe('Non calculé');
    expect(component.scoreTitleFor(failed)).toBe('Score non calculé');
    expect(component.mlScoreLabelFor(failed)).toBe('Non calculé');
    expect(component.eligibilityLabelFor(failed)).toBe('Revue requise');
  });

  it('should label partial pending analysis as provisional', () => {
    const partial = {
      ...evaluation,
      mlStatus: 'PARTIAL_ANALYSIS',
      eligibilityStatus: 'REVIEW_REQUIRED',
      validationStatus: 'PENDING',
      finalValidatedScore: null,
    } as EvaluationResponse;

    expect(component.scoreTitleFor(partial)).toBe('Score provisoire');
    expect(component.scoreLabelFor(partial)).toBe('67.00 / 100');
    expect(component.eligibilityLabelFor(partial)).toBe('Revue requise');
  });

  it('should expose calculation errors with backend detail and fallback text', () => {
    evaluationService.calculateScore.and.returnValue(throwError(() => ({ error: { detail: 'Score indisponible' } })));

    component.calculate(projects[0]);

    expect(component.evalError()).toBe('Score indisponible');
    expect(component.savingProjectId()).toBeNull();

    evaluationService.calculateScore.and.returnValue(throwError(() => new Error('boom')));
    component.calculate(projects[0]);

    expect(component.evalError()).toBe('Erreur lors du calcul du score.');
  });

  it('should validate, reject and override the selected evaluation according to role', () => {
    component.selectedProject = projects[0];
    component.evalResult.set(evaluation);
    component.updateValidationComment('reviewed');

    component.validateSelectedEvaluation();
    expect(evaluationService.validateEvaluation).toHaveBeenCalledWith(1, 'reviewed');
    expect(component.evalResult()?.validationStatus).toBe('VALIDATED');

    component.rejectSelectedEvaluation();
    expect(evaluationService.rejectEvaluation).toHaveBeenCalledWith(1, '');
    expect(component.evalResult()?.validationStatus).toBe('REJECTED');

    component.updateOverrideScore('91');
    component.updateOverrideReason('admin correction');
    component.overrideSelectedEvaluation();
    expect(evaluationService.overrideEvaluation).toHaveBeenCalledWith(1, 91, 'admin correction');
    expect(component.evalResult()?.finalValidatedScore).toBe(91);
    expect(component.canValidateEvaluation()).toBeTrue();
    expect(component.canOverrideEvaluation()).toBeTrue();

    authService.getRole.and.returnValue('ROLE_ENSEIGNANT');
    expect(component.canValidateEvaluation()).toBeFalse();
    expect(component.canOverrideEvaluation()).toBeFalse();
  });

  it('should format status labels and complete destroy lifecycle', () => {
    expect(component.statusLabel('REALISATION_TERMINEE')).toBe('Réalisation terminée');
    expect(component.statusLabel('EN_ATTENTE')).toBe('EN_ATTENTE');

    component.ngOnDestroy();
    expect(component).toBeTruthy();
  });

  it('should expose statusBadgeClass correctly', () => {
    expect(component.statusBadgeClass('REALISATION_TERMINEE')).toBe('badge--statut-terminee');
    expect(component.statusBadgeClass('EN_ATTENTE')).toBe('badge--neutral');
  });

  it('should compute analyzeButtonTitle for all states', () => {
    component.projects.set(projects);
    expect(component.analyzeButtonTitle(projects[0])).toBe('Analyser le contenu');
    expect(component.analyzeButtonTitle(projects[1])).toBe('Réanalyser');

    component.savingProjectId.set(1);
    expect(component.analyzeButtonTitle(projects[0])).toBe('Analyse en cours…');
    component.savingProjectId.set(null);
  });

  it('should compute projectScoreClass for all ranges', () => {
    component.projects.set(projects);

    expect(component.projectScoreClass(projects[0])).toBe('badge--score-pending');
    expect(component.projectScoreClass(projects[1])).toBe('badge--score-high');

    const midScoreProject = { ...projects[1], scoreFinal: 55, latestEvaluation: null };
    expect(component.projectScoreClass(midScoreProject)).toBe('badge--score-mid');

    const lowScoreProject = { ...projects[1], scoreFinal: 30, latestEvaluation: null };
    expect(component.projectScoreClass(lowScoreProject)).toBe('badge--score-low');

    const withLatest = { ...projects[1], scoreFinal: 30, latestEvaluation: { scoreFinal: 80 } as EvaluationResponse };
    expect(component.projectScoreClass(withLatest)).toBe('badge--score-high');
  });

  it('should close filters on outside click', () => {
    component.openFilter.set('eligibilite');
    component.closeFiltersOnOutsideClick();
    expect(component.openFilter()).toBeNull();
  });

  it('should toggle and select eligibilite filter', () => {
    const event = jasmine.createSpyObj<Event>('Event', ['stopPropagation']);
    component.toggleFilter('eligibilite', event);
    expect(component.openFilter()).toBe('eligibilite');

    component.toggleFilter('eligibilite', event);
    expect(component.openFilter()).toBeNull();

    component.selectEligibiliteFilter('ELIGIBLE');
    expect(component.selectedEligibilite()).toBe('ELIGIBLE');
    expect(component.openFilter()).toBeNull();
    expect(component.page).toBe(0);
  });

  it('should navigate pages with prevPage, nextPage, goToPage', () => {
    component.projects.set(projects);
    expect(component.first()).toBeTrue();

    component.nextPage();
    expect(component.page).toBe(0);

    component.page = 0;
    component.prevPage();
    expect(component.page).toBe(0);

    component.goToPage(5);
    expect(component.page).toBe(0);

    component.goToPage(0);
    expect(component.page).toBe(0);

    component.goToPage(0);
    expect(component.page).toBe(0);
  });

  it('should expose getInitial correctly', () => {
    expect(component.getInitial('Test')).toBe('T');
    expect(component.getInitial('')).toBe('?');
    expect(component.getInitial('  ')).toBe('?');
  });

  it('should update override score and handle NaN', () => {
    component.updateOverrideScore('abc');
    expect(component.overrideScore()).toBeNull();

    component.updateOverrideScore('42');
    expect(component.overrideScore()).toBe(42);
  });

  it('should compute confidencePercent with various inputs', () => {
    expect(component.confidencePercent(null)).toBe('-');
    expect(component.confidencePercent(0.85)).toBe('85%');
    expect(component.confidencePercent(50)).toBe('50%');
    expect(component.confidencePercent(-10)).toBe('0%');
    expect(component.confidencePercent(200)).toBe('100%');
  });

  it('should reject override with invalid score', () => {
    component.selectedProject = projects[0];
    component.updateOverrideScore('abc');
    component.overrideSelectedEvaluation();
    expect(component.evalError()).toBe('Le score override doit etre compris entre 0 et 100.');

    component.updateOverrideScore(-5);
    component.overrideSelectedEvaluation();
    expect(component.evalError()).toBe('Le score override doit etre compris entre 0 et 100.');

    component.updateOverrideScore(105);
    component.overrideSelectedEvaluation();
    expect(component.evalError()).toBe('Le score override doit etre compris entre 0 et 100.');
  });

  it('should handle ROLE_CI for canValidateEvaluation', () => {
    authService.getRole.and.returnValue('ROLE_CI');
    expect(component.canValidateEvaluation()).toBeTrue();
    expect(component.canOverrideEvaluation()).toBeFalse();
  });

  it('should not run evaluation action when no project selected or action in progress', () => {
    component.selectedProject = null;
    component.validateSelectedEvaluation();
    expect(evaluationService.validateEvaluation).not.toHaveBeenCalled();

    component.selectedProject = projects[0];
    component.actionInProgress.set(true);
    component.validateSelectedEvaluation();
    expect(evaluationService.validateEvaluation).not.toHaveBeenCalled();
    component.actionInProgress.set(false);
  });

  it('should handle evaluation action errors', () => {
    component.selectedProject = projects[0];
    evaluationService.validateEvaluation.and.returnValue(throwError(() => new Error('boom')));
    component.validateSelectedEvaluation();
    expect(component.evalError()).toBe('Action impossible sur cette evaluation.');
    expect(component.actionInProgress()).toBeFalse();
  });

  it('should format eligibiliteFilterLabel', () => {
    expect(component.eligibiliteFilterLabel).toBe('Toutes les éligibilités');
    component.selectedEligibilite.set('ELIGIBLE');
    expect(component.eligibiliteFilterLabel).toBe('Éligible');
  });

  it('should compute cooldownLabel', () => {
    expect(component.cooldownLabel(1)).toBe('0:00');
  });

  it('should compute projectScoreLabel and projectEligibilityLabel', () => {
    const projectWithEval = {
      ...projects[1],
      latestEvaluation: { ...evaluation, scoreFinal: 88, eligibilityStatus: 'ELIGIBLE' } as EvaluationResponse,
    };
    expect(component.projectScoreLabel(projectWithEval)).toContain('88');
    expect(component.projectEligibilityLabel(projectWithEval)).toBe('Éligible');
    expect(component.projectEligibilityClass(projectWithEval)).toBe('badge--eligible');

    expect(component.projectScoreLabel(projects[0])).toBe('Non calculé');
    expect(component.projectEligibilityLabel(projects[0])).toBe('En attente');
    expect(component.projectEligibilityClass(projects[0])).toBe('badge--pending');
  });

  it('should compute eligibilityDotClass for all statuses', () => {
    const eligibleProject = { ...projects[1], latestEvaluation: { ...evaluation, eligibilityStatus: 'ELIGIBLE' } as EvaluationResponse };
    expect(component.eligibilityDotClass(eligibleProject)).toBe('dot-eligible');

    const reviewProject = { ...projects[1], latestEvaluation: { ...evaluation, eligibilityStatus: 'REVIEW_REQUIRED' } as EvaluationResponse };
    expect(component.eligibilityDotClass(reviewProject)).toBe('dot-review');

    const nonEligibleProject = { ...projects[1], latestEvaluation: { ...evaluation, eligibilityStatus: 'NON_ELIGIBLE' } as EvaluationResponse };
    expect(component.eligibilityDotClass(nonEligibleProject)).toBe('dot-non-eligible');

    const notEvaluableProject = { ...projects[1], latestEvaluation: { ...evaluation, eligibilityStatus: 'NOT_EVALUABLE' } as EvaluationResponse };
    expect(component.eligibilityDotClass(notEvaluableProject)).toBe('dot-not-evaluable');

    expect(component.eligibilityDotClass(projects[0])).toBe('dot-pending');
  });

  it('should compute eligibilityLabelFor default branches', () => {
    const noStatus = { ...evaluation, eligibilityStatus: '', eligibleIndustrialisation: true };
    expect(component.eligibilityLabelFor(noStatus)).toBe('Éligible');

    const noScore = { ...evaluation, eligibilityStatus: '', eligibleIndustrialisation: false, scoreFinal: 50, hasEliminatoryWarnings: false, elimWarningsCount: 0 };
    expect(component.eligibilityLabelFor(noScore as any)).toBe('Revue requise');

    const noCalc = { ...evaluation, eligibilityStatus: '', eligibleIndustrialisation: null, scoreFinal: null };
    expect(component.eligibilityLabelFor(noCalc as any)).toBe('Non calculé');

    const falseOnly = { ...evaluation, eligibilityStatus: '', eligibleIndustrialisation: false, scoreFinal: null };
    expect(component.eligibilityLabelFor(falseOnly as any)).toBe('Non éligible');
  });

  it('should compute projectEligibilityLabel from project properties', () => {
    const eligibleProject = { ...projects[0], latestEvaluation: undefined, eligibleIndustrialisation: true };
    expect(component.projectEligibilityLabel(eligibleProject)).toBe('Éligible');

    const nonEligibleProject = { ...projects[0], latestEvaluation: undefined, eligibleIndustrialisation: false, bloqueParEliminatoire: true };
    expect(component.projectEligibilityLabel(nonEligibleProject)).toBe('Non éligible');

    const reviewProject = { ...projects[0], latestEvaluation: undefined, eligibleIndustrialisation: false, scoreFinal: 50 };
    expect(component.projectEligibilityLabel(reviewProject)).toBe('Revue requise');

    const notEvaluable = { ...projects[0], latestEvaluation: undefined, eligibleIndustrialisation: false, scoreFinal: null, bloqueParEliminatoire: false };
    expect(component.projectEligibilityLabel(notEvaluable)).toBe('Non éligible');
  });

  it('should return correct projectEligibilityClass badges', () => {
    const eligible = { ...projects[1], latestEvaluation: { ...evaluation, eligibilityStatus: 'ELIGIBLE' } as EvaluationResponse };
    expect(component.projectEligibilityClass(eligible)).toBe('badge--eligible');

    const review = { ...projects[1], latestEvaluation: { ...evaluation, eligibilityStatus: 'REVIEW_REQUIRED' } as EvaluationResponse };
    expect(component.projectEligibilityClass(review)).toBe('badge--review');

    const nonEligible = { ...projects[1], latestEvaluation: { ...evaluation, eligibilityStatus: 'NON_ELIGIBLE_EN_L_ETAT' } as EvaluationResponse };
    expect(component.projectEligibilityClass(nonEligible)).toBe('badge--non-eligible');

    const notEvaluable = { ...projects[1], latestEvaluation: { ...evaluation, eligibilityStatus: 'NOT_EVALUABLE_NO_DELIVERABLE' } as EvaluationResponse };
    expect(component.projectEligibilityClass(notEvaluable)).toBe('badge--not-evaluable');
  });

  it('should expose validationStatusLabel for all statuses', () => {
    expect(component.validationStatusLabel('VALIDATED')).toBe('Validée');
    expect(component.validationStatusLabel('REJECTED')).toBe('Rejetée');
    expect(component.validationStatusLabel('OVERRIDDEN')).toBe('Override admin');
    expect(component.validationStatusLabel('PENDING')).toBe('En attente');
    expect(component.validationStatusLabel(null)).toBe('En attente');
    expect(component.validationStatusLabel(undefined)).toBe('En attente');
  });

  it('should handle calculate with 409 and 429 retry errors', () => {
    evaluationService.calculateScore.and.returnValue(throwError(() => ({
      status: 409,
      error: { retryAfterSeconds: 60 },
    })));
    component.calculate(projects[0]);
    expect(component.isProjectCoolingDown(1)).toBeTrue();
    expect(component.evalError()).toContain('Veuillez patienter');
    expect(component.savingProjectId()).toBeNull();
  });

  it('should handle calculate with 429 error', () => {
    evaluationService.calculateScore.and.returnValue(throwError(() => ({
      status: 429,
      error: { retryAfterSeconds: 30 },
    })));
    component.calculate(projects[0]);
    expect(component.isProjectCoolingDown(1)).toBeTrue();
  });

  it('should prevent calculate during cooldown', () => {
    (component as any).startCooldown(1);
    component.calculate(projects[0]);
    expect(component.evalError()).toContain('Veuillez patienter');
    (component as any).clearCooldown(1);
  });

  it('should expose scoreTitleFor for validated and partial statuses', () => {
    const validated = { ...evaluation, validationStatus: 'VALIDATED', finalValidatedScore: 67 };
    expect(component.scoreTitleFor(validated)).toBe('Score final validé');

    const overridden = { ...evaluation, validationStatus: 'OVERRIDDEN', finalValidatedScore: 91 };
    expect(component.scoreTitleFor(overridden)).toBe('Score final validé');

    const partial = { ...evaluation, processingStatus: 'PARTIAL_ANALYSIS' };
    expect(component.scoreTitleFor(partial)).toBe('Score provisoire');

    const noEval = { ...evaluation, mlStatus: 'FAILED_RETRYABLE' };
    expect(component.scoreTitleFor(noEval)).toBe('Score non calculé');

    expect(component.scoreTitleFor(null)).toBe('Score non calculé');
  });

  it('should expose mlScoreLabelFor correctly', () => {
    const noCalc = { ...evaluation, mlStatus: 'FAILED_RETRYABLE' };
    expect(component.mlScoreLabelFor(noCalc)).toBe('Non calculé');

    expect(component.mlScoreLabelFor(null)).toBe('Non calculé');
    expect(component.mlScoreLabelFor(evaluation)).toBe('67.00 / 100');
  });

  it('should handle businessStatusMessage branches', () => {
    const failedPermanent = { ...evaluation, processingStatus: 'FAILED_PERMANENT', incompleteCriteriaCount: 2 } as EvaluationResponse;
    component.projects.set(projects);
    evaluationService.calculateScore.and.returnValue(of(failedPermanent));
    component.calculate(projects[0]);
    expect(component.evalError()).toContain('configuration des critères est incomplète');

    const modelUnavailable = { ...evaluation, mlStatus: 'MODEL_UNAVAILABLE' } as EvaluationResponse;
    evaluationService.calculateScore.and.returnValue(of(modelUnavailable));
    component.calculate(projects[0]);
    expect(component.evalError()).toContain('modèle ML n');

    const insufficient = { ...evaluation, mlStatus: 'INSUFFICIENT_EVIDENCE' } as EvaluationResponse;
    evaluationService.calculateScore.and.returnValue(of(insufficient));
    component.calculate(projects[0]);
    expect(component.evalError()).toContain('preuves insuffisantes');

    const notEvaluable = { ...evaluation, mlStatus: 'NOT_EVALUABLE' } as EvaluationResponse;
    evaluationService.calculateScore.and.returnValue(of(notEvaluable));
    component.calculate(projects[0]);
    expect(component.evalError()).toContain('pas évaluable');

    const notEvaluableND = { ...evaluation, mlStatus: 'NOT_EVALUABLE_NO_DELIVERABLE' } as EvaluationResponse;
    evaluationService.calculateScore.and.returnValue(of(notEvaluableND));
    component.calculate(projects[0]);
    expect(component.evalError()).toContain('pas évaluable');

    const unknownStatus = { ...evaluation, mlStatus: 'UNKNOWN' } as EvaluationResponse;
    evaluationService.calculateScore.and.returnValue(of(unknownStatus));
    component.calculate(projects[0]);
    expect(component.evalError()).toContain("n\u2019a pas pu être effectuée");
  });

  it('should handle loadEvaluationHistory error', () => {
    evaluationService.getEvaluationHistory.and.returnValue(throwError(() => new Error('boom')));
    component.loadEvaluationHistory(1);
    expect(component.evalHistory()).toEqual([]);
    expect(component.loadingHistory()).toBeFalse();
  });

  it('should compute scoreFor with finalValidatedScore', () => {
    const withValidated = { ...evaluation, finalValidatedScore: 90 };
    expect(component.scoreFor(withValidated)).toBe(90);
  });

  it('should expose updateValidationComment, updateOverrideReason', () => {
    component.updateValidationComment('test comment');
    expect(component.validationComment()).toBe('test comment');
    component.updateOverrideReason('reason');
    expect(component.overrideReason()).toBe('reason');
  });

  it('should handle setCurrentEvaluation with null sujetProjetId', () => {
    const evalNoProject = { ...evaluation, sujetProjetId: null } as EvaluationResponse;
    (component as any).setCurrentEvaluation(evalNoProject);
    expect(component.evalResult()).toBe(evalNoProject);
  });

  it('should expose nonEligibleCount including NON_ELIGIBLE_EN_L_ETAT and NOT_EVALUABLE', () => {
    const projectsWithNonEligible = [
      { ...projects[0], latestEvaluation: { ...evaluation, eligibilityStatus: 'NON_ELIGIBLE_EN_L_ETAT' } as EvaluationResponse },
      { ...projects[1], latestEvaluation: { ...evaluation, eligibilityStatus: 'NOT_EVALUABLE' } as EvaluationResponse },
    ];
    component.projects.set(projectsWithNonEligible);
    expect(component.nonEligibleCount).toBe(2);
  });

  it('should expose pagedProjects, pageDisplayCount, totalElements', () => {
    component.projects.set(projects);
    expect(component.totalElements()).toBe(3);
    expect(component.pageDisplayCount()).toBe(3);
    expect(component.pagedProjects().length).toBe(3);
  });
});
