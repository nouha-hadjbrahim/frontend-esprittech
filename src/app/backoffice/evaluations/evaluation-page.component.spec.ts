import { TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { EvaluationPageComponent } from './evaluation-page.component';
import { provideRouter } from '@angular/router';
import { ProjetEvaluableService } from '../../core/services/projet-evaluable.service';
import { CritereEliminatoireService } from '../../core/services/critere-eliminatoire.service';
import { CritereNoteService } from '../../core/services/critere-note.service';
import { EvaluationService } from '../../core/services/evaluation.service';

describe('EvaluationPageComponent', () => {
  let component: EvaluationPageComponent;

  const mockProjetService = { getEvaluables: jasmine.createSpy('getEvaluables').and.returnValue(of([
    { id: 1, titre: 'P1', statut: 'REALISATION_TERMINEE' }
  ])) };

  const mockCritElim = { findActive: jasmine.createSpy('findActive').and.returnValue(of([{ id: 10, libelle: 'E1' }])) };
  const mockCritNote = { findActive: jasmine.createSpy('findActive').and.returnValue(of([{ id: 20, libelle: 'N1', bareme: 5 }])) };
  const mockEvalService = { calculerEvaluation: jasmine.createSpy('calculerEvaluation').and.returnValue(of({
    id: 7,
    sujetProjetId: 1,
    scoreFinal: 7,
    eligibleIndustrialisation: false,
    bloqueParEliminatoire: false,
    dateCalcul: new Date().toISOString(),
    commentaire: '',
    resultats: []
  })) };

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [EvaluationPageComponent],
      providers: [
        provideRouter([]),
        { provide: ProjetEvaluableService, useValue: mockProjetService },
        { provide: CritereEliminatoireService, useValue: mockCritElim },
        { provide: CritereNoteService, useValue: mockCritNote },
        { provide: EvaluationService, useValue: mockEvalService },
      ]
    });

    const fixture = TestBed.createComponent(EvaluationPageComponent);
    component = fixture.componentInstance as unknown as EvaluationPageComponent;
  });

  it('should load projects on init', () => {
    component.ngOnInit();
    expect(mockProjetService.getEvaluables).toHaveBeenCalled();
    expect(component.projects().length).toBe(1);
  });

  it('should select project, build form and calculate evaluation', () => {
    const project = { id: 1, titre: 'P1', statut: 'REALISATION_TERMINEE' } as any;
    component.selectProject(project);

    // after selecting, eliminatoires and notes should be populated
    expect(component.eliminatoires.length).toBe(1);
    expect(component.notes.length).toBe(1);
    expect(component.evaluationForm).toBeDefined();

    // set form values
    (component.evaluationForm.get('eliminatoires') as any).at(0).get('reponse').setValue(true);
    (component.evaluationForm.get('notes') as any).at(0).get('noteObtenue').setValue(4);

    expect(component.canCalculate()).toBeTrue();
    component.calculateEvaluation();

    expect(mockEvalService.calculerEvaluation).toHaveBeenCalledWith(1, jasmine.any(Object));
    expect(component.evalResult()!.scoreFinal).toBe(7);
  });
});
