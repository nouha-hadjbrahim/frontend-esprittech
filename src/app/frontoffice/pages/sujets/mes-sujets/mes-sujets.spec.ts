import { WritableSignal, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { of, throwError } from 'rxjs';
import { provideRouter } from '@angular/router';
import { MesSujets } from './mes-sujets';
import { SujetProjetService } from '../../../../core/services/sujet-projet.service';
import { AuthService } from '../../../../core/services/auth.service';
import { User } from '../../../../core/models/user.model';

const mockSujetBase: any = {
  id: 1, titre: 'Sujet IA', categorie: 'STAGE_INGENIEUR',
  statut: 'VALIDE', encadrantId: 10, encadrantNom: 'Dr. Martin',
  domaines: ['IA'], technologies: ['Python'],
  dateCreation: '2026-06-01T00:00:00Z', dateSoumission: null,
  capaciteAccueil: 2,
};

const mockSujet2: any = {
  ...mockSujetBase, id: 2, titre: 'Sujet Web', domaines: ['Web'],
  technologies: ['Angular'], dateCreation: '2026-06-02T00:00:00Z',
};

function makeUser(id: number): User {
  return {
    id, nom: 'Martin', prenom: 'Dr', email: 'dr@esprit.tn',
    identifiant: 'DM1', role: 'ROLE_ENSEIGNANT',
    typeUtilisateur: 'ENSEIGNANT', departement: null,
    enabled: true, createdAt: null,
  };
}

describe('MesSujets', () => {
  let component: MesSujets;
  let sujetService: jasmine.SpyObj<SujetProjetService>;
  let currentUser: WritableSignal<User | null>;

  beforeEach(() => {
    sujetService = jasmine.createSpyObj('SujetProjetService', [
      'getMesSujets', 'supprimerSujet',
    ]);
    sujetService.getMesSujets.and.returnValue(of([mockSujetBase, mockSujet2]));
    currentUser = signal<User | null>(makeUser(10));

    TestBed.configureTestingModule({
      imports: [MesSujets],
      providers: [
        provideRouter([]),
        { provide: SujetProjetService, useValue: sujetService },
        { provide: AuthService, useValue: { currentUser, getRole: () => 'ROLE_ENSEIGNANT' } },
      ],
    });
    component = TestBed.createComponent(MesSujets).componentInstance;
  });

  it('should create', () => expect(component).toBeTruthy());

  // ── loadSujets ────────────────────────────────────────────────────

  it('should load sujets on init and apply filters', () => {
    component.ngOnInit();
    expect(sujetService.getMesSujets).toHaveBeenCalled();
    expect(component.sujets.length).toBe(2);
    expect(component.filteredSujets.length).toBe(2);
    expect(component.isLoading).toBeFalse();
  });

  it('should handle error when loading sujets fails', () => {
    sujetService.getMesSujets.and.returnValue(throwError(() => new Error('Network')));
    component.loadSujets();
    expect(component.sujets.length).toBe(0);
    expect(component.filteredSujets.length).toBe(0);
    expect(component.isLoading).toBeFalse();
  });

  it('should reload with categorie param when onCategorieChange is called', () => {
    component.onCategorieChange('STAGE_INGENIEUR');
    expect(component.selectedCategorie).toBe('STAGE_INGENIEUR');
    expect(sujetService.getMesSujets).toHaveBeenCalledWith('STAGE_INGENIEUR' as any, undefined);
  });

  it('should reload with statut param when onStatutChange is called', () => {
    component.onStatutChange('VALIDE');
    expect(component.selectedStatut).toBe('VALIDE');
    expect(sujetService.getMesSujets).toHaveBeenCalledWith(undefined, 'VALIDE' as any);
  });

  // ── Modal ─────────────────────────────────────────────────────────

  it('openModal should clear editSujet and open modal', () => {
    component.editSujet = mockSujetBase;
    component.openModal();
    expect(component.editSujet).toBeUndefined();
    expect(component.isModalOpen).toBeTrue();
  });

  it('openEditModal should set editSujet and open modal', () => {
    component.openEditModal(mockSujetBase);
    expect(component.editSujet).toEqual(mockSujetBase);
    expect(component.isModalOpen).toBeTrue();
  });

  it('closeModal should close modal and clear editSujet', () => {
    component.isModalOpen = true;
    component.editSujet = mockSujetBase;
    component.closeModal();
    expect(component.isModalOpen).toBeFalse();
    expect(component.editSujet).toBeUndefined();
  });

  it('onSujetSaved should close modal and reload', () => {
    component.isModalOpen = true;
    sujetService.getMesSujets.and.returnValue(of([]));
    component.onSujetSaved();
    expect(component.isModalOpen).toBeFalse();
    expect(sujetService.getMesSujets).toHaveBeenCalled();
  });

  // ── Search & sort ─────────────────────────────────────────────────

  it('should filter sujets by search query on title', () => {
    component.ngOnInit();
    component.searchQuery = 'web';
    component.onSearchChange();
    expect(component.filteredSujets.length).toBe(1);
    expect(component.filteredSujets[0].id).toBe(2);
  });

  it('should filter sujets by domain', () => {
    component.ngOnInit();
    component.searchQuery = 'ia';
    component.onSearchChange();
    expect(component.filteredSujets.length).toBe(1);
    expect(component.filteredSujets[0].id).toBe(1);
  });

  it('should sort oldest first when sortOrder is ancien', () => {
    component.ngOnInit();
    component.onSortChange('ancien');
    expect(component.filteredSujets[0].id).toBe(1);
  });

  it('should sort most recent first by default', () => {
    component.ngOnInit();
    expect(component.filteredSujets[0].id).toBe(2);
  });

  // ── Delete ────────────────────────────────────────────────────────

  it('deleteSujet should set sujetToDelete and open confirm dialog', () => {
    component.deleteSujet(mockSujetBase);
    expect(component.sujetToDelete).toEqual(mockSujetBase);
    expect(component.deleteConfirmOpen).toBeTrue();
  });

  it('cancelDelete should close confirm dialog and clear sujetToDelete', () => {
    component.sujetToDelete = mockSujetBase;
    component.deleteConfirmOpen = true;
    component.cancelDelete();
    expect(component.deleteConfirmOpen).toBeFalse();
    expect(component.sujetToDelete).toBeUndefined();
  });

  it('confirmDelete should do nothing when sujetToDelete is undefined', () => {
    component.sujetToDelete = undefined;
    component.confirmDelete();
    expect(sujetService.supprimerSujet).not.toHaveBeenCalled();
  });

  it('confirmDelete should call supprimerSujet and reload on success', () => {
    sujetService.supprimerSujet.and.returnValue(of(undefined));
    sujetService.getMesSujets.and.returnValue(of([]));
    component.sujetToDelete = mockSujetBase;
    component.confirmDelete();
    expect(sujetService.supprimerSujet).toHaveBeenCalledWith(1);
    expect(component.deleteConfirmOpen).toBeFalse();
    expect(component.sujetToDelete).toBeUndefined();
  });

  it('confirmDelete should show alert on delete failure', () => {
    sujetService.supprimerSujet.and.returnValue(throwError(() => new Error('fail')));
    component.sujetToDelete = mockSujetBase;
    component.confirmDelete();
    expect(component.deleteAlertOpen).toBeTrue();
    expect(component.deleteAlertMessage).toContain('Impossible');
  });

  it('closeDeleteAlert should hide the alert', () => {
    component.deleteAlertOpen = true;
    component.deleteAlertMessage = 'error';
    component.closeDeleteAlert();
    expect(component.deleteAlertOpen).toBeFalse();
    expect(component.deleteAlertMessage).toBe('');
  });

  it('deleteConfirmMessage should return empty string when no sujet to delete', () => {
    component.sujetToDelete = undefined;
    expect(component.deleteConfirmMessage).toBe('');
  });

  it('deleteConfirmMessage should include sujet titre', () => {
    component.sujetToDelete = mockSujetBase;
    expect(component.deleteConfirmMessage).toContain('Sujet IA');
  });

  // ── isOwner ───────────────────────────────────────────────────────

  it('isOwner should return true when current user is the encadrant', () => {
    expect(component.isOwner(mockSujetBase)).toBeTrue();
  });

  it('isOwner should return false when current user is not the encadrant', () => {
    currentUser.set(makeUser(99));
    expect(component.isOwner(mockSujetBase)).toBeFalse();
  });

  it('isOwner should return false when no user is logged in', () => {
    currentUser.set(null);
    expect(component.isOwner(mockSujetBase)).toBeFalse();
  });

  // ── Candidatures modal ────────────────────────────────────────────

  it('openCandidaturesModal should set sujetCandidatures and open modal', () => {
    component.openCandidaturesModal(mockSujetBase);
    expect(component.sujetCandidatures).toEqual(mockSujetBase);
    expect(component.candidaturesModalOpen).toBeTrue();
  });

  it('closeCandidaturesModal should close modal and clear sujetCandidatures', () => {
    component.candidaturesModalOpen = true;
    component.sujetCandidatures = mockSujetBase;
    component.closeCandidaturesModal();
    expect(component.candidaturesModalOpen).toBeFalse();
    expect(component.sujetCandidatures).toBeUndefined();
  });

  it('onCandidaturesChanged should reload sujets', () => {
    sujetService.getMesSujets.and.returnValue(of([]));
    component.onCandidaturesChanged();
    expect(sujetService.getMesSujets).toHaveBeenCalled();
  });

  it('loadSujets should update sujetCandidatures reference when modal is open', () => {
    const updatedSujet = { ...mockSujetBase, titre: 'Updated' };
    sujetService.getMesSujets.and.returnValue(of([updatedSujet, mockSujet2]));
    component.candidaturesModalOpen = true;
    component.sujetCandidatures = mockSujetBase;
    component.loadSujets();
    expect(component.sujetCandidatures?.titre).toBe('Updated');
  });
});