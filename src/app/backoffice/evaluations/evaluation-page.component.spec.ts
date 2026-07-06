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
    expect(component.filteredProjects().map((project) => project.id)).toEqual([2]);

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
    expect(component.statusLabel('REALISATION_TERMINEE')).toBe('Realisation terminee');
    expect(component.statusLabel('EN_ATTENTE')).toBe('EN_ATTENTE');

    component.ngOnDestroy();
    expect(component).toBeTruthy();
  });
});
