import { ComponentFixture, TestBed, fakeAsync, tick } from '@angular/core/testing';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { of, throwError } from 'rxjs';
import { Equipe } from '../../../core/models/equipe.model';
import { User } from '../../../core/models/user.model';
import { EquipeDomaine } from '../../../core/models/equipe-domaine.model';
import { EquipeService } from '../../../core/services/equipe.service';
import { EquipeDomaineService } from '../../../core/services/equipe-domaine.service';
import { DialogueModifierEquipeComponent } from './dialogue-modifier-equipe.component';

const chef: User = { id: 5, prenom: 'Chef', nom: 'Equipe', email: 'chef@test.tn', role: 'ROLE_CHEF_EQUIPE', typeUtilisateur: 'ENSEIGNANT', departement: null, enabled: true, createdAt: '2025-01-01', isAffilieToEquipe: true, equipeId: 1, equipeNom: 'AI Lab' };
const members: User[] = [
  { id: 10, prenom: 'Membre1', nom: 'Un', email: 'm1@test.tn', role: 'ROLE_ENSEIGNANT', typeUtilisateur: 'ENSEIGNANT', departement: null, enabled: true, createdAt: '2025-01-01', isAffilieToEquipe: true, equipeId: 1, equipeNom: 'AI Lab' },
  { id: 11, prenom: 'Membre2', nom: 'Deux', email: 'm2@test.tn', role: 'ROLE_ENSEIGNANT', typeUtilisateur: 'ENSEIGNANT', departement: null, enabled: true, createdAt: '2025-01-01', isAffilieToEquipe: true, equipeId: 1, equipeNom: 'AI Lab' },
];

const mockEquipe: Equipe = {
  id: 1, nom: 'AI Lab', description: 'Research team', domaineId: 1, domaine: 'Informatique',
  chef, nbMembres: 3, createdAt: '2025-01-15', statut: 'Actif', members,
};

const domaines: EquipeDomaine[] = [
  { id: 1, nom: 'Informatique', dateCreation: '2025-01-01' },
  { id: 2, nom: 'Mathématiques', dateCreation: '2025-01-02' },
];

const mockUsers: User[] = [
  { id: 20, prenom: 'Nouveau', nom: 'Chef', email: 'nch@test.tn', role: 'ROLE_ENSEIGNANT', typeUtilisateur: 'ENSEIGNANT', departement: null, enabled: true, createdAt: '2025-01-01', isAffilieToEquipe: false, equipeId: null, equipeNom: null },
  { id: 21, prenom: 'Autre', nom: 'Membre', email: 'am@test.tn', role: 'ROLE_ENSEIGNANT', typeUtilisateur: 'ENSEIGNANT', departement: null, enabled: true, createdAt: '2025-01-01', isAffilieToEquipe: false, equipeId: null, equipeNom: null },
];

describe('DialogueModifierEquipeComponent', () => {
  let component: DialogueModifierEquipeComponent;
  let fixture: ComponentFixture<DialogueModifierEquipeComponent>;
  let equipeSvc: jasmine.SpyObj<EquipeService>;
  let domaineSvc: jasmine.SpyObj<EquipeDomaineService>;
  let snack: jasmine.SpyObj<MatSnackBar>;
  let ref: jasmine.SpyObj<MatDialogRef<DialogueModifierEquipeComponent>>;

  beforeEach(() => {
    equipeSvc = jasmine.createSpyObj<EquipeService>('EquipeService', ['chercherUtilisateursEligibles']);
    domaineSvc = jasmine.createSpyObj<EquipeDomaineService>('EquipeDomaineService', ['getAll']);
    snack = jasmine.createSpyObj<MatSnackBar>('MatSnackBar', ['open']);
    ref = jasmine.createSpyObj<MatDialogRef<DialogueModifierEquipeComponent>>('MatDialogRef', ['close']);

    domaineSvc.getAll.and.returnValue(of(domaines));
    equipeSvc.chercherUtilisateursEligibles.and.returnValue(of({ content: mockUsers, page: 0, size: 10, totalElements: 2, totalPages: 1, first: true, last: true }));

    TestBed.configureTestingModule({
      imports: [DialogueModifierEquipeComponent],
      providers: [
        { provide: EquipeService, useValue: equipeSvc },
        { provide: EquipeDomaineService, useValue: domaineSvc },
        { provide: MatSnackBar, useValue: snack },
        { provide: MatDialogRef, useValue: ref },
        { provide: MAT_DIALOG_DATA, useValue: mockEquipe },
      ],
    });
    fixture = TestBed.createComponent(DialogueModifierEquipeComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should load domaines and init form from equipe data', () => {
    expect(domaineSvc.getAll).toHaveBeenCalled();
    expect(component.form.nom).toBe('AI Lab');
    expect(component.form.description).toBe('Research team');
    expect(component.form.domaineId).toBe(1);
    expect(component.form.statut).toBe('Actif');
  });

  it('should populate chefs from equipe.chef', () => {
    expect(component.chefs.length).toBe(1);
    expect(component.chefs[0].id).toBe(5);
  });

  it('should populate membres from equipe.members excluding chef', () => {
    expect(component.membres.length).toBe(2);
    expect(component.membres.every((m) => m.id !== 5)).toBeTrue();
  });

  it('should submit with valid form and close with updated equipe', () => {
    component.form.nom = 'Updated Lab';
    component.form.description = 'Updated desc';

    component.submit();

    const updated = ref.close.calls.mostRecent().args[0] as Equipe;
    expect(updated.nom).toBe('Updated Lab');
    expect(updated.description).toBe('Updated desc');
    expect(updated.domaineId).toBe(1);
    expect(updated.domaine).toBe('Informatique');
    expect(updated.chef?.id).toBe(5);
    expect(updated.emailChef).toBe('chef@test.tn');
  });

  it('should not submit when form is invalid', () => {
    component.form.nom = '';
    component.submit();
    expect(ref.close).not.toHaveBeenCalled();
  });

  it('should resolve domaine name from domaines list', () => {
    component.form.domaineId = 2;
    component.submit();
    const updated = ref.close.calls.mostRecent().args[0] as Equipe;
    expect(updated.domaine).toBe('Mathématiques');
  });

  it('should use empty string for unknown domaine', () => {
    component.form.domaineId = 99;
    component.submit();
    const updated = ref.close.calls.mostRecent().args[0] as Equipe;
    expect(updated.domaine).toBe('');
  });

  it('should set emailChef to undefined when no chef', () => {
    component.chefs = [];
    component.submit();
    const updated = ref.close.calls.mostRecent().args[0] as Equipe;
    expect(updated.emailChef).toBeUndefined();
  });

  it('should selectionnerChef correctly', () => {
    component.selectionnerChef(mockUsers[0]);
    expect(component.chefs.length).toBe(1);
    expect(component.chefs[0].id).toBe(20);
    expect(component.touchedChef).toBeFalse();
    expect(component.showDropdownChef).toBeFalse();
  });

  it('should add chef to membres if not already present', () => {
    component.selectionnerChef(mockUsers[1]);
    expect(component.membres.some((m) => m.id === 21)).toBeTrue();
  });

  it('should retirerChef and clean membres', () => {
    component.retirerChef();
    expect(component.chefs.length).toBe(0);
    expect(component.membres.every((m) => m.id !== 5)).toBeTrue();
  });

  it('should handle chef keyboard navigation', () => {
    component.candidatsChef = [mockUsers[0], mockUsers[1]];
    component.showDropdownChef = true;
    component.hiChef = 0;

    const down = new KeyboardEvent('keydown', { key: 'ArrowDown' });
    component.onChefKeydown(down);
    expect(component.hiChef).toBe(1);

    const enter = new KeyboardEvent('keydown', { key: 'Enter' });
    component.onChefKeydown(enter);
    expect(component.chefs.length).toBe(1);

    component.showDropdownChef = true;
    const esc = new KeyboardEvent('keydown', { key: 'Escape' });
    component.onChefKeydown(esc);
    expect(component.showDropdownChef).toBeFalse();

    component.chefs = [mockUsers[0]];
    component.queryChef = '';
    const back = new KeyboardEvent('keydown', { key: 'Backspace' });
    component.onChefKeydown(back);
    expect(component.chefs.length).toBe(0);
  });

  it('should basculerMembre toggle correctly', () => {
    component.membres = [];
    component.candidatsMembres = [];
    component.basculerMembre(mockUsers[0]);
    expect(component.estSelectionne(mockUsers[0])).toBeTrue();
    expect(component.candidatsMembres.length).toBe(0);

    component.basculerMembre(mockUsers[0]);
    expect(component.estSelectionne(mockUsers[0])).toBeFalse();
    expect(component.candidatsMembres.length).toBe(1);
  });

  it('should retirerMembre remove member', () => {
    component.membres = [mockUsers[0], mockUsers[1]];
    component.retirerMembre(mockUsers[0]);
    expect(component.membres.length).toBe(1);
  });

  it('should not retirerMembre when it is the chef', () => {
    component.chefs = [mockUsers[0]];
    component.membres = [mockUsers[0]];
    component.retirerMembre(mockUsers[0]);
    expect(component.membres.length).toBe(1);
  });

  it('should compute membresSansChef correctly', () => {
    component.chefs = [mockUsers[0]];
    component.membres = [mockUsers[0], mockUsers[1]];
    expect(component.membresSansChef.length).toBe(1);

    component.chefs = [];
    expect(component.membresSansChef.length).toBe(2);
  });

  it('should handle member keyboard navigation', () => {
    component.candidatsMembres = [mockUsers[0], mockUsers[1]];
    component.showDropdownMembres = true;
    component.hiMembres = 0;

    const down = new KeyboardEvent('keydown', { key: 'ArrowDown' });
    component.onMembresKeydown(down);
    expect(component.hiMembres).toBe(1);

    const esc = new KeyboardEvent('keydown', { key: 'Escape' });
    component.onMembresKeydown(esc);
    expect(component.showDropdownMembres).toBeFalse();
  });

  it('should close dropdown on outside click', () => {
    component.showDropdownChef = true;
    component.showDropdownMembres = true;
    const outside = new MouseEvent('mousedown');
    Object.defineProperty(outside, 'target', { value: document.createElement('div') });
    component.onDocClick(outside);
    expect(component.showDropdownChef).toBeFalse();
    expect(component.showDropdownMembres).toBeFalse();
  });

  it('should initiales and couleurAvatar helpers', () => {
    expect(component.initiales(mockUsers[0])).toBe('NC');
    expect(component.couleurAvatar(mockUsers[0])).toBeTruthy();
  });

  it('should handle null description in equipe', () => {
    const eqNoDesc = { ...mockEquipe, description: null, members: undefined };
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
      imports: [DialogueModifierEquipeComponent],
      providers: [
        { provide: EquipeService, useValue: equipeSvc },
        { provide: EquipeDomaineService, useValue: domaineSvc },
        { provide: MatSnackBar, useValue: snack },
        { provide: MatDialogRef, useValue: ref },
        { provide: MAT_DIALOG_DATA, useValue: eqNoDesc },
      ],
    });
    const comp = TestBed.createComponent(DialogueModifierEquipeComponent).componentInstance;
    comp.ngOnInit();
    expect(comp.form.description).toBe('');
    expect(comp.chefs.length).toBe(1);
    expect(comp.membres.length).toBe(0);
  });

  it('should clear chef candidates when query < 2 chars', fakeAsync(() => {
    component.onChefQueryChange('a');
    tick(350);
    expect(component.candidatsChef.length).toBe(0);
    expect(component.chargementChef).toBeFalse();
  }));

  it('should search chef with valid query', fakeAsync(() => {
    component.onChefQueryChange('abc');
    tick(350);
    expect(equipeSvc.chercherUtilisateursEligibles).toHaveBeenCalledWith('abc', 1, 'CHEF');
    expect(component.candidatsChef.length).toBe(2);
    expect(component.hiChef).toBe(0);
  }));

  it('should handle chef search error', fakeAsync(() => {
    equipeSvc.chercherUtilisateursEligibles.and.returnValue(throwError(() => new Error('fail')));
    component.onChefQueryChange('abc');
    tick(350);
    expect(component.chargementChef).toBeFalse();
  }));

  it('should clear member candidates when query < 2 chars', fakeAsync(() => {
    component.onMembresQueryChange('a');
    tick(350);
    expect(component.candidatsMembres.length).toBe(0);
    expect(component.chargementMembres).toBeFalse();
  }));

  it('should search members with valid query', fakeAsync(() => {
    component.onMembresQueryChange('abc');
    tick(350);
    expect(equipeSvc.chercherUtilisateursEligibles).toHaveBeenCalledWith('abc', 1, 'MEMBER');
    expect(component.candidatsMembres.length).toBe(2);
    expect(component.hiMembres).toBe(0);
  }));

  it('should handle member search error', fakeAsync(() => {
    equipeSvc.chercherUtilisateursEligibles.and.returnValue(throwError(() => new Error('fail')));
    component.onMembresQueryChange('abc');
    tick(350);
    expect(component.chargementMembres).toBeFalse();
  }));

  it('should close chef dropdown on outside click even when chefPickerRef is undefined', () => {
    component.showDropdownChef = true;
    const outside = new MouseEvent('mousedown');
    Object.defineProperty(outside, 'target', { value: document.createElement('div') });
    component.onDocClick(outside);
    expect(component.showDropdownChef).toBeFalse();
  });

  it('should focusChefInput without error', () => {
    expect(() => component.focusChefInput()).not.toThrow();
  });

  it('should handle ArrowUp on chef keyboard', () => {
    component.candidatsChef = [mockUsers[0], mockUsers[1]];
    component.showDropdownChef = true;
    component.hiChef = 0;

    const up = new KeyboardEvent('keydown', { key: 'ArrowUp' });
    component.onChefKeydown(up);
    expect(component.hiChef).toBe(1);

    const down = new KeyboardEvent('keydown', { key: 'ArrowDown' });
    component.onChefKeydown(down);
    expect(component.hiChef).toBe(0);
  });

  it('should handle ArrowUp on members keyboard', () => {
    component.candidatsMembres = [mockUsers[0], mockUsers[1]];
    component.showDropdownMembres = true;
    component.hiMembres = 0;

    const up = new KeyboardEvent('keydown', { key: 'ArrowUp' });
    component.onMembresKeydown(up);
    expect(component.hiMembres).toBe(1);

    const down = new KeyboardEvent('keydown', { key: 'ArrowDown' });
    component.onMembresKeydown(down);
    expect(component.hiMembres).toBe(0);
  });

  it('should handle Enter on members keyboard', () => {
    component.candidatsMembres = [mockUsers[0]];
    component.showDropdownMembres = true;
    component.hiMembres = 0;
    component.membres = [];

    const enter = new KeyboardEvent('keydown', { key: 'Enter' });
    component.onMembresKeydown(enter);
    expect(component.estSelectionne(mockUsers[0])).toBeTrue();
  });

  it('should populate membres via spread when equipe has members but no chef', () => {
    const membersNoChef = [members[0]];
    const eqNoChef = { ...mockEquipe, chef: null as any, members: membersNoChef };
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
      imports: [DialogueModifierEquipeComponent],
      providers: [
        { provide: EquipeService, useValue: equipeSvc },
        { provide: EquipeDomaineService, useValue: domaineSvc },
        { provide: MatSnackBar, useValue: snack },
        { provide: MatDialogRef, useValue: ref },
        { provide: MAT_DIALOG_DATA, useValue: eqNoChef },
      ],
    });
    const comp = TestBed.createComponent(DialogueModifierEquipeComponent).componentInstance;
    comp.ngOnInit();
    expect(comp.chefs.length).toBe(0);
    expect(comp.membres.length).toBe(1);
  });

it('should submit with empty memberIds when membres is empty', () => {
  component.membres = [];

  component.submit();

  const updated = ref.close.calls.mostRecent().args[0] as Equipe;

  expect(updated.memberIds).toEqual([]);
});

  it('should handle initiales with missing or empty name parts', () => {
    const noPrenom: User = { ...mockUsers[0], prenom: null as any };
    const noNom: User = { ...mockUsers[0], nom: null as any };
    const bothEmpty: User = { ...mockUsers[0], prenom: null as any, nom: null as any };
    expect(component.initiales(noPrenom)).toBe('C');
    expect(component.initiales(noNom)).toBe('N');
    expect(component.initiales(bothEmpty)).toBe('');
  });
});
