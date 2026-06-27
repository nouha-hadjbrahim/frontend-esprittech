import { ComponentFixture, TestBed, fakeAsync, tick } from '@angular/core/testing';
import { of, throwError } from 'rxjs';
import { CritereEliminatoireService } from '../../core/services/critere-eliminatoire.service';
import { CritereNoteService } from '../../core/services/critere-note.service';
import { AdminCriteresPageComponent } from './admin-criteres-page.component';

describe('AdminCriteresPageComponent', () => {
  let component: AdminCriteresPageComponent;
  let fixture: ComponentFixture<AdminCriteresPageComponent>;
  let eliminatoireService: jasmine.SpyObj<CritereEliminatoireService>;
  let noteService: jasmine.SpyObj<CritereNoteService>;

  const eliminatoires = [
    {
      id: 2,
      libelle: 'Git disponible ?',
      description: 'Desc',
      domaine: 'Domaine B',
      ordre: 2,
      reponseAttendue: 'OK',
      actif: true,
      ruleEnabled: false,
      modeEvaluation: null,
      expectedLivrableTypes: null,
      minLivrableCount: null,
      expectedKeyword: null,
      noteMaxAuto: null,
      ruleDescription: null,
    },
  ] as never[];

  const notes = [
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
      ruleEnabled: false,
      modeEvaluation: null,
      expectedLivrableTypes: null,
      minLivrableCount: null,
      expectedKeyword: null,
      noteMaxAuto: null,
      ruleDescription: null,
    },
  ] as never[];

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
    expect(component.eliminatoireForm.controls.reponseAttendue.value).toBe('OK');

    component.eliminatoireForm.controls.libelle.setValue('Nouvelle regle');
    component.eliminatoireForm.controls.domaine.setValue('Domaine');
    component.eliminatoireForm.controls.ordre.setValue(1);
    component.saveCritere();
    expect(eliminatoireService.create).toHaveBeenCalled();

    component.openEditModal('note', notes[0]);
    expect(component.modalType).toBe('note');
    expect(component.noteForm.controls.libelle.value).toBe('Qualite code');
    component.eliminatoireForm.controls.libelle.setValue('Nouvelle regle');
    component.noteForm.controls.libelle.setValue('Nouvelle note');
    component.noteForm.controls.domaine.setValue('Domaine');
    component.noteForm.controls.ordre.setValue(1);
    component.noteForm.controls.bareme.setValue(20);
    component.noteForm.controls.poids.setValue(1);
    component.noteForm.controls.seuil.setValue(10);
    component.saveCritere();
    expect(noteService.update).toHaveBeenCalled();
  });

  it('should validate save, toggle activation and show errors', fakeAsync(() => {
    component.openCreateModal('eliminatoire');
    component.eliminatoireForm.controls.libelle.setValue('   ');
    component.saveCritere();
    expect(component.errorMessage()).toBe('Formulaire invalide. Veuillez vérifier les champs.');

    component.toggleActivation('eliminatoire', eliminatoires[0]);
    expect(eliminatoireService.deactivate).toHaveBeenCalledWith(2);

    component.toggleActivation('note', notes[0]);
    expect(noteService.deactivate).toHaveBeenCalledWith(1);

    eliminatoireService.findAll.and.returnValue(throwError(() => new Error('boom')));
    component['loadCriteres']();
    expect(component.errorEliminatoires()).toBe('Impossible de charger les critères éliminatoires');

    tick(2500);
    fixture.destroy();
  }));
});
