import { ComponentFixture, TestBed, fakeAsync, tick } from '@angular/core/testing';
import { of, throwError } from 'rxjs';
import { QuestionIndustrialisation } from '../../core/models/industrialisation.model';
import { IndustrialisationService } from '../../core/services/industrialisation.service';
import { IndustrialisationQuestionsComponent } from './industrialisation-questions.component';

describe('IndustrialisationQuestionsComponent', () => {
  let component: IndustrialisationQuestionsComponent;
  let fixture: ComponentFixture<IndustrialisationQuestionsComponent>;
  let service: jasmine.SpyObj<IndustrialisationService>;

  const questions: QuestionIndustrialisation[] = [
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
  ];

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
    component.questionSearch.set('eliminatoire');
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
    component.edit(questions[1]);
    expect(component.editingId()).toBe(1);
    expect(component.form.controls.libelle.value).toBe('Question A');

    component.form.controls.libelle.setValue('Nouvelle question');
    component.form.controls.ordre.setValue(3);
    component.form.controls.typeCritere.setValue('NOTE');
    component.save();
    expect(service.updateQuestion).toHaveBeenCalled();

    component.toggle(questions[1]);
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

  it('should create a question and expose backend save errors', fakeAsync(() => {
    component.form.patchValue({
      libelle: 'Nouvelle question',
      description: 'Description',
      typeReponse: 'URL',
      obligatoire: true,
      typeCritere: 'NOTE',
      poids: 3,
      ordre: 4,
      actif: true,
      conditionEliminatoire: false,
    });

    component.save();

    expect(service.createQuestion).toHaveBeenCalledWith(jasmine.objectContaining({
      libelle: 'Nouvelle question',
      description: 'Description',
      typeReponse: 'URL',
      typeCritere: 'NOTE',
      poids: 3,
      ordre: 4,
      actif: true,
      conditionEliminatoire: false,
    }));
    expect(component.message()).toBe('Question creee.');

    tick(2500);

    service.createQuestion.and.returnValue(throwError(() => ({ error: { detail: 'Libelle deja utilise' } })));
    component.form.controls.libelle.setValue('Autre question');
    component.save();

    expect(component.error()).toBe('Libelle deja utilise');
    expect(component.saving()).toBeFalse();

    service.createQuestion.and.returnValue(throwError(() => new Error('boom')));
    component.save();

    expect(component.error()).toBe('Enregistrement impossible.');
  }));

  it('should handle activation errors and dropdown interactions', () => {
    service.deactivateQuestion.and.returnValue(throwError(() => new Error('boom')));
    component.toggle(questions[0]);
    expect(service.deactivateQuestion).toHaveBeenCalledWith(2);
    expect(component.error()).toBe('Changement de statut impossible.');

    const clickEvent = jasmine.createSpyObj<Event>('Event', ['stopPropagation']);
    component.toggleDropdown('typeReponse', clickEvent);
    expect(clickEvent.stopPropagation).toHaveBeenCalled();
    expect(component.openDropdown()).toBe('typeReponse');

    component.toggleDropdown('typeReponse', clickEvent);
    expect(component.openDropdown()).toBeNull();

    const enterEvent = jasmine.createSpyObj<KeyboardEvent>('KeyboardEvent', ['preventDefault', 'stopPropagation'], { key: 'Enter' });
    component.onDropdownKeydown('typeCritere', enterEvent);
    expect(enterEvent.preventDefault).toHaveBeenCalled();
    expect(component.openDropdown()).toBe('typeCritere');

    const spaceEvent = jasmine.createSpyObj<KeyboardEvent>('KeyboardEvent', ['preventDefault', 'stopPropagation'], { key: ' ' });
    component.onDropdownKeydown('typeCritere', spaceEvent);
    expect(spaceEvent.preventDefault).toHaveBeenCalled();
    expect(component.openDropdown()).toBeNull();

    const arrowEvent = jasmine.createSpyObj<KeyboardEvent>('KeyboardEvent', ['preventDefault'], { key: 'ArrowDown' });
    component.onDropdownKeydown('typeReponse', arrowEvent);
    expect(arrowEvent.preventDefault).toHaveBeenCalled();
    expect(component.openDropdown()).toBe('typeReponse');

    component.onDropdownKeydown('typeReponse', { key: 'Escape' } as KeyboardEvent);
    expect(component.openDropdown()).toBeNull();
  });

  it('should select dropdown values and expose labels with fallbacks', () => {
    const event = jasmine.createSpyObj<Event>('Event', ['stopPropagation']);

    component.selectTypeReponse('BOOLEAN', event);
    expect(component.form.controls.typeReponse.value).toBe('BOOLEAN');
    expect(component.form.controls.typeReponse.touched).toBeTrue();
    expect(component.openDropdown()).toBeNull();

    component.selectTypeCritere('ELIMINATOIRE', event);
    expect(component.form.controls.typeCritere.value).toBe('ELIMINATOIRE');
    expect(component.form.controls.typeCritere.touched).toBeTrue();
    expect(component.isEliminatoryQuestion()).toBeTrue();
    expect(component.isNoteQuestion()).toBeFalse();

    component.selectTypeCritere('NOTE', event);
    expect(component.isNoteQuestion()).toBeTrue();
    expect(component.selectedTypeReponse().value).toBe('BOOLEAN');
    expect(component.selectedTypeCritere().value).toBe('NOTE');

    component.form.controls.typeReponse.setValue('UNKNOWN' as never);
    component.form.controls.typeCritere.setValue('UNKNOWN' as never);
    expect(component.selectedTypeReponse().value).toBe('TEXTE');
    expect(component.selectedTypeCritere().value).toBe('NOTE');
    expect(component.typeReponseLabel('UNKNOWN' as never)).toBe('UNKNOWN');
    expect(component.typeCritereLabel('UNKNOWN' as never)).toBe('UNKNOWN');

    component.updateQuestionSearch('question');
    expect(component.questionSearch()).toBe('question');
    component.closeDropdown();
    expect(component.openDropdown()).toBeNull();
  });

  it('should guard internal criterion synchronization branches', () => {
    const internal = component as unknown as {
      syncingCriterionState: boolean;
      applyTypeCritereRules(value: 'NOTE' | 'ELIMINATOIRE' | null): void;
      applyConditionRules(checked: boolean): void;
    };

    internal.syncingCriterionState = true;
    component.form.controls.typeCritere.setValue('NOTE', { emitEvent: false });
    internal.applyTypeCritereRules('ELIMINATOIRE');
    expect(component.form.controls.typeCritere.value).toBe('NOTE');

    internal.applyConditionRules(true);
    expect(component.form.controls.typeCritere.value).toBe('NOTE');

    internal.syncingCriterionState = false;
    component.form.controls.poids.setValue(0);
    internal.applyTypeCritereRules('NOTE');
    expect(component.form.controls.poids.value).toBe(1);

    internal.applyConditionRules(true);
    expect(component.form.controls.typeCritere.value).toBe('ELIMINATOIRE');
    internal.applyConditionRules(false);
    expect(component.form.controls.typeCritere.value).toBe('NOTE');
  });
});
