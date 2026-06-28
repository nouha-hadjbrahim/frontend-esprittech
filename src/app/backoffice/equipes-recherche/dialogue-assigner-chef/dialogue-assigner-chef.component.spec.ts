import { ComponentFixture, TestBed, fakeAsync, tick } from '@angular/core/testing';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { of, throwError } from 'rxjs';
import { Equipe } from '../../../core/models/equipe.model';
import { User } from '../../../core/models/user.model';
import { EquipeService } from '../../../core/services/equipe.service';
import { DialogueAssignerChefComponent } from './dialogue-assigner-chef.component';

const mockEquipe: Equipe = {
  id: 1, nom: 'AI Lab', description: 'Test', domaineId: 1, domaine: 'Info',
  chef: null, nbMembres: 3, createdAt: '2025-01-01', statut: 'Actif',
};

const mockUsers: User[] = [
  { id: 10, prenom: 'Jean', nom: 'Dupont', email: 'jean@test.tn', identifiant: 'jd', role: 'ROLE_ENSEIGNANT', typeUtilisateur: 'ENSEIGNANT', departement: null, enabled: true, createdAt: '2025-01-01' },
  { id: 11, prenom: 'Marie', nom: 'Curie', email: 'marie@test.tn', identifiant: 'mc', role: 'ROLE_CHEF_EQUIPE', typeUtilisateur: 'ENSEIGNANT', departement: null, enabled: true, createdAt: '2025-01-01' },
];

describe('DialogueAssignerChefComponent', () => {
  let component: DialogueAssignerChefComponent;
  let fixture: ComponentFixture<DialogueAssignerChefComponent>;
  let svc: jasmine.SpyObj<EquipeService>;
  let snack: jasmine.SpyObj<MatSnackBar>;
  let ref: jasmine.SpyObj<MatDialogRef<DialogueAssignerChefComponent>>;

  beforeEach(() => {
    svc = jasmine.createSpyObj<EquipeService>('EquipeService', ['chercherUtilisateursEligibles', 'assignerChef']);
    snack = jasmine.createSpyObj<MatSnackBar>('MatSnackBar', ['open']);
    ref = jasmine.createSpyObj<MatDialogRef<DialogueAssignerChefComponent>>('MatDialogRef', ['close']);

    svc.chercherUtilisateursEligibles.and.returnValue(of({ content: mockUsers, page: 0, size: 100, totalElements: 2, totalPages: 1, first: true, last: true }));

    TestBed.configureTestingModule({
      imports: [DialogueAssignerChefComponent],
      providers: [
        { provide: EquipeService, useValue: svc },
        { provide: MatSnackBar, useValue: snack },
        { provide: MatDialogRef, useValue: ref },
        { provide: MAT_DIALOG_DATA, useValue: mockEquipe },
      ],
    });
    fixture = TestBed.createComponent(DialogueAssignerChefComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should load candidates on init', () => {
    expect(svc.chercherUtilisateursEligibles).toHaveBeenCalledWith('', 1, 'CHEF', 0, 100);
    expect(component.candidats.length).toBe(2);
    expect(component.chargement).toBeFalse();
  });

  it('should show snackbar on load error', () => {
    svc.chercherUtilisateursEligibles.and.returnValue(throwError(() => new Error('fail')));
    component.ngOnInit();
    expect(snack.open).toHaveBeenCalled();
  });

  it('should select and deselect a candidate', () => {
    component.selectionner(mockUsers[0]);
    expect(component.candidat.length).toBe(1);
    expect(component.candidat[0].id).toBe(10);

    component.selectionner(mockUsers[0]);
    expect(component.candidat.length).toBe(0);
  });

  it('should switch selection on different user', () => {
    component.selectionner(mockUsers[0]);
    component.selectionner(mockUsers[1]);
    expect(component.candidat.length).toBe(1);
    expect(component.candidat[0].id).toBe(11);
  });

  it('should confirm and assign chef', () => {
    const updated = { ...mockEquipe, chef: mockUsers[1] };
    svc.assignerChef.and.returnValue(of(updated));

    component.selectionner(mockUsers[1]);
    component.confirmer();

    expect(svc.assignerChef).toHaveBeenCalledWith(1, 11);
    expect(ref.close).toHaveBeenCalledWith(updated);
  });

  it('should not confirm when no candidate selected', () => {
    component.confirmer();
    expect(svc.assignerChef).not.toHaveBeenCalled();
  });

  it('should show snackbar on assign error', () => {
    svc.assignerChef.and.returnValue(throwError(() => new Error('fail')));
    component.selectionner(mockUsers[0]);
    component.confirmer();
    expect(snack.open).toHaveBeenCalled();
  });

  it('should search on query change', fakeAsync(() => {
    svc.chercherUtilisateursEligibles.calls.reset();
    component.search$.next('Jean');
    tick(350);
    expect(svc.chercherUtilisateursEligibles).toHaveBeenCalledWith('Jean', 1, 'CHEF', 0, 100);
  }));

  it('should compute initiales and couleurAvatar', () => {
    const u = mockUsers[0];
    expect(component.initiales(u)).toBe('JD');
    expect(component.initiales({ ...u, prenom: null as any })).toBe('D');
    expect(component.initiales({ ...u, nom: null as any })).toBe('J');
    expect(component.initiales({ ...u, prenom: null as any, nom: null as any })).toBe('');
    expect(component.couleurAvatar(u)).toBeTruthy();
  });
});
