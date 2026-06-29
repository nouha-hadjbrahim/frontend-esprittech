import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MatDialog, MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { of, throwError } from 'rxjs';
import { Equipe } from '../../../core/models/equipe.model';
import { User } from '../../../core/models/user.model';
import { EquipeService } from '../../../core/services/equipe.service';
import { DialogueDetailsEquipeComponent } from './dialogue-details-equipe.component';

const chef: User = { id: 5, prenom: 'Chef', nom: 'Equipe', email: 'chef@test.tn', identifiant: 'ce', role: 'ROLE_CHEF_EQUIPE', typeUtilisateur: 'ENSEIGNANT', departement: null, enabled: true, createdAt: '2025-01-01', isAffilieToEquipe: false, equipeId: null, equipeNom: null };
const members: User[] = [
  { id: 10, prenom: 'Membre1', nom: 'Un', email: 'm1@test.tn', identifiant: 'm1', role: 'ROLE_ENSEIGNANT', typeUtilisateur: 'ENSEIGNANT', departement: null, enabled: true, createdAt: '2025-01-01', isAffilieToEquipe: false, equipeId: null, equipeNom: null },
  { id: 11, prenom: 'Membre2', nom: 'Deux', email: 'm2@test.tn', identifiant: 'm2', role: 'ROLE_ENSEIGNANT', typeUtilisateur: 'ENSEIGNANT', departement: null, enabled: true, createdAt: '2025-01-01', isAffilieToEquipe: false, equipeId: null, equipeNom: null },
];

const mockEquipe: Equipe = {
  id: 1, nom: 'AI Lab', description: 'Research team', domaineId: 1, domaine: 'Informatique',
  chef, nbMembres: 3, createdAt: '2025-01-15', statut: 'Actif', members,
};

describe('DialogueDetailsEquipeComponent', () => {
  let component: DialogueDetailsEquipeComponent;
  let fixture: ComponentFixture<DialogueDetailsEquipeComponent>;
  let svc: jasmine.SpyObj<EquipeService>;
  let snack: jasmine.SpyObj<MatSnackBar>;
  let ref: jasmine.SpyObj<MatDialogRef<DialogueDetailsEquipeComponent>>;
  let dialogOpenSpy: jasmine.Spy;

  beforeEach(() => {
    svc = jasmine.createSpyObj<EquipeService>('EquipeService', ['getMembres', 'retirerMembre', 'getById', 'retirerChef']);
    snack = jasmine.createSpyObj<MatSnackBar>('MatSnackBar', ['open']);
    ref = jasmine.createSpyObj<MatDialogRef<DialogueDetailsEquipeComponent>>('MatDialogRef', ['close']);

    svc.getMembres.and.returnValue(of(members));
    svc.getById.and.returnValue(of(mockEquipe));

    TestBed.configureTestingModule({
      imports: [DialogueDetailsEquipeComponent],
      providers: [
        { provide: EquipeService, useValue: svc },
        { provide: MatSnackBar, useValue: snack },
        { provide: MatDialogRef, useValue: ref },
        { provide: MAT_DIALOG_DATA, useValue: mockEquipe },
      ],
    });
    dialogOpenSpy = spyOn(MatDialog.prototype, 'open').and.returnValue({ afterClosed: () => of(true) } as any);
    fixture = TestBed.createComponent(DialogueDetailsEquipeComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should load members from eq.members when present', () => {
    expect(component.membresList.length).toBe(2);
    expect(component.membresList.every((m) => m.id !== chef.id)).toBeTrue();
    expect(svc.getMembres).not.toHaveBeenCalled();
  });

  it('should load members via API when eq.members is empty', () => {
    const eqNoMembers = { ...mockEquipe, members: undefined };
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
      imports: [DialogueDetailsEquipeComponent],
      providers: [
        { provide: EquipeService, useValue: svc },
        { provide: MatSnackBar, useValue: snack },
        { provide: MatDialogRef, useValue: ref },
        { provide: MAT_DIALOG_DATA, useValue: eqNoMembers },
      ],
    });
    const comp = TestBed.createComponent(DialogueDetailsEquipeComponent).componentInstance;
    comp.ngOnInit();
    expect(svc.getMembres).toHaveBeenCalledWith(1);
  });

  it('should show snackbar on API load error', () => {
    svc.getMembres.and.returnValue(throwError(() => new Error('fail')));
    const eqNoMembers = { ...mockEquipe, members: undefined };
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
      imports: [DialogueDetailsEquipeComponent],
      providers: [
        { provide: EquipeService, useValue: svc },
        { provide: MatSnackBar, useValue: snack },
        { provide: MatDialogRef, useValue: ref },
        { provide: MAT_DIALOG_DATA, useValue: eqNoMembers },
      ],
    });
    const comp = TestBed.createComponent(DialogueDetailsEquipeComponent).componentInstance;
    comp.ngOnInit();
    expect(snack.open).toHaveBeenCalled();
  });

  it('should retirerMembre with confirmation', () => {
    svc.retirerMembre.and.returnValue(of(mockEquipe));
    dialogOpenSpy.and.returnValue({ afterClosed: () => of(true) } as any);

    component.retirerMembre(members[0]);

    expect(dialogOpenSpy).toHaveBeenCalled();
    expect(svc.retirerMembre).toHaveBeenCalledWith(1, 10);
    expect(component.membresList.length).toBe(1);
    expect(component.modifications).toBeTrue();
  });

  it('should not retirerMembre when cancelled', () => {
    dialogOpenSpy.and.returnValue({ afterClosed: () => of(false) } as any);
    component.retirerMembre(members[0]);
    expect(svc.retirerMembre).not.toHaveBeenCalled();
  });

  it('should ouvrirAssignerChef and update chef', () => {
    const updatedEquipe = { ...mockEquipe, chef: { id: 99 } as User };
    dialogOpenSpy.and.returnValue({ afterClosed: () => of(updatedEquipe) } as any);

    component.ouvrirAssignerChef();

    expect(dialogOpenSpy).toHaveBeenCalled();
    expect(component.eq.chef).toEqual({ id: 99 } as User);
    expect(component.modifications).toBeTrue();
  });

  it('should not update chef when assigner dialog returns nothing', () => {
    dialogOpenSpy.and.returnValue({ afterClosed: () => of(undefined) } as any);
    component.ouvrirAssignerChef();
    expect(component.modifications).toBeFalse();
  });

  it('should revoquerChef with confirmation', () => {
    svc.retirerChef.and.returnValue(of(mockEquipe));
    dialogOpenSpy.and.returnValue({ afterClosed: () => of(true) } as any);

    component.revoquerChef();

    expect(dialogOpenSpy).toHaveBeenCalled();
    expect(svc.retirerChef).toHaveBeenCalledWith(1);
    expect(component.eq.chef).toBeNull();
    expect(component.modifications).toBeTrue();
  });

  it('should ouvrirAjoutMembres and reload', () => {
    dialogOpenSpy.and.returnValue({ afterClosed: () => of('updated') } as any);

    component.ouvrirAjoutMembres();

    expect(dialogOpenSpy).toHaveBeenCalled();
    expect(component.modifications).toBeTrue();
    expect(svc.getById).toHaveBeenCalledWith(1);
  });

  it('should show toast on retirerMembre error', () => {
    svc.retirerMembre.and.returnValue(throwError(() => new Error('fail')));
    dialogOpenSpy.and.returnValue({ afterClosed: () => of(true) } as any);

    component.retirerMembre(members[0]);

    expect(snack.open).toHaveBeenCalledWith('Erreur lors du retrait du membre', '✕', jasmine.any(Object));
  });

  it('should show toast on revoquerChef error', () => {
    svc.retirerChef.and.returnValue(throwError(() => new Error('fail')));
    dialogOpenSpy.and.returnValue({ afterClosed: () => of(true) } as any);

    component.revoquerChef();

    expect(snack.open).toHaveBeenCalledWith('Erreur lors de la révocation du chef', '✕', jasmine.any(Object));
  });

  it('should show toast on rechargerEquipe error after assigner chef', () => {
    svc.getById.and.returnValue(throwError(() => new Error('fail')));
    dialogOpenSpy.and.returnValue({ afterClosed: () => of(mockEquipe) } as any);

    component.ouvrirAssignerChef();

    expect(snack.open).toHaveBeenCalledWith('Erreur lors du rechargement', '✕', jasmine.any(Object));
  });

  it('should close with updated string when modifications made', () => {
    component.modifications = true;
    ref.close.calls.reset();
    fixture.detectChanges();

    const closeBtn = (fixture.nativeElement as HTMLElement).querySelector('.dlg-footer button');
    closeBtn?.dispatchEvent(new MouseEvent('click'));
    expect(ref.close).toHaveBeenCalledWith('updated');
  });

  it('should not revoke chef when cancelled', () => {
    dialogOpenSpy.and.returnValue({ afterClosed: () => of(false) } as any);
    component.revoquerChef();
    expect(svc.retirerChef).not.toHaveBeenCalled();
  });

  it('should not add members when ouvrirAjoutMembres dialog returns nothing', () => {
    dialogOpenSpy.and.returnValue({ afterClosed: () => of(undefined) } as any);
    const getByIdSpy = svc.getById;
    component.ouvrirAjoutMembres();
    expect(component.modifications).toBeFalse();
    expect(getByIdSpy).not.toHaveBeenCalled();
  });

  it('should compute initiales and couleurAvatar correctly', () => {
    const u: User = { id: 99, prenom: 'Jean', nom: 'Dupont', email: 'j@t.tn', identifiant: 'jd', role: 'ROLE_ENSEIGNANT', typeUtilisateur: 'ENSEIGNANT', departement: null, enabled: true, createdAt: '2025-01-01', isAffilieToEquipe: false, equipeId: null, equipeNom: null };
    expect(component.initiales(u)).toBe('JD');

    const noPrenom: User = { ...u, prenom: null as any };
    expect(component.initiales(noPrenom)).toBe('D');

    const empty: User = { ...u, prenom: null as any, nom: null as any };
    expect(component.initiales(empty)).toBe('');

    expect(component.couleurAvatar(u)).toBeTruthy();
  });
});
