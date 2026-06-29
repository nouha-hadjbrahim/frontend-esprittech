import { ComponentFixture, TestBed, fakeAsync, tick } from '@angular/core/testing';
import { of, throwError } from 'rxjs';
import { CritereEliminatoire, CritereNote, ReponseEliminatoire } from '../../core/models/critere.model';
import { CritereEliminatoireService } from '../../core/services/critere-eliminatoire.service';
import { CritereNoteService } from '../../core/services/critere-note.service';
import { AdminCriteresPageComponent } from './admin-criteres-page.component';

describe('AdminCriteresPageComponent', () => {
  let component: AdminCriteresPageComponent;
  let fixture: ComponentFixture<AdminCriteresPageComponent>;
  let eliminatoireService: jasmine.SpyObj<CritereEliminatoireService>;
  let noteService: jasmine.SpyObj<CritereNoteService>;

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
      bareme: 20,
      poids: 2,
      seuil: 10,
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

  beforeEach(async () => {
    eliminatoireService = jasmine.createSpyObj<CritereEliminatoireService>('CritereEliminatoireService', ['findAll', 'create', 'update', 'deactivate', 'activate']);
    noteService = jasmine.createSpyObj<CritereNoteService>('CritereNoteService', ['findAll', 'create', 'update', 'deactivate', 'activate']);
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

    await TestBed.configureTestingModule({
      imports: [AdminCriteresPageComponent],
      providers: [
        { provide: CritereEliminatoireService, useValue: eliminatoireService },
        { provide: CritereNoteService, useValue: noteService },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(AdminCriteresPageComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
    eliminatoireService.findAll.calls.reset();
    noteService.findAll.calls.reset();
  });

  it('should load and sort criteria on init', () => {
    component.ngOnInit();

    expect(eliminatoireService.findAll).toHaveBeenCalled();
    expect(noteService.findAll).toHaveBeenCalled();
    expect(component.visibleEliminatoires[0].id).toBe(2);
    expect(component.visibleNotes[0].id).toBe(1);
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

  it('should open create/edit modals and save eliminatory and note criteria', () => {
    component.openCreateModal('eliminatoire');
    expect(component.modalType).toBe('eliminatoire');
    expect(component.eliminatoireForm.controls['reponseAttendue'].value).toBe('OK');

    component.eliminatoireForm.controls['libelle'].setValue('Nouvelle regle');
    component.eliminatoireForm.controls['domaine'].setValue('Domaine');
    component.eliminatoireForm.controls['ordre'].setValue(1);
    component.saveCritere();
    expect(eliminatoireService.create).toHaveBeenCalled();

    component.openEditModal('note', notes[0]);
    expect(component.modalType).toBe('note');
    expect(component.noteForm.controls['libelle'].value).toBe('Qualite code');
    component.eliminatoireForm.controls['libelle'].setValue('Nouvelle regle');
    component.noteForm.controls['libelle'].setValue('Nouvelle note');
    component.noteForm.controls['domaine'].setValue('Domaine');
    component.noteForm.controls['ordre'].setValue(1);
    component.noteForm.controls['bareme'].setValue(20);
    component.noteForm.controls['poids'].setValue(1);
    component.noteForm.controls['seuil'].setValue(10);
    component.saveCritere();
    expect(noteService.update).toHaveBeenCalled();
  });

  it('should validate save, toggle activation and show errors', fakeAsync(() => {
    component.openCreateModal('eliminatoire');
    component.eliminatoireForm.controls['libelle'].setValue('   ');
    component.saveCritere();
    expect(component.errorMessage()).toBe('Formulaire invalide. Veuillez vérifier les champs.');

    component.toggleActivation('eliminatoire', eliminatoires[0]);
    expect(eliminatoireService.deactivate).toHaveBeenCalledWith(2);

    component.toggleActivation('note', notes[0]);
    expect(noteService.deactivate).toHaveBeenCalledWith(1);

    eliminatoireService.findAll.and.returnValue(throwError(() => new Error('boom')));
    component['loadCriteres']();
    expect(component.errorEliminatoires()).toBe('Impossible de charger les critères éliminatoires');

    noteService.findAll.and.returnValue(throwError(() => new Error('boom')));
    component['loadCriteres']();
    expect(component.errorNotes()).toContain('Impossible de charger');

    tick(2500);
    fixture.destroy();
  }));

  it('should create note criteria and update eliminatory criteria', fakeAsync(() => {
    component.openCreateModal('note');
    expect(component.modalType).toBe('note');
    component.noteForm.controls['libelle'].setValue('Nouvelle note');
    component.noteForm.controls['domaine'].setValue('Domaine');
    component.noteForm.controls['ordre'].setValue(1);
    component.noteForm.controls['bareme'].setValue(20);
    component.noteForm.controls['poids'].setValue(1);
    component.noteForm.controls['seuil'].setValue(10);

    component.saveCritere();

    expect(noteService.create).toHaveBeenCalled();
    expect(component.successMessage()).toContain('not');

    component.openEditModal('eliminatoire', eliminatoires[0]);
    expect(component.eliminatoireForm.controls['libelle'].value).toBe('Git disponible ?');
    component.eliminatoireForm.controls['libelle'].setValue('Git obligatoire');
    component.saveCritere();

    expect(eliminatoireService.update).toHaveBeenCalledWith(2, jasmine.objectContaining({
      libelle: 'Git obligatoire',
    }));
    expect(component.successMessage()).toContain('liminatoire');

    tick(3000);
  }));

  it('should expose save errors and invalid note forms', () => {
    component.openCreateModal('note');
    component.noteForm.controls['libelle'].setValue('');
    component.saveCritere();
    expect(component.errorMessage()).toContain('Formulaire invalide');

    component.openCreateModal('eliminatoire');
    component.eliminatoireForm.controls['libelle'].setValue('Regle valide');
    component.eliminatoireForm.controls['domaine'].setValue('Domaine');
    component.eliminatoireForm.controls['ordre'].setValue(1);
    eliminatoireService.create.and.returnValue(throwError(() => new Error('boom')));
    component.saveCritere();
    expect(component.errorMessage()).toContain('Erreur lors de la sauvegarde');
    expect(component.saving()).toBeFalse();

    component.openCreateModal('note');
    component.noteForm.controls['libelle'].setValue('Note valide');
    component.noteForm.controls['domaine'].setValue('Domaine');
    component.noteForm.controls['ordre'].setValue(1);
    component.noteForm.controls['bareme'].setValue(20);
    component.noteForm.controls['poids'].setValue(1);
    component.noteForm.controls['seuil'].setValue(10);
    noteService.create.and.returnValue(throwError(() => new Error('boom')));
    component.saveCritere();
    expect(component.errorMessage()).toContain('Erreur lors de la sauvegarde');
    expect(component.saving()).toBeFalse();
  });

  it('should activate inactive criteria and expose activation errors', fakeAsync(() => {
    const inactiveEliminatoire = { ...eliminatoires[0], actif: false };
    const inactiveNote = { ...notes[0], actif: false };

    component.toggleActivation('eliminatoire', inactiveEliminatoire);
    expect(eliminatoireService.activate).toHaveBeenCalledWith(2);
    expect(component.successMessage()).toContain('activ');

    component.toggleActivation('note', inactiveNote);
    expect(noteService.activate).toHaveBeenCalledWith(1);

    eliminatoireService.deactivate.and.returnValue(throwError(() => new Error('boom')));
    component.toggleActivation('eliminatoire', eliminatoires[0]);
    expect(component.errorMessage()).toContain('d');
    expect(component.deleting()).toBeFalse();

    noteService.activate.and.returnValue(throwError(() => new Error('boom')));
    component.toggleActivation('note', inactiveNote);
    expect(component.errorMessage()).toContain('activation');
    expect(component.deleting()).toBeFalse();

    tick(3000);
  }));

  it('should clamp pagination and reset pages when search changes', () => {
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

    expect(component.eliminatoiresSearch()).toBe('git');
    expect(component.notesSearch()).toBe('qualite');
    expect(component.eliminatoiresPage()).toBe(1);
    expect(component.notesPage()).toBe(1);
  });
});
