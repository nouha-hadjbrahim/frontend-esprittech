import { ComponentFixture, TestBed, fakeAsync, tick } from '@angular/core/testing';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { of, throwError } from 'rxjs';
import { Equipe } from '../../../core/models/equipe.model';
import { User } from '../../../core/models/user.model';
import { EquipeService } from '../../../core/services/equipe.service';
import { DialogueAjouterMembresComponent } from './dialogue-ajouter-membres.component';

const mockEquipe: Equipe = {
  id: 1, nom: 'AI Lab', description: 'Test', domaineId: 1, domaine: 'Info',
  chef: null, nbMembres: 2, createdAt: '2025-01-01', statut: 'Actif',
};

const mockUsers: User[] = [
  { id: 10, prenom: 'Jean', nom: 'Dupont', email: 'jean@test.tn', identifiant: 'jd', role: 'ROLE_ENSEIGNANT', typeUtilisateur: 'ENSEIGNANT', departement: null, enabled: true, createdAt: '2025-01-01', isAffilieToEquipe: false, equipeId: null, equipeNom: null },
  { id: 11, prenom: 'Marie', nom: 'Curie', email: 'marie@test.tn', identifiant: 'mc', role: 'ROLE_ENSEIGNANT', typeUtilisateur: 'ENSEIGNANT', departement: null, enabled: true, createdAt: '2025-01-01', isAffilieToEquipe: false, equipeId: null, equipeNom: null },
];

describe('DialogueAjouterMembresComponent', () => {
  let component: DialogueAjouterMembresComponent;
  let fixture: ComponentFixture<DialogueAjouterMembresComponent>;
  let svc: jasmine.SpyObj<EquipeService>;
  let snack: jasmine.SpyObj<MatSnackBar>;
  let ref: jasmine.SpyObj<MatDialogRef<DialogueAjouterMembresComponent>>;

  beforeEach(() => {
    svc = jasmine.createSpyObj<EquipeService>('EquipeService', ['chercherUtilisateursEligibles', 'ajouterMembres']);
    snack = jasmine.createSpyObj<MatSnackBar>('MatSnackBar', ['open']);
    ref = jasmine.createSpyObj<MatDialogRef<DialogueAjouterMembresComponent>>('MatDialogRef', ['close']);

    svc.chercherUtilisateursEligibles.and.returnValue(of({ content: mockUsers, page: 0, size: 100, totalElements: 2, totalPages: 1, first: true, last: true }));

    TestBed.configureTestingModule({
      imports: [DialogueAjouterMembresComponent],
      providers: [
        { provide: EquipeService, useValue: svc },
        { provide: MatSnackBar, useValue: snack },
        { provide: MatDialogRef, useValue: ref },
        { provide: MAT_DIALOG_DATA, useValue: mockEquipe },
      ],
    });
    fixture = TestBed.createComponent(DialogueAjouterMembresComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should load candidates on init', () => {
    expect(svc.chercherUtilisateursEligibles).toHaveBeenCalledWith('', 1, 'MEMBER', 0, 100);
    expect(component.candidats.length).toBe(2);
  });

  it('should show snackbar on load error', () => {
    svc.chercherUtilisateursEligibles.and.returnValue(throwError(() => new Error('fail')));
    component.ngOnInit();
    expect(snack.open).toHaveBeenCalled();
  });

  it('should toggle selection with basculer', () => {
    expect(component.estSelectionne(mockUsers[0])).toBeFalse();
    component.basculer(mockUsers[0]);
    expect(component.estSelectionne(mockUsers[0])).toBeTrue();
    expect(component.selection.length).toBe(1);

    component.basculer(mockUsers[0]);
    expect(component.estSelectionne(mockUsers[0])).toBeFalse();
    expect(component.selection.length).toBe(0);
  });

  it('should confirm and add members', () => {
    svc.ajouterMembres.and.returnValue(of(mockEquipe));
    component.basculer(mockUsers[0]);
    component.basculer(mockUsers[1]);

    component.confirmer();

    expect(svc.ajouterMembres).toHaveBeenCalledWith(1, [10, 11]);
    expect(ref.close).toHaveBeenCalledWith('updated');
  });

  it('should not confirm when selection is empty', () => {
    component.confirmer();
    expect(svc.ajouterMembres).not.toHaveBeenCalled();
  });

  it('should show snackbar on confirm error', () => {
    svc.ajouterMembres.and.returnValue(throwError(() => new Error('fail')));
    component.basculer(mockUsers[0]);
    component.confirmer();
    expect(snack.open).toHaveBeenCalled();
  });

  it('should search on query change', fakeAsync(() => {
    svc.chercherUtilisateursEligibles.calls.reset();
    component.search$.next('Jean');
    tick(350);
    expect(svc.chercherUtilisateursEligibles).toHaveBeenCalledWith('Jean', 1, 'MEMBER', 0, 100);
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
