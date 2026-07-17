import { TestBed, fakeAsync, tick } from '@angular/core/testing';
import { of, throwError } from 'rxjs';
import { MatDialog, MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { Equipe } from '../../core/models/equipe.model';
import { User } from '../../core/models/user.model';
import { EquipeService } from '../../core/services/equipe.service';
import { EquipesRechercheComponent } from './equipes-recherche.component';

function makeEquipe(over: Partial<Equipe> = {}): Equipe {
  return {
    id: 1, nom: 'AI Lab', description: 'Research team', domaineId: 1, domaine: 'Informatique',
    chef: null, nbMembres: 0, createdAt: '2025-01-15', statut: 'Actif',
    ...over,
  };
}

describe('EquipesRechercheComponent', () => {
  let component: EquipesRechercheComponent;
  let equipeService: jasmine.SpyObj<EquipeService>;
  let dialog: jasmine.SpyObj<MatDialog>;
  let snackBar: jasmine.SpyObj<MatSnackBar>;

  beforeEach(() => {
    equipeService = jasmine.createSpyObj<EquipeService>('EquipeService', [
      'getAll', 'creer', 'modifier', 'supprimer', 'assignerChef',
    ]);
    equipeService.getAll.and.returnValue(of([makeEquipe()]));

    dialog = jasmine.createSpyObj<MatDialog>('MatDialog', ['open']);
    snackBar = jasmine.createSpyObj<MatSnackBar>('MatSnackBar', ['open']);

    TestBed.configureTestingModule({
      imports: [EquipesRechercheComponent, HttpClientTestingModule, NoopAnimationsModule],
      providers: [
        { provide: EquipeService, useValue: equipeService },
        { provide: MatDialog, useValue: dialog },
        { provide: MatSnackBar, useValue: snackBar },
      ],
    });
    component = TestBed.createComponent(EquipesRechercheComponent).componentInstance;
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should load equipes on init', () => {
    component.ngOnInit();
    expect(equipeService.getAll).toHaveBeenCalled();
    expect(component.equipes().length).toBe(1);
    expect(component.equipes()[0].nom).toBe('AI Lab');
  });

  it('should handle load error', () => {
    equipeService.getAll.and.returnValue(throwError(() => new Error('fail')));
    component.ngOnInit();
    expect(component.equipes().length).toBe(0);
    expect(snackBar.open).toHaveBeenCalled();
  });

  it('should filter equipes by nom', () => {
    component.equipes.set([
      makeEquipe({ id: 1, nom: 'AI Lab' }),
      makeEquipe({ id: 2, nom: 'Data Science' }),
    ]);
    component.query = 'AI';
    component.appliquerFiltre();
    expect(component.filtered.length).toBe(1);
    expect(component.filtered[0].nom).toBe('AI Lab');
  });

  it('should filter equipes by chef name', () => {
    const chef = { id: 10, prenom: 'Jean', nom: 'Dupont', email: 'j@e.tn' } as User;
    component.equipes.set([
      makeEquipe({ id: 1, chef }),
      makeEquipe({ id: 2, nom: 'Other' }),
    ]);
    component.query = 'dupont';
    component.appliquerFiltre();
    expect(component.filtered.length).toBe(1);
  });

  it('should clear filter when query is empty', () => {
    component.equipes.set([makeEquipe(), makeEquipe({ id: 2, nom: 'Other' })]);
    component.query = '';
    component.appliquerFiltre();
    expect(component.filtered.length).toBe(2);
  });

  it('should toggle view between grille and liste', () => {
    expect(component.vue).toBe('liste');
    component.vue = 'grille';
    expect(component.vue).toBe('grille');
  });

  it('should compute stats correctly', () => {
    component.equipes.set([
      makeEquipe({ statut: 'Actif', chef: { id: 1 } as User, nbMembres: 3 }),
      makeEquipe({ statut: 'Inactif', nbMembres: 0 }),
    ]);
    const stats = component.stats();
    expect(stats[0].value).toBe(1);
    expect(stats[1].value).toBe(3);
    expect(stats[2].value).toBe(1);
  });

  it('should open create dialog and create equipe', () => {
    const payload = { nom: 'New', description: null, domaineId: 1, chefId: null, memberIds: null };
    const created = makeEquipe({ id: 2, nom: 'New' });

    const afterClosed = of(payload);
    dialog.open.and.returnValue({ afterClosed: () => afterClosed } as any);
    equipeService.creer.and.returnValue(of(created));

    component.ouvrirCreation();
    expect(equipeService.creer).toHaveBeenCalledWith(payload);
    expect(component.equipes().length).toBe(1);
    expect(component.equipes()[0].nom).toBe('New');
  });

  it('should not create equipe when dialog is cancelled', () => {
    dialog.open.and.returnValue({ afterClosed: () => of(undefined) } as any);
    component.ouvrirCreation();
    expect(equipeService.creer).not.toHaveBeenCalled();
  });

  it('should open modify dialog and update equipe', () => {
    component.ngOnInit();
    const eq = component.equipes()[0];
    const updated = { ...eq, nom: 'Updated' };
    const afterClosed = of(updated);

    dialog.open.and.returnValue({ afterClosed: () => afterClosed } as any);
    equipeService.modifier.and.returnValue(of(updated));

    component.ouvrirModification(eq);
    expect(equipeService.modifier).toHaveBeenCalledWith(eq.id, updated);
    expect(component.equipes()[0].nom).toBe('Updated');
  });

  it('should delete equipe after confirmation', () => {
    component.ngOnInit();
    const afterClosed = of(true);
    dialog.open.and.returnValue({ afterClosed: () => afterClosed } as any);
    equipeService.supprimer.and.returnValue(of(void 0));

    component.supprimer(component.equipes()[0]);
    expect(equipeService.supprimer).toHaveBeenCalledWith(1);
    expect(component.equipes().length).toBe(0);
  });

  it('should not delete equipe when cancelled', () => {
    const afterClosed = of(false);
    dialog.open.and.returnValue({ afterClosed: () => afterClosed } as any);
    component.supprimer(makeEquipe());
    expect(equipeService.supprimer).not.toHaveBeenCalled();
  });

  it('should open details dialog and reload on edit action', () => {
    component.ngOnInit();
    const afterClosed = of('edit');
    dialog.open.and.returnValue({ afterClosed: () => afterClosed } as any);
    const openSpy = spyOn(component, 'ouvrirModification');

    component.ouvrirDetails(component.equipes()[0]);
    expect(openSpy).toHaveBeenCalledWith(component.equipes()[0]);
  });

  it('should open details dialog and reload on updated action', fakeAsync(() => {
    component.ngOnInit();
    component.equipes.set([makeEquipe()]);
    const afterClosed = of('updated');
    dialog.open.and.returnValue({ afterClosed: () => afterClosed } as any);
    equipeService.getAll.and.returnValue(of([makeEquipe({ id: 1, nom: 'Reloaded' })]));

    component.ouvrirDetails(component.equipes()[0]);
    tick();
    expect(equipeService.getAll).toHaveBeenCalled();
    expect(component.equipes()[0].nom).toBe('Reloaded');
  }));

  it('should open assign chef dialog and update equipe on confirm', () => {
    component.ngOnInit();
    const equipe = component.equipes()[0];
    const updated = { ...equipe, chef: { id: 5, prenom: 'Jean', nom: 'Martin' } as User };
    const afterClosed = of(updated);

    dialog.open.and.returnValue({ afterClosed: () => afterClosed } as any);
    equipeService.assignerChef.and.returnValue(of(updated));

    component.ouvrirAssignerChef(equipe);
    expect(dialog.open).toHaveBeenCalled();
    expect(component.equipes()[0].chef).toBeTruthy();
    expect(snackBar.open).toHaveBeenCalled();
  });

  it('should not update equipe when assign chef dialog is cancelled', () => {
    component.ngOnInit();
    const equipe = component.equipes()[0];
    const afterClosed = of(undefined);

    dialog.open.and.returnValue({ afterClosed: () => afterClosed } as any);

    component.ouvrirAssignerChef(equipe);
    expect(dialog.open).toHaveBeenCalled();
    expect(component.equipes()[0]).toEqual(equipe);
  });

  it('should show error toast when create fails', () => {
    const payload = { nom: 'New', description: null, domaineId: 1, chefId: null, memberIds: null };
    const afterClosed = of(payload);
    dialog.open.and.returnValue({ afterClosed: () => afterClosed } as any);
    equipeService.creer.and.returnValue(throwError(() => new Error('fail')));

    component.ouvrirCreation();
    expect(snackBar.open).toHaveBeenCalled();
  });

  it('should show success toast with chef message when create has chefId', () => {
    const payload = { nom: 'New', description: null, domaineId: 1, chefId: 5, memberIds: null };
    const afterClosed = of(payload);
    dialog.open.and.returnValue({ afterClosed: () => afterClosed } as any);
    equipeService.creer.and.returnValue(of(makeEquipe({ id: 2, nom: 'New' })));

    component.ouvrirCreation();
    expect(snackBar.open).toHaveBeenCalledWith(jasmine.stringMatching(/avec chef/), jasmine.anything(), jasmine.anything());
  });

  it('should show error toast when update fails', () => {
    component.ngOnInit();
    const eq = component.equipes()[0];
    const updated = { ...eq, nom: 'Updated' };
    const afterClosed = of(updated);
    dialog.open.and.returnValue({ afterClosed: () => afterClosed } as any);
    equipeService.modifier.and.returnValue(throwError(() => new Error('fail')));

    component.ouvrirModification(eq);
    expect(snackBar.open).toHaveBeenCalled();
  });

  it('should show error toast with detail when delete fails', () => {
    component.ngOnInit();
    const afterClosed = of(true);
    dialog.open.and.returnValue({ afterClosed: () => afterClosed } as any);
    equipeService.supprimer.and.returnValue(throwError(() => ({ error: { detail: 'Cannot delete' } })));

    component.supprimer(component.equipes()[0]);
    expect(snackBar.open).toHaveBeenCalledWith('Cannot delete', jasmine.anything(), jasmine.anything());
  });

  it('should fallback to generic message when delete error has no detail', () => {
    component.ngOnInit();
    const afterClosed = of(true);
    dialog.open.and.returnValue({ afterClosed: () => afterClosed } as any);
    equipeService.supprimer.and.returnValue(throwError(() => new Error('fail')));

    component.supprimer(component.equipes()[0]);
    expect(snackBar.open).toHaveBeenCalledWith('Erreur lors de la suppression', jasmine.anything(), jasmine.anything());
  });

  it('should not update equipe when modify dialog is cancelled', () => {
    component.ngOnInit();
    const eq = component.equipes()[0];
    dialog.open.and.returnValue({ afterClosed: () => of(undefined) } as any);

    component.ouvrirModification(eq);
    expect(equipeService.modifier).not.toHaveBeenCalled();
  });

  it('should preserve non-matching equipes when assigner chef updates one', () => {
    component.equipes.set([
      makeEquipe({ id: 1, nom: 'Keep' }),
      makeEquipe({ id: 2, nom: 'Update' }),
    ]);
    const updated = makeEquipe({ id: 2, nom: 'Updated' });
    const afterClosed = of(updated);
    dialog.open.and.returnValue({ afterClosed: () => afterClosed } as any);

    component.ouvrirAssignerChef(component.equipes()[1]);
    expect(component.equipes().length).toBe(2);
    expect(component.equipes()[0].nom).toBe('Keep');
    expect(component.equipes()[1].nom).toBe('Updated');
  });

  it('should preserve non-matching equipes when modifier updates one', () => {
    component.equipes.set([
      makeEquipe({ id: 1, nom: 'Keep' }),
      makeEquipe({ id: 2, nom: 'Update' }),
    ]);
    const eq2 = component.equipes()[1];
    const updated = { ...eq2, nom: 'Updated' };
    dialog.open.and.returnValue({ afterClosed: () => of(updated) } as any);
    equipeService.modifier.and.returnValue(of(updated));

    component.ouvrirModification(eq2);
    expect(component.equipes().length).toBe(2);
    expect(component.equipes()[0].nom).toBe('Keep');
    expect(component.equipes()[1].nom).toBe('Updated');
  });
});
