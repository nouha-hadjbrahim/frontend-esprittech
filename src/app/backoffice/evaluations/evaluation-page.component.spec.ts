import { TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { EvaluationPageComponent } from './evaluation-page.component';
import { provideRouter } from '@angular/router';
import { ProjetEvaluableService } from '../../core/services/projet-evaluable.service';
import { EvaluationService } from '../../core/services/evaluation.service';

describe('EvaluationPageComponent', () => {
  let component: EvaluationPageComponent;

  const mockProjetService = { getEvaluables: jasmine.createSpy('getEvaluables').and.returnValue(of([
    { id: 1, titre: 'P1', statut: 'REALISATION_TERMINEE', scoreFinal: null }
  ])) };

  const mockEvalService = {
    calculateScore: jasmine.createSpy('calculateScore').and.returnValue(of({
      id: 7,
      sujetProjetId: 1,
      scoreFinal: 7,
      eligibleIndustrialisation: false,
      bloqueParEliminatoire: false,
      dateCalcul: new Date().toISOString(),
      commentaire: '',
      calculatedBy: 'ROLE_ADMIN Admin Root',
      recalculationReason: 'Recalcul manuel',
      resultats: []
    })),
    getLatestEvaluation: jasmine.createSpy('getLatestEvaluation').and.returnValue(of({
      id: 7,
      sujetProjetId: 1,
      scoreFinal: 7,
      eligibleIndustrialisation: false,
      bloqueParEliminatoire: false,
      dateCalcul: new Date().toISOString(),
      commentaire: '',
      calculatedBy: 'ROLE_ADMIN Admin Root',
      recalculationReason: 'Recalcul manuel',
      resultats: []
    }))
  };

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [EvaluationPageComponent],
      providers: [
        provideRouter([]),
        { provide: ProjetEvaluableService, useValue: mockProjetService },
        { provide: EvaluationService, useValue: mockEvalService },
      ]
    });

    const fixture = TestBed.createComponent(EvaluationPageComponent);
    component = fixture.componentInstance;
  });

  it('should load projects on init', () => {
    component.ngOnInit();
    expect(mockProjetService.getEvaluables).toHaveBeenCalled();
    expect(component.projects().length).toBe(1);
  });

  it('should select project and load latest evaluation', () => {
    const project = { id: 1, titre: 'P1', statut: 'REALISATION_TERMINEE' } as any;

    component.selectProject(project);

    expect(mockEvalService.getLatestEvaluation).toHaveBeenCalledWith(1);
    expect(component.evalResult()!.scoreFinal).toBe(7);
  });

  it('should calculate score for the selected project', () => {
    const project = { id: 1, titre: 'P1', statut: 'REALISATION_TERMINEE', scoreFinal: null } as any;

    component.calculate(project);

    expect(mockEvalService.calculateScore).toHaveBeenCalledWith(1);
    expect(component.evalResult()!.scoreFinal).toBe(7);
  });
});
