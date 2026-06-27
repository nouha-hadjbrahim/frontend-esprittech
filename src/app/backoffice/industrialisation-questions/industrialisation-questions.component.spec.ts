import { ComponentFixture, TestBed, fakeAsync, tick } from '@angular/core/testing';
import { of, throwError } from 'rxjs';
import { IndustrialisationService } from '../../core/services/industrialisation.service';
import { IndustrialisationQuestionsComponent } from './industrialisation-questions.component';

describe('IndustrialisationQuestionsComponent', () => {
  let component: IndustrialisationQuestionsComponent;
  let fixture: ComponentFixture<IndustrialisationQuestionsComponent>;
  let service: jasmine.SpyObj<IndustrialisationService>;

  const questions = [
    {
      id: 2,
      libelle: 'Question B',
      description: 'Desc B',
      typeReponse: 'BOOLEAN',
      obligatoire: true,
      typeCritere: 'ELIMINATOIRE',
      poids: null,
      ordre: 2,
      actif: true,
      conditionEliminatoire: true,
      dateCreation: new Date().toISOString(),
      dateMiseAJour: new Date().toISOString(),
    },
    {
      id: 1,
      libelle: 'Question A',
      description: null,
      typeReponse: 'TEXTE',
      obligatoire: false,
      typeCritere: 'NOTE',
      poids: 2,
      ordre: 1,
      actif: false,
      conditionEliminatoire: false,
      dateCreation: new Date().toISOString(),
      dateMiseAJour: new Date().toISOString(),
    },
  ] as never[];

  beforeEach(async () => {
    service = jasmine.createSpyObj<IndustrialisationService>('IndustrialisationService', [
      'findQuestions',
      'createQuestion',
      'updateQuestion',
      'activateQuestion',
      'deactivateQuestion',
    ]);
    service.findQuestions.and.returnValue(of(questions));
    service.createQuestion.and.returnValue(of(questions[0]));
    service.updateQuestion.and.returnValue(of(questions[0]));
    service.activateQuestion.and.returnValue(of(void 0));
    service.deactivateQuestion.and.returnValue(of(void 0));

    await TestBed.configureTestingModule({
      imports: [IndustrialisationQuestionsComponent],
      providers: [{ provide: IndustrialisationService, useValue: service }],
    }).compileComponents();

    fixture = TestBed.createComponent(IndustrialisationQuestionsComponent);
    component = fixture.componentInstance;
  });

  it('should load and sort questions on init', () => {
    component.ngOnInit();

    expect(service.findQuestions).toHaveBeenCalled();
    expect(component.questions().map((q) => q.id)).toEqual([1, 2]);
  });

  it('should filter questions by search term', () => {
    component.questions.set(questions);
    component.questionSearch.set('bloquante');
    expect(component.filteredQuestions().length).toBe(1);
    expect(component.filteredQuestions()[0].id).toBe(2);
  });

  it('should apply criterion rules when toggled between note and eliminatory', () => {
    component.form.controls.typeCritere.setValue('ELIMINATOIRE');
    expect(component.form.controls.conditionEliminatoire.value).toBeTrue();
    expect(component.form.controls.poids.disabled).toBeTrue();

    component.form.controls.typeCritere.setValue('NOTE');
    expect(component.form.controls.conditionEliminatoire.value).toBeFalse();
    expect(component.form.controls.poids.enabled).toBeTrue();
  });

  it('should edit, save, toggle and reset questions', fakeAsync(() => {
    component.edit(questions[0]);
    expect(component.editingId()).toBe(1);
    expect(component.form.controls.libelle.value).toBe('Question A');

    component.form.controls.libelle.setValue('Nouvelle question');
    component.form.controls.ordre.setValue(3);
    component.form.controls.typeCritere.setValue('NOTE');
    component.save();
    expect(service.updateQuestion).toHaveBeenCalled();

    component.toggle(questions[0]);
    expect(service.activateQuestion).toHaveBeenCalledWith(1);

    component.reset();
    expect(component.editingId()).toBeNull();
    expect(component.form.controls.libelle.value).toBe('');

    tick(2500);
    fixture.destroy();
  }));

  it('should expose validation error and service error states', () => {
    component.form.controls.libelle.setValue('');
    component.save();
    expect(component.form.touched).toBeTrue();

    service.findQuestions.and.returnValue(throwError(() => new Error('boom')));
    component.load();
    expect(component.error()).toBe('Impossible de charger les questions.');
  });
});
