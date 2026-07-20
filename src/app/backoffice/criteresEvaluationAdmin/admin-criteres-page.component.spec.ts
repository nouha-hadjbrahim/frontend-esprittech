import { ComponentFixture, TestBed, fakeAsync, tick } from '@angular/core/testing';
import { HttpErrorResponse } from '@angular/common/http';
import { of, throwError } from 'rxjs';
import {
  CritereEliminatoire,
  CritereNote,
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
      id: 2,
      value: 2,
      label: 'Insatisfait',
      description: '',
      active: true,
      order: 2,
      dateCreation: '2026-01-01T00:00:00Z',
      dateMiseAJour: '2026-01-02T00:00:00Z',
    },
    {
      id: 3,
      value: 3,
      label: 'Peu satisfait',
      description: '',
      active: true,
      order: 3,
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
    {
      id: 5,
      value: 5,
      label: 'Tres satisfait',
      description: '',
      active: true,
      order: 5,
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
      'delete',
      'deactivate',
      'activate',
    ]);
    noteLevelService = jasmine.createSpyObj<NoteLevelService>('NoteLevelService', [
      'findAll',
      'create',
      'update',
      'activate',
      'deactivate',
      'delete',
    ]);

    eliminatoireService.findAll.and.returnValue(of(eliminatoires));
    eliminatoireService.create.and.returnValue(of(eliminatoires[0]));
    eliminatoireService.update.and.returnValue(of(eliminatoires[0]));
    eliminatoireService.deactivate.and.returnValue(of(void 0));
    eliminatoireService.activate.and.returnValue(of(void 0));

    noteService.findAll.and.returnValue(of(notes));
    noteService.create.and.returnValue(of(notes[0]));
    noteService.update.and.returnValue(of(notes[0]));
    noteService.delete.and.returnValue(of(void 0));
    noteService.deactivate.and.returnValue(of(void 0));
    noteService.activate.and.returnValue(of(void 0));
    noteLevelService.findAll.and.returnValue(of(levels));
    noteLevelService.create.and.returnValue(of(levels[0]));
    noteLevelService.update.and.returnValue(of(levels[0]));
    noteLevelService.activate.and.returnValue(of(void 0));
    noteLevelService.deactivate.and.returnValue(of(void 0));
    noteLevelService.delete.and.returnValue(of(void 0));

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

  it('should load criteria and note levels on init', () => {
    expect(eliminatoireService.findAll).toHaveBeenCalled();
    expect(noteService.findAll).toHaveBeenCalled();
    expect(noteLevelService.findAll).toHaveBeenCalled();
    expect(component.visibleEliminatoires[0].id).toBe(2);
    expect(component.visibleNotes[0].id).toBe(1);
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
    expect(component.successMessage()).toBe('Critere eliminatoire cree.');

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
    expect(component.successMessage()).toBe('Critere note mis a jour.');
  });

  it('should show backend validation and load messages for note criteria', () => {
    noteService.findAll.and.returnValue(throwError(() => new HttpErrorResponse({
      status: 500,
      error: { detail: 'Chargement impossible cote backend' },
    })));
    component['loadNotes']();
    expect(component.errorNotes()).toBe('Chargement impossible cote backend');

    noteService.create.and.returnValue(throwError(() => new HttpErrorResponse({
      status: 400,
      error: { message: 'Le poids doit etre superieur a 0.' },
    })));
    component.openCreateModal('note');
    component.noteForm.patchValue({ libelle: 'Nouvelle note', domaine: 'Domaine', ordre: 1, poids: 1, defaultNoteValue: 4 });
    component.saveCritere();

    expect(component.warningMessage()).toBe('Le poids doit etre superieur a 0.');
    expect(component.errorMessage()).toBeNull();
  });

  it('should delete note criteria and show conflict warnings', () => {
    component.deleteCritereNote(notes[0]);
    expect(component.deleteConfirmOpen).toBeTrue();
    component.confirmDelete();
    expect(noteService.delete).toHaveBeenCalledWith(1);
    expect(component.successMessage()).toBe('Critere note supprime.');
    expect(component.feedbackOpen).toBeTrue();

    noteService.delete.and.returnValue(throwError(() => new HttpErrorResponse({
      status: 409,
      error: { detail: 'Ce critère est déjà utilisé dans des évaluations. Vous pouvez le désactiver au lieu de le supprimer.' },
    })));
    component.deleteCritereNote(notes[0]);
    component.confirmDelete();

    expect(component.warningMessage()).toBe('Ce critère est déjà utilisé dans des évaluations. Vous pouvez le désactiver au lieu de le supprimer.');
    expect(component.errorMessage()).toBeNull();
    expect(component.feedbackOpen).toBeTrue();
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

    component.deleteNoteLevel(levels[0]);
    expect(component.deleteConfirmOpen).toBeTrue();
    component.confirmDelete();
    expect(noteLevelService.delete).toHaveBeenCalledWith(1);
    expect(component.successMessage()).toBe('Niveau de note supprime.');
  });

  it('should add a note level from the admin form', () => {
    const createdLevel: NoteLevel = {
      id: 6,
      value: 6,
      label: 'Excellent',
      description: 'Niveau dynamique',
      active: true,
      order: 6,
      dateCreation: '2026-01-03T00:00:00Z',
      dateMiseAJour: '2026-01-03T00:00:00Z',
    };
    noteLevelService.create.and.returnValue(of(createdLevel));

    component.openNoteLevelModal();
    expect(component.isNoteLevelModalOpen()).toBeTrue();
    expect(component.noteLevelModalMode).toBe('create');
    expect(component.selectedNoteLevelId).toBeNull();

    component.noteLevelForm.patchValue({
      value: 6,
      label: 'Excellent',
      description: 'Niveau dynamique',
      active: true,
      order: 6,
    });
    component.saveNoteLevel();

    expect(noteLevelService.create).toHaveBeenCalledWith({
      value: 6,
      label: 'Excellent',
      description: 'Niveau dynamique',
      active: true,
      order: 6,
    });
    expect(noteLevelService.findAll).toHaveBeenCalledTimes(2);
    expect(component.successMessage()).toBe('Niveau de note enregistre.');
    expect(component.isNoteLevelModalOpen()).toBeFalse();
    expect(component.saving()).toBeFalse();
  });

  it('should keep add note level available after five levels and allow value six', () => {
    component.noteLevels.set(levels);
    fixture.detectChanges();

    const addButtons = Array.from(fixture.nativeElement.querySelectorAll('button')) as HTMLButtonElement[];
    const noteLevelAddButton = addButtons.find((button) => button.textContent?.includes('+ Ajouter'));

    expect(noteLevelAddButton?.disabled).toBeFalse();

    component.openNoteLevelModal();
    expect(component.noteLevelForm.value.value).toBe(6);
    expect(component.noteLevelForm.value.order).toBe(6);

    component.noteLevelForm.patchValue({ value: 6, order: 6, label: 'Excellent' });

    expect(component.noteLevelForm.valid).toBeTrue();
  });

  it('should show backend validation messages when creating note levels', () => {
    noteLevelService.create.and.returnValue(throwError(() => new HttpErrorResponse({
      status: 409,
      error: { message: "Un niveau existe deja pour l'ordre 6." },
    })));

    component.openNoteLevelModal();
    component.noteLevelForm.patchValue({ value: 6, order: 6, label: 'Excellent' });
    component.saveNoteLevel();

    expect(noteLevelService.create).toHaveBeenCalledWith(jasmine.objectContaining({ value: 6, order: 6 }));
    expect(component.warningMessage()).toBe("Un niveau existe deja pour l'ordre 6.");
    expect(component.errorMessage()).toBeNull();
  });

  it('should show conflict warning when deleting a used note level', () => {
    spyOn(window, 'confirm').and.returnValue(true);
    noteLevelService.delete.and.returnValue(throwError(() => new HttpErrorResponse({
      status: 409,
      error: { detail: 'Ce niveau de note est deja utilise. Vous pouvez le desactiver au lieu de le supprimer.' },
    })));

    component.deleteNoteLevel(levels[0]);

    expect(noteLevelService.delete).toHaveBeenCalledWith(1);
    expect(component.warningMessage()).toBe('Ce niveau de note est deja utilise. Vous pouvez le desactiver au lieu de le supprimer.');
    expect(component.errorMessage()).toBeNull();
  });

  it('should validate forms and expose service errors', fakeAsync(() => {
    component.openCreateModal('note');
    component.noteForm.controls['libelle'].setValue('');
    component.saveCritere();
    expect(component.warningMessage()).toBe('Le libelle est obligatoire.');
    expect(component.errorMessage()).toBeNull();

    component.openNoteLevelModal();
    component.noteLevelForm.controls['label'].setValue('');
    component.saveNoteLevel();
    expect(component.warningMessage()).toBe('Le libelle du niveau est obligatoire.');
    expect(component.errorMessage()).toBeNull();

    eliminatoireService.findAll.and.returnValue(throwError(() => new Error('boom')));
    component['loadCriteres']();
    expect(component.errorEliminatoires()).toBe('boom');

    noteLevelService.create.and.returnValue(throwError(() => new Error('boom')));
    component.openNoteLevelModal();
    component.noteLevelForm.patchValue({ value: 6, label: 'Excellent', order: 6 });
    component.saveNoteLevel();
    expect(component.errorMessage()).toBe('boom');

    tick(3000);
  }));

  it('should toggle activation and clamp pagination', () => {
    component.toggleActivation('eliminatoire', eliminatoires[0]);
    expect(eliminatoireService.deactivate).toHaveBeenCalledWith(2);

    component.toggleActivation('note', notes[0]);
    expect(noteService.deactivate).toHaveBeenCalledWith(1);

    noteService.deactivate.and.returnValue(throwError(() => new HttpErrorResponse({
      status: 409,
      error: { detail: 'Statut verrouille' },
    })));
    const previousState = notes[0].actif;
    component.toggleActivation('note', notes[0]);
    expect(notes[0].actif).toBe(previousState);
    expect(component.warningMessage()).toBe('Statut verrouille');

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
