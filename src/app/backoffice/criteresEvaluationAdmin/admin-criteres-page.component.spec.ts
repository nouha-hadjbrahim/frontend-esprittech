import { ComponentFixture, TestBed, fakeAsync, tick } from '@angular/core/testing';
import { of, throwError } from 'rxjs';
import {
  CritereEliminatoire,
  CritereNote,
  CritereNoteRule,
  NoteLevel,
  ReponseEliminatoire,
} from '../../core/models/critere.model';
import { CritereEliminatoireService } from '../../core/services/critere-eliminatoire.service';
import { CritereNoteService } from '../../core/services/critere-note.service';
import { NoteLevelService } from '../../core/services/note-level.service';
import { AdminCriteresPageComponent } from './admin-criteres-page.component';

describe('AdminCriteresPageComponent', () => {
  let component: AdminCriteresPageComponent;
  let fixture: ComponentFixture<AdminCriteresPageComponent>;
  let eliminatoireService: jasmine.SpyObj<CritereEliminatoireService>;
  let noteService: jasmine.SpyObj<CritereNoteService>;
  let noteLevelService: jasmine.SpyObj<NoteLevelService>;

  const eliminatoires: CritereEliminatoire[] = [
    {
      id: 2,
      libelle: 'Git disponible ?',
      description: 'Desc',
      domaine: 'Domaine B',
      ordre: 2,
      reponseAttendue: ReponseEliminatoire.OK,
      actif: true,
      dateCreation: '2026-01-01T00:00:00Z',
      dateMiseAJour: '2026-01-02T00:00:00Z',
      ruleEnabled: false,
      modeEvaluation: null,
      expectedLivrableTypes: null,
      minLivrableCount: null,
      expectedKeyword: null,
      noteMaxAuto: null,
      ruleDescription: null,
    },
  ];

  const notes: CritereNote[] = [
    {
      id: 1,
      libelle: 'Qualite code',
      description: 'Desc',
      domaine: 'Domaine A',
      ordre: 1,
      poids: 2,
      defaultNoteValue: 3,
      actif: true,
      dateCreation: '2026-01-01T00:00:00Z',
      dateMiseAJour: '2026-01-02T00:00:00Z',
      ruleEnabled: false,
      modeEvaluation: null,
      expectedLivrableTypes: null,
      minLivrableCount: null,
      expectedKeyword: null,
      noteMaxAuto: null,
      ruleDescription: null,
    },
  ];

  const rules: CritereNoteRule[] = [
    {
      id: 8,
      critereNoteId: 1,
      ruleName: 'PDF present',
      description: 'PDF detecte',
      metadataKey: 'fileExtensions',
      operator: 'CONTAINS',
      expectedValue: 'pdf',
      minValue: null,
      maxValue: null,
      noteValue: 4,
      noteLabel: 'Satisfait',
      priority: 1,
      active: true,
      dateCreation: '2026-01-01T00:00:00Z',
      dateMiseAJour: '2026-01-02T00:00:00Z',
    },
  ];

  const levels: NoteLevel[] = [
    {
      id: 1,
      value: 1,
      label: 'Tres insatisfait',
      description: '',
      active: true,
      order: 1,
      dateCreation: '2026-01-01T00:00:00Z',
      dateMiseAJour: '2026-01-02T00:00:00Z',
    },
    {
      id: 4,
      value: 4,
      label: 'Satisfait',
      description: '',
      active: true,
      order: 4,
      dateCreation: '2026-01-01T00:00:00Z',
      dateMiseAJour: '2026-01-02T00:00:00Z',
    },
  ];

  beforeEach(async () => {
    eliminatoireService = jasmine.createSpyObj<CritereEliminatoireService>('CritereEliminatoireService', [
      'findAll',
      'create',
      'update',
      'deactivate',
      'activate',
    ]);
    noteService = jasmine.createSpyObj<CritereNoteService>('CritereNoteService', [
      'findAll',
      'create',
      'update',
      'deactivate',
      'activate',
      'findRules',
      'createRule',
      'updateRule',
      'deleteRule',
      'activateRule',
      'deactivateRule',
    ]);
    noteLevelService = jasmine.createSpyObj<NoteLevelService>('NoteLevelService', [
      'findAll',
      'create',
      'update',
      'activate',
      'deactivate',
    ]);

    eliminatoireService.findAll.and.returnValue(of(eliminatoires));
    eliminatoireService.create.and.returnValue(of(eliminatoires[0]));
    eliminatoireService.update.and.returnValue(of(eliminatoires[0]));
    eliminatoireService.deactivate.and.returnValue(of(void 0));
    eliminatoireService.activate.and.returnValue(of(void 0));

    noteService.findAll.and.returnValue(of(notes));
    noteService.create.and.returnValue(of(notes[0]));
    noteService.update.and.returnValue(of(notes[0]));
    noteService.deactivate.and.returnValue(of(void 0));
    noteService.activate.and.returnValue(of(void 0));
    noteService.findRules.and.returnValue(of(rules));
    noteService.createRule.and.returnValue(of(rules[0]));
    noteService.updateRule.and.returnValue(of(rules[0]));
    noteService.deleteRule.and.returnValue(of(void 0));
    noteService.activateRule.and.returnValue(of(void 0));
    noteService.deactivateRule.and.returnValue(of(void 0));

    noteLevelService.findAll.and.returnValue(of(levels));
    noteLevelService.create.and.returnValue(of(levels[0]));
    noteLevelService.update.and.returnValue(of(levels[0]));
    noteLevelService.activate.and.returnValue(of(void 0));
    noteLevelService.deactivate.and.returnValue(of(void 0));

    await TestBed.configureTestingModule({
      imports: [AdminCriteresPageComponent],
      providers: [
        { provide: CritereEliminatoireService, useValue: eliminatoireService },
        { provide: CritereNoteService, useValue: noteService },
        { provide: NoteLevelService, useValue: noteLevelService },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(AdminCriteresPageComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should load criteria, note levels and rules on init', () => {
    expect(eliminatoireService.findAll).toHaveBeenCalled();
    expect(noteService.findAll).toHaveBeenCalled();
    expect(noteService.findRules).toHaveBeenCalledWith(1);
    expect(noteLevelService.findAll).toHaveBeenCalled();
    expect(component.visibleEliminatoires[0].id).toBe(2);
    expect(component.visibleNotes[0].id).toBe(1);
    expect(component.rulesFor(1)).toEqual(rules);
    expect(component.noteLabel(4)).toBe('4 - Satisfait');
  });

  it('should filter criteria and recalculate pagination sizes', () => {
    component.criteresEliminatoires.set(eliminatoires);
    component.criteresNotes.set(notes);
    component.eliminatoiresSearch.set('git');
    component.notesSearch.set('qualite');

    expect(component.filteredEliminatoires().length).toBe(1);
    expect(component.filteredNotes().length).toBe(1);
    expect(component.eliminatoiresTotalPages).toBe(1);
    expect(component.notesTotalPages).toBe(1);
  });

  it('should create and update eliminatory and note criteria', () => {
    component.openCreateModal('eliminatoire');
    component.eliminatoireForm.patchValue({ libelle: 'Nouvelle regle', domaine: 'Domaine', ordre: 1 });
    component.saveCritere();
    expect(eliminatoireService.create).toHaveBeenCalled();

    component.openEditModal('note', notes[0]);
    component.noteForm.patchValue({ libelle: 'Nouvelle note', domaine: 'Domaine', ordre: 1, poids: 1, defaultNoteValue: 4 });
    component.saveCritere();

    expect(noteService.update).toHaveBeenCalledWith(1, jasmine.objectContaining({
      libelle: 'Nouvelle note',
      poids: 1,
      defaultNoteValue: 4,
      bareme: 5,
      seuil: 3,
    }));
  });

  it('should manage metadata rules for scored criteria', () => {
    component.openRuleModal(notes[0]);
    component.ruleForm.patchValue({ ruleName: 'Git present', metadataKey: 'hasGitLink', operator: 'EQUALS', expectedValue: 'true', noteValue: 5 });
    component.saveRule();
    expect(noteService.createRule).toHaveBeenCalledWith(1, jasmine.objectContaining({ noteValue: 5 }));

    component.openRuleModal(notes[0], rules[0]);
    component.ruleForm.patchValue({ ruleName: 'PDF modifie', noteValue: 3 });
    component.saveRule();
    expect(noteService.updateRule).toHaveBeenCalledWith(8, jasmine.objectContaining({ ruleName: 'PDF modifie', noteValue: 3 }));

    component.deleteRule(rules[0]);
    expect(noteService.deleteRule).toHaveBeenCalledWith(8);

    component.toggleRule(rules[0]);
    expect(noteService.deactivateRule).toHaveBeenCalledWith(8);

    component.toggleRule({ ...rules[0], active: false });
    expect(noteService.activateRule).toHaveBeenCalledWith(8);
  });

  it('should manage note levels', () => {
    component.openNoteLevelModal();
    component.noteLevelForm.patchValue({ value: 2, label: 'Insatisfait', order: 2 });
    component.saveNoteLevel();
    expect(noteLevelService.create).toHaveBeenCalledWith(jasmine.objectContaining({ value: 2, label: 'Insatisfait' }));

    component.openNoteLevelModal(levels[0]);
    component.noteLevelForm.patchValue({ label: 'Tres insatisfait modifie' });
    component.saveNoteLevel();
    expect(noteLevelService.update).toHaveBeenCalledWith(1, jasmine.objectContaining({ label: 'Tres insatisfait modifie' }));

    component.toggleNoteLevel(levels[0]);
    expect(noteLevelService.deactivate).toHaveBeenCalledWith(1);

    component.toggleNoteLevel({ ...levels[0], active: false });
    expect(noteLevelService.activate).toHaveBeenCalledWith(1);
  });

  it('should validate forms and expose service errors', fakeAsync(() => {
    component.openCreateModal('note');
    component.noteForm.controls['libelle'].setValue('');
    component.saveCritere();
    expect(component.errorMessage()).toBe('Formulaire invalide.');

    component.openRuleModal(notes[0]);
    component.ruleForm.controls['ruleName'].setValue('');
    component.saveRule();
    expect(component.errorMessage()).toBe('Regle invalide.');

    component.openNoteLevelModal();
    component.noteLevelForm.controls['label'].setValue('');
    component.saveNoteLevel();
    expect(component.errorMessage()).toBe('Niveau de note invalide.');

    eliminatoireService.findAll.and.returnValue(throwError(() => new Error('boom')));
    component['loadCriteres']();
    expect(component.errorEliminatoires()).toBe('Impossible de charger les criteres eliminatoires');

    noteService.findRules.and.returnValue(throwError(() => new Error('boom')));
    noteService.findAll.and.returnValue(of(notes));
    component['loadCriteres']();
    expect(component.errorMessage()).toBe('Impossible de charger les regles de notation.');

    noteLevelService.create.and.returnValue(throwError(() => new Error('boom')));
    component.openNoteLevelModal();
    component.noteLevelForm.patchValue({ value: 2, label: 'Insatisfait', order: 2 });
    component.saveNoteLevel();
    expect(component.errorMessage()).toBe('Enregistrement du niveau impossible.');

    tick(3000);
  }));

  it('should toggle activation and clamp pagination', () => {
    component.toggleActivation('eliminatoire', eliminatoires[0]);
    expect(eliminatoireService.deactivate).toHaveBeenCalledWith(2);

    component.toggleActivation('note', notes[0]);
    expect(noteService.deactivate).toHaveBeenCalledWith(1);

    component.criteresEliminatoires.set(eliminatoires);
    component.criteresNotes.set(notes);
    component.goToEliminatoiresPage(99);
    component.goToNotesPage(-3);
    expect(component.eliminatoiresPage()).toBe(1);
    expect(component.notesPage()).toBe(1);

    component.eliminatoiresPage.set(2);
    component.notesPage.set(2);
    component.updateEliminatoiresSearch('git');
    component.updateNotesSearch('qualite');
    expect(component.eliminatoiresPage()).toBe(1);
    expect(component.notesPage()).toBe(1);
  });
});
