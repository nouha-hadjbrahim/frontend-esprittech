import { ComponentFixture, TestBed, fakeAsync, tick } from '@angular/core/testing';
import { MatDialogRef } from '@angular/material/dialog';
import { of, throwError } from 'rxjs';
import { CreateEquipePayload } from '../../../core/models/equipe.model';
import { User } from '../../../core/models/user.model';
import { EquipeDomaine } from '../../../core/models/equipe-domaine.model';
import { EquipeService } from '../../../core/services/equipe.service';
import { EquipeDomaineService } from '../../../core/services/equipe-domaine.service';
import { DialogueCreerEquipeComponent } from './dialogue-creer-equipe.component';

const domaines: EquipeDomaine[] = [
  { id: 1, nom: 'Informatique', dateCreation: '2025-01-01' },
  { id: 2, nom: 'Mathématiques', dateCreation: '2025-01-02' },
];

const mockUsers: User[] = [
  { id: 10, prenom: 'Jean', nom: 'Dupont', email: 'jean@test.tn', identifiant: 'jd', role: 'ROLE_ENSEIGNANT', typeUtilisateur: 'ENSEIGNANT', departement: null, enabled: true, createdAt: '2025-01-01', isAffilieToEquipe: false, equipeId: null, equipeNom: null },
  { id: 11, prenom: 'Marie', nom: 'Curie', email: 'marie@test.tn', identifiant: 'mc', role: 'ROLE_CHEF_EQUIPE', typeUtilisateur: 'ENSEIGNANT', departement: null, enabled: true, createdAt: '2025-01-01', isAffilieToEquipe: false, equipeId: null, equipeNom: null },
  { id: 12, prenom: 'Paul', nom: 'Sab', email: 'paul@test.tn', identifiant: 'ps', role: 'ROLE_ENSEIGNANT', typeUtilisateur: 'ENSEIGNANT', departement: null, enabled: true, createdAt: '2025-01-01', isAffilieToEquipe: false, equipeId: null, equipeNom: null },
];

describe('DialogueCreerEquipeComponent', () => {
  let component: DialogueCreerEquipeComponent;
  let fixture: ComponentFixture<DialogueCreerEquipeComponent>;
  let equipeSvc: jasmine.SpyObj<EquipeService>;
  let domaineSvc: jasmine.SpyObj<EquipeDomaineService>;
  let ref: jasmine.SpyObj<MatDialogRef<DialogueCreerEquipeComponent>>;

  const mockPage = (users: User[]) => ({
    content: users, page: 0, size: 10, totalElements: users.length,
    totalPages: 1, first: true, last: true,
  });

  beforeEach(() => {
    equipeSvc = jasmine.createSpyObj<EquipeService>('EquipeService', ['chercherUtilisateursEligibles']);
    domaineSvc = jasmine.createSpyObj<EquipeDomaineService>('EquipeDomaineService', ['getAll']);
    ref = jasmine.createSpyObj<MatDialogRef<DialogueCreerEquipeComponent>>('MatDialogRef', ['close']);

    domaineSvc.getAll.and.returnValue(of(domaines));
    equipeSvc.chercherUtilisateursEligibles.and.returnValue(of(mockPage(mockUsers)));

    TestBed.configureTestingModule({
      imports: [DialogueCreerEquipeComponent],
      providers: [
        { provide: EquipeService, useValue: equipeSvc },
        { provide: EquipeDomaineService, useValue: domaineSvc },
        { provide: MatDialogRef, useValue: ref },
      ],
    });
    fixture = TestBed.createComponent(DialogueCreerEquipeComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should load domaines on init', () => {
    expect(domaineSvc.getAll).toHaveBeenCalled();
    expect(component.domaines).toEqual(domaines);
  });

  it('should submit with valid form and close with payload', () => {
    component.form.nom = 'New Team';
    component.form.description = 'A great team';
    component.domaineId = 1;

    component.submit();

    const expected: CreateEquipePayload = {
      nom: 'New Team',
      description: 'A great team',
      domaineId: 1,
      chefId: null,
      memberIds: null,
    };
    expect(ref.close).toHaveBeenCalledWith(expected);
  });

  it('should not submit when form is invalid', () => {
    component.form.nom = '';
    component.form.description = '';
    component.domaineId = null;
    component.submit();
    expect(ref.close).not.toHaveBeenCalled();
  });

  it('should not submit when nom is empty', () => {
    component.form.nom = '';
    component.form.description = 'desc';
    component.domaineId = 1;
    component.submit();
    expect(ref.close).not.toHaveBeenCalled();
  });

  it('should submit with chef and members', () => {
    component.form.nom = 'Team';
    component.form.description = 'desc';
    component.domaineId = 1;
    component.chefs = [mockUsers[0]];
    component.membres = [mockUsers[0], mockUsers[1]];

    component.submit();

    const payload = ref.close.calls.mostRecent().args[0] as CreateEquipePayload;
    expect(payload.chefId).toBe(10);
    expect(payload.memberIds).toEqual([11]);
  });

  it('should selectionnerChef and add to membres', () => {
    component.selectionnerChef(mockUsers[0]);
    expect(component.chefs.length).toBe(1);
    expect(component.chefs[0].id).toBe(10);
    expect(component.membres.some((m) => m.id === 10)).toBeTrue();
    expect(component.queryChef).toBe('');
    expect(component.showDropdownChef).toBeFalse();
  });

  it('should not duplicate chef in membres', () => {
    component.membres = [mockUsers[0]];
    component.selectionnerChef(mockUsers[0]);
    expect(component.membres.length).toBe(1);
  });

  it('should retirerChef and clean membres', () => {
    component.selectionnerChef(mockUsers[0]);
    component.retirerChef();
    expect(component.chefs.length).toBe(0);
    expect(component.membres.length).toBe(0);
  });

  it('should retirerChef safely when no chef', () => {
    component.retirerChef();
    expect(component.chefs.length).toBe(0);
  });

  it('should handle chef keyboard navigation', () => {
    component.candidatsChef = [mockUsers[0], mockUsers[1]];
    component.showDropdownChef = true;
    component.hiChef = 0;
    component.chefs = [];
    component.queryChef = '';

    const down = new KeyboardEvent('keydown', { key: 'ArrowDown' });
    component.onChefKeydown(down);
    expect(component.hiChef).toBe(1);

    const up = new KeyboardEvent('keydown', { key: 'ArrowUp' });
    component.onChefKeydown(up);
    expect(component.hiChef).toBe(0);

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
    component.basculerMembre(mockUsers[0]);
    expect(component.estSelectionne(mockUsers[0])).toBeTrue();
    expect(component.membres.length).toBe(1);

    component.basculerMembre(mockUsers[0]);
    expect(component.estSelectionne(mockUsers[0])).toBeFalse();
  });

  it('should not remove chef from membres via basculerMembre', () => {
    component.chefs = [mockUsers[0]];
    component.membres = [mockUsers[0], mockUsers[1]];
    component.basculerMembre(mockUsers[0]);
    expect(component.membres.length).toBe(2);
  });

  it('should remove non-chef member via basculerMembre when chef exists', () => {
    component.chefs = [mockUsers[0]];
    component.membres = [mockUsers[0], mockUsers[1]];
    component.basculerMembre(mockUsers[1]);
    expect(component.membres.length).toBe(1);
  });

  it('should retirerMembre safely', () => {
    component.membres = [mockUsers[0], mockUsers[1]];
    component.retirerMembre(mockUsers[0]);
    expect(component.membres.length).toBe(1);

    component.retirerMembre(mockUsers[0]);
    expect(component.membres.length).toBe(1);
  });

  it('should not retirerMembre when it is the chef', () => {
    component.chefs = [mockUsers[0]];
    component.membres = [mockUsers[0], mockUsers[1]];
    component.retirerMembre(mockUsers[0]);
    expect(component.membres.length).toBe(2);
  });

  it('should retirerMembre when chef exists but removing non-chef member', () => {
    component.chefs = [mockUsers[0]];
    component.membres = [mockUsers[0], mockUsers[1]];
    component.retirerMembre(mockUsers[1]);
    expect(component.membres.length).toBe(1);
  });

  it('should compute membresSansChef', () => {
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

    const up = new KeyboardEvent('keydown', { key: 'ArrowUp' });
    component.onMembresKeydown(up);
    expect(component.hiMembres).toBe(0);

    const enter = new KeyboardEvent('keydown', { key: 'Enter' });
    component.onMembresKeydown(enter);
    expect(component.estSelectionne(mockUsers[0])).toBeTrue();

    component.showDropdownMembres = true;
    const esc = new KeyboardEvent('keydown', { key: 'Escape' });
    component.onMembresKeydown(esc);
    expect(component.showDropdownMembres).toBeFalse();
  });

  it('should initiales and couleurAvatar helpers', () => {
    expect(component.initiales(mockUsers[0])).toBe('JD');
    expect(component.initiales({ ...mockUsers[0], prenom: null as any })).toBe('D');
    expect(component.initiales({ ...mockUsers[0], nom: null as any })).toBe('J');
    expect(component.initiales({ ...mockUsers[0], prenom: null as any, nom: null as any })).toBe('');
    expect(component.couleurAvatar(mockUsers[0])).toBeTruthy();
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
    expect(equipeSvc.chercherUtilisateursEligibles).toHaveBeenCalledWith('abc', null, 'CHEF');
    expect(component.candidatsChef.length).toBe(3);
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
    expect(equipeSvc.chercherUtilisateursEligibles).toHaveBeenCalledWith('abc', null, 'MEMBER');
    expect(component.candidatsMembres.length).toBe(3);
    expect(component.hiMembres).toBe(0);
  }));

  it('should handle member search error', fakeAsync(() => {
    equipeSvc.chercherUtilisateursEligibles.and.returnValue(throwError(() => new Error('fail')));
    component.onMembresQueryChange('abc');
    tick(350);
    expect(component.chargementMembres).toBeFalse();
  }));

  it('should close dropdowns on outside click', () => {
    component.showDropdownChef = true;
    component.showDropdownMembres = true;
    const outside = new MouseEvent('mousedown');
    Object.defineProperty(outside, 'target', { value: document.createElement('div') });
    component.onDocClick(outside);
    expect(component.showDropdownChef).toBeFalse();
    expect(component.showDropdownMembres).toBeFalse();
  });

  it('should focusChefInput without error', () => {
    expect(() => component.focusChefInput()).not.toThrow();
  });

  it('should not submit when description is empty', () => {
    component.form.nom = 'Team';
    component.form.description = '';
    component.domaineId = 1;
    component.submit();
    expect(ref.close).not.toHaveBeenCalled();
  });

  it('should not submit when domaineId is null', () => {
    component.form.nom = 'Team';
    component.form.description = 'desc';
    component.domaineId = null;
    component.submit();
    expect(ref.close).not.toHaveBeenCalled();
  });
});
