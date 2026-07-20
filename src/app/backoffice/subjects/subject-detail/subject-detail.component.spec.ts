import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { SubjectDetailComponent } from './subject-detail.component';
import { ActivatedRoute, Router, provideRouter } from '@angular/router';
import { AdminService } from '../../../core/services/admin.service';
import { SujetProjet } from '../../../core/models/sujet-projet.model';
import { of, throwError } from 'rxjs';

describe('SubjectDetailComponent', () => {
  let component: SubjectDetailComponent;
  let fixture: ComponentFixture<SubjectDetailComponent>;
  let adminService: jasmine.SpyObj<AdminService>;
  let route: { snapshot: { paramMap: { get: (key: string) => string | null } } };

  const mockSujet: SujetProjet = {
    id: 1,
    titre: 'Test Subject',
    categorie: 'PFE',
    description: 'A test description',
    objectifs: 'Obj1\nObj2',
    prerequis: ['Angular'],
    domaines: ['AI'],
    technologies: ['TypeScript'],
    capaciteAccueil: 3,
    statut: 'CANDIDATURE_OUVERTE',
    scoreFinal: 75.5,
    eligibleIndustrialisation: true,
    catalogue: true,
    encadrantId: 10,
    encadrantNom: 'Jean Dupont',
    encadrantEmail: 'jean@test.com',
    equipeNom: 'Team A',
    dateCreation: '2026-01-15T10:00:00Z',
    dateSoumission: '2026-01-20T14:00:00Z',
    dateValidation: '2026-01-22T10:00:00Z',
    dateDebutRealisation: null,
    dateTerminaison: null,
    motifInvalidation: null,
  };

  function setup(routeId: string | null) {
    route = { snapshot: { paramMap: { get: (key: string) => key === 'id' ? routeId : null } } };
    adminService = jasmine.createSpyObj<AdminService>('AdminService', ['getSujetById', 'deleteSujet', 'updateSujet']);
    adminService.getSujetById.and.returnValue(of(mockSujet));
    adminService.deleteSujet.and.returnValue(of({ message: 'deleted', timestamp: '' }));

    TestBed.configureTestingModule({
      imports: [SubjectDetailComponent],
      providers: [
        provideRouter([]),
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: AdminService, useValue: adminService },
        { provide: ActivatedRoute, useValue: route },
      ],
    });

    fixture = TestBed.createComponent(SubjectDetailComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  }

  it('should load subject on init', () => {
    setup('1');
    expect(component).toBeTruthy();
    expect(component.sujet).toEqual(mockSujet);
    expect(component.isLoading).toBeFalse();
  });

  it('should set error for invalid id', () => {
    setup('abc');
    expect(component.loadError).toBe('Identifiant du sujet invalide.');
    expect(component.isLoading).toBeFalse();
  });

  it('should set error for null id', () => {
    setup(null);
    expect(component.loadError).toBe('Identifiant du sujet invalide.');
  });

  it('should set error for negative id', () => {
    setup('-1');
    expect(component.loadError).toBe('Identifiant du sujet invalide.');
  });

  it('should handle load error', () => {
    adminService.getSujetById.and.returnValue(throwError(() => new Error('fail')));
    route = { snapshot: { paramMap: { get: () => '1' } } };
    TestBed.configureTestingModule({
      imports: [SubjectDetailComponent],
      providers: [
        provideRouter([]),
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: AdminService, useValue: adminService },
        { provide: ActivatedRoute, useValue: route },
      ],
    });
    fixture = TestBed.createComponent(SubjectDetailComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
    expect(component.loadError).toBe('Impossible de charger ce sujet.');
    expect(component.isLoading).toBeFalse();
  });

  it('should return categorieLabel', () => {
    setup('1');
    expect(component.categorieLabel).toBe('PFE');
    component.sujet = { ...mockSujet, categorie: 'UNKNOWN' as any };
    expect(component.categorieLabel).toBe('UNKNOWN');
  });

  it('should return getCategorieClass', () => {
    setup('1');
    expect(component.getCategorieClass('PFE')).toBe('badge--pfe');
    expect(component.getCategorieClass('RDI')).toBe('badge--rdi');
    expect(component.getCategorieClass('STAGE_INGENIEUR')).toBe('badge--stage');
    expect(component.getCategorieClass('UNKNOWN' as any)).toBe('badge--pfe');
  });

  it('should return statutLabel', () => {
    setup('1');
    expect(component.statutLabel).toBe('Candidature ouverte');
  });

  it('should return scoreFinalLabel', () => {
    setup('1');
    expect(component.scoreFinalLabel).toContain('75.50');
    component.sujet = { ...mockSujet, scoreFinal: null };
    expect(component.scoreFinalLabel).toBe('Non calculé');
  });

  it('should return eligibilityLabel and class', () => {
    setup('1');
    expect(component.eligibilityLabel).toBe('Éligible');
    expect(component.eligibilityClass).toBe('eligibility-pill--eligible');

    component.sujet = { ...mockSujet, eligibleIndustrialisation: false, scoreFinal: 50 } as any;
    (component.sujet as any)['latestEvaluation'] = { eligibilityStatus: 'REVIEW_REQUIRED' };
    expect(component.eligibilityLabel).toBe('Revue requise');

    (component.sujet as any)['latestEvaluation'] = { eligibilityStatus: 'NON_ELIGIBLE' };
    expect(component.eligibilityLabel).toBe('Non éligible');
    expect(component.eligibilityClass).toBe('eligibility-pill--not-eligible');

    (component.sujet as any)['latestEvaluation'] = { eligibilityStatus: 'NON_ELIGIBLE_EN_L_ETAT' };
    expect(component.eligibilityLabel).toBe('Non éligible');

    (component.sujet as any)['latestEvaluation'] = { eligibilityStatus: 'NOT_EVALUABLE' };
    expect(component.eligibilityLabel).toBe('Non évaluable');

    (component.sujet as any)['latestEvaluation'] = { eligibilityStatus: 'UNKNOWN_STATUS' };
    expect(component.eligibilityLabel).toBe('Non calculé');
    expect(component.eligibilityClass).toBe('eligibility-pill--unknown');
  });

  it('should fallback eligibility when no explicit status', () => {
    setup('1');
    component.sujet = { ...mockSujet, eligibleIndustrialisation: false, scoreFinal: null } as any;
    delete (component.sujet as any)['latestEvaluation'];
    expect(component.eligibilityLabel).toBe('Non calculé');

    component.sujet = { ...mockSujet, eligibleIndustrialisation: true, scoreFinal: null } as any;
    delete (component.sujet as any)['latestEvaluation'];
    expect(component.eligibilityLabel).toBe('Éligible');

    component.sujet = { ...mockSujet, eligibleIndustrialisation: false, scoreFinal: 50 } as any;
    delete (component.sujet as any)['latestEvaluation'];
    expect(component.eligibilityLabel).toBe('Revue requise');

    component.sujet = { ...mockSujet, eligibleIndustrialisation: false, scoreFinal: null } as any;
    (component.sujet as any)['latestEvaluation'] = { bloqueParEliminatoire: true };
    expect(component.eligibilityLabel).toBe('Non éligible');

    component.sujet = { ...mockSujet, eligibleIndustrialisation: false, scoreFinal: null } as any;
    (component.sujet as any)['latestEvaluation'] = { hasEliminatoryWarnings: true };
    expect(component.eligibilityLabel).toBe('Non éligible');

    component.sujet = { ...mockSujet, eligibleIndustrialisation: false, scoreFinal: null } as any;
    (component.sujet as any)['latestEvaluation'] = { eliminatoryWarningsCount: 2 };
    expect(component.eligibilityLabel).toBe('Non éligible');
  });

  it('should return getStatutClass', () => {
    setup('1');
    expect(component.getStatutClass('CANDIDATURE_OUVERTE')).toBeTruthy();
  });

  it('should return getObjectifLines', () => {
    setup('1');
    expect(component.getObjectifLines().length).toBe(2);
    component.sujet = { ...mockSujet, objectifs: '  ' };
    expect(component.getObjectifLines()).toEqual(['  ']);
    component.sujet = { ...mockSujet, objectifs: undefined as any };
    expect(component.getObjectifLines()).toEqual([]);
  });

  it('should return getTechColor', () => {
    setup('1');
    expect(component.getTechColor(0)).toBe('tag--green');
    expect(component.getTechColor(1)).toBe('tag--purple');
    expect(component.getTechColor(4)).toBe('tag--green');
  });

  it('should return formatDate', () => {
    setup('1');
    expect(component.formatDate('2026-01-15T10:00:00Z')).toBe('2026-01-15');
    expect(component.formatDate(null)).toBe('—');
    expect(component.formatDate(undefined)).toBe('—');
  });

  it('should return formatScore', () => {
    setup('1');
    expect(component.formatScore(75)).toBe('75.00 / 100');
    expect(component.formatScore(null)).toBe('Non calculé');
    expect(component.formatScore(undefined)).toBe('Non calculé');
    expect(component.formatScore(NaN)).toBe('Non calculé');
  });

  it('should open and close edit modal', () => {
    setup('1');
    component.openEditModal();
    expect(component.editModalOpen).toBeTrue();
    component.closeEditModal();
    expect(component.editModalOpen).toBeFalse();
  });

  it('should handle onEditSaved', () => {
    setup('1');
    component.openEditModal();
    component.onEditSaved();
    expect(component.editModalOpen).toBeFalse();
    expect(adminService.getSujetById).toHaveBeenCalledTimes(2);
  });

  it('should handle onEditSaved when no sujet', () => {
    setup('1');
    component.sujet = null;
    component.onEditSaved();
    expect(component.editModalOpen).toBeFalse();
  });

  it('should open and cancel delete confirm', () => {
    setup('1');
    component.openDeleteConfirm();
    expect(component.deleteConfirmOpen).toBeTrue();
    component.cancelDelete();
    expect(component.deleteConfirmOpen).toBeFalse();
    expect(component.deleting).toBeFalse();
  });

  it('should confirm delete successfully', () => {
    setup('1');
    const router = TestBed.inject(Router);
    spyOn(router, 'navigate');
    component.openDeleteConfirm();
    component.confirmDelete();
    expect(component.deleting).toBeFalse();
    expect(router.navigate).toHaveBeenCalledWith(['/backoffice/subjects']);
  });

  it('should handle delete error', () => {
    adminService.deleteSujet.and.returnValue(throwError(() => new Error('fail')));
    route = { snapshot: { paramMap: { get: () => '1' } } };
    TestBed.configureTestingModule({
      imports: [SubjectDetailComponent],
      providers: [
        provideRouter([]),
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: AdminService, useValue: adminService },
        { provide: ActivatedRoute, useValue: route },
      ],
    });
    fixture = TestBed.createComponent(SubjectDetailComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();

    component.openDeleteConfirm();
    component.confirmDelete();
    expect(component.loadError).toBe('Échec de la suppression.');
    expect(component.deleting).toBeFalse();
  });

  it('should not delete when no sujet', () => {
    setup('1');
    component.sujet = null;
    component.confirmDelete();
    expect(adminService.deleteSujet).not.toHaveBeenCalled();
  });

  it('should return deleteConfirmMessage', () => {
    setup('1');
    expect(component.deleteConfirmMessage).toContain('Test Subject');
    component.sujet = null;
    expect(component.deleteConfirmMessage).toBe('');
  });

  it('should compute scoreFinal from mlScore fallback', () => {
    setup('1');
    component.sujet = { ...mockSujet, scoreFinal: null } as any;
    (component.sujet as any)['latestEvaluation'] = { mlScore: 88.5 };
    expect(component.scoreFinalLabel).toContain('88.50');
  });

  it('should compute scoreFinal from scoreFinalEvaluation fallback', () => {
    setup('1');
    component.sujet = { ...mockSujet, scoreFinal: null } as any;
    (component.sujet as any)['latestEvaluation'] = { scoreFinalEvaluation: '72.3' };
    expect(component.scoreFinalLabel).toContain('72.30');
  });

  it('should compute scoreFinal from evaluation nested object', () => {
    setup('1');
    component.sujet = { ...mockSujet, scoreFinal: null } as any;
    (component.sujet as any)['evaluation'] = { scoreFinal: 60 };
    expect(component.scoreFinalLabel).toContain('60.00');
  });

  it('should compute scoreFinal from lastEvaluation nested object', () => {
    setup('1');
    component.sujet = { ...mockSujet, scoreFinal: null } as any;
    (component.sujet as any)['lastEvaluation'] = { scoreFinal: 55 };
    expect(component.scoreFinalLabel).toContain('55.00');
  });
});
