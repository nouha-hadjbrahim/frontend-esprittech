import { ComponentFixture, TestBed } from '@angular/core/testing';
import { of, throwError } from 'rxjs';
import { MatSnackBar } from '@angular/material/snack-bar';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { DemandesAffiliationComponent } from './demandes-affiliation.component';
import { AffiliationService } from '../../../core/services/affiliation.service';
import { AffiliationEnseignantResponse } from '../../../core/models/affiliation-request.model';

const mockEnseignant = (id: number, prenom: string, nom: string, email: string) => ({
  id, prenom, nom, email,
  identifiant: email.split('@')[0],
  role: 'ROLE_ENSEIGNANT' as const,
  typeUtilisateur: 'ENSEIGNANT' as const,
  departement: 'Info',
  enabled: true,
  createdAt: '2025-01-01',
  isAffilieToEquipe: false,
  equipeId: null,
  equipeNom: null,
});

const mockDemandes: AffiliationEnseignantResponse[] = [
  {
    id: 1, equipeId: 10, equipeNom: 'AI Lab',
    enseignant: mockEnseignant(100, 'Jean', 'Dupont', 'jean@test.tn'),
    statut: 'EN_ATTENTE', dateDemande: '2025-06-01T10:00:00Z',
    dateDecision: null, motifDecision: null,
  },
  {
    id: 2, equipeId: 11, equipeNom: 'Data Science',
    enseignant: mockEnseignant(101, 'Marie', 'Curie', 'marie@test.tn'),
    statut: 'ACCEPTEE', dateDemande: '2025-05-15T08:00:00Z',
    dateDecision: '2025-05-16T08:00:00Z', motifDecision: null,
  },
  {
    id: 3, equipeId: 10, equipeNom: 'AI Lab',
    enseignant: mockEnseignant(102, 'Paul', 'Martin', 'paul@test.tn'),
    statut: 'REFUSEE', dateDemande: '2025-04-20T12:00:00Z',
    dateDecision: '2025-04-21T12:00:00Z', motifDecision: 'Pas assez d\'expérience',
  },
];

describe('DemandesAffiliationComponent', () => {
  let component: DemandesAffiliationComponent;
  let fixture: ComponentFixture<DemandesAffiliationComponent>;
  let svc: jasmine.SpyObj<AffiliationService>;
  let snack: jasmine.SpyObj<MatSnackBar>;

  beforeEach(() => {
    svc = jasmine.createSpyObj<AffiliationService>('AffiliationService', ['getAll', 'traiter']);
    snack = jasmine.createSpyObj<MatSnackBar>('MatSnackBar', ['open']);

    TestBed.configureTestingModule({
      imports: [DemandesAffiliationComponent, NoopAnimationsModule],
      providers: [
        { provide: AffiliationService, useValue: svc },
        { provide: MatSnackBar, useValue: snack },
      ],
    });
    fixture = TestBed.createComponent(DemandesAffiliationComponent);
    component = fixture.componentInstance;
  });

  describe('creation', () => {
    it('should create', () => {
      svc.getAll.and.returnValue(of(mockDemandes));
      fixture.detectChanges();
      expect(component).toBeTruthy();
    });

    it('should load demandes on init', () => {
      svc.getAll.and.returnValue(of(mockDemandes));
      fixture.detectChanges();
      expect(svc.getAll).toHaveBeenCalled();
      expect(component.demandes().length).toBe(3);
      expect(component.filtered.length).toBe(1);
      expect(component.filtered[0].statut).toBe('EN_ATTENTE');
      expect(component.chargement).toBeFalse();
    });

    it('should handle load error on init', () => {
      svc.getAll.and.returnValue(throwError(() => new Error('fail')));
      fixture.detectChanges();
      expect(component.chargement).toBeFalse();
      expect(snack.open).toHaveBeenCalledWith(
        'Erreur lors du chargement des demandes', '✕',
        jasmine.objectContaining({ duration: 3500 }),
      );
    });
  });

  describe('appliquerFiltre', () => {
    beforeEach(() => {
      svc.getAll.and.returnValue(of(mockDemandes));
      fixture.detectChanges();
    });

    it('should return only pending demandes when query is empty', () => {
      component.query = '';
      component.selectedEquipeId = '';
      component.appliquerFiltre();
      expect(component.filtered.length).toBe(1);
      expect(component.filtered.every((d) => d.statut === 'EN_ATTENTE')).toBeTrue();
    });

    it('should filter by enseignant name among pending', () => {
      component.query = 'Jean';
      component.appliquerFiltre();
      expect(component.filtered.length).toBe(1);
      expect(component.filtered[0].id).toBe(1);
    });

    it('should hide accepted demandes even if email matches', () => {
      component.query = 'marie@test.tn';
      component.appliquerFiltre();
      expect(component.filtered.length).toBe(0);
    });

    it('should filter by equipe nom among pending', () => {
      component.query = 'ai lab';
      component.appliquerFiltre();
      expect(component.filtered.length).toBe(1);
      expect(component.filtered[0].equipeNom).toBe('AI Lab');
    });

    it('should filter by selected equipe', () => {
      component.selectedEquipeId = '10';
      component.appliquerFiltre();
      expect(component.filtered.length).toBe(1);
      expect(component.filtered[0].equipeId).toBe(10);
    });

    it('should return empty when selected equipe has no pending demandes', () => {
      component.selectedEquipeId = '11';
      component.appliquerFiltre();
      expect(component.filtered.length).toBe(0);
    });

    it('should return empty for non-matching query', () => {
      component.query = 'zzzzz';
      component.appliquerFiltre();
      expect(component.filtered.length).toBe(0);
    });
  });

  describe('accepter', () => {
    const d = mockDemandes[0];

    beforeEach(() => {
      svc.getAll.and.returnValue(of(mockDemandes));
      fixture.detectChanges();
      svc.getAll.calls.reset();
    });

    it('should accept and reload', () => {
      svc.traiter.and.returnValue(of(mockDemandes[2] as any));
      svc.getAll.and.returnValue(of([]));

      component.accepter(d);

      expect(svc.traiter).toHaveBeenCalledWith(d.id, d.equipeId, 'ACCEPTEE');
      expect(snack.open).toHaveBeenCalledWith(
        'Demande de Jean Dupont acceptée', '✕',
        jasmine.objectContaining({ panelClass: ['snack-success'] }),
      );
      expect(svc.getAll).toHaveBeenCalled();
    });

    it('should show error toast on accept failure', () => {
      svc.traiter.and.returnValue(throwError(() => new Error('fail')));

      component.accepter(d);

      expect(snack.open).toHaveBeenCalledWith(
        "Erreur lors de l'acceptation", '✕',
        jasmine.objectContaining({ panelClass: ['snack-error'] }),
      );
    });
  });

  describe('refus dialog', () => {
    const d = mockDemandes[0];

    beforeEach(() => {
      svc.getAll.and.returnValue(of(mockDemandes));
      fixture.detectChanges();
      svc.getAll.calls.reset();
    });

    it('ouvrirRefus should open dialog with pending data', () => {
      component.ouvrirRefus(d);
      expect(component.motifDialogOpen).toBeTrue();
      expect(component.pendingRefuse).toBe(d);
      expect(component.motifEnseignant).toBe('Jean Dupont');
      expect(component.motifEquipe).toBe('AI Lab');
      expect(component.motifText).toBe('');
    });

    it('confirmerRefus should do nothing when pendingRefuse is null', () => {
      component.pendingRefuse = null;
      component.confirmerRefus();
      expect(svc.traiter).not.toHaveBeenCalled();
    });

    it('confirmerRefus should refuse with motif and reload', () => {
      svc.traiter.and.returnValue(of(mockDemandes[2] as any));
      svc.getAll.and.returnValue(of([]));

      component.ouvrirRefus(d);
      component.motifText = 'Trop de candidats';
      component.confirmerRefus();

      expect(svc.traiter).toHaveBeenCalledWith(d.id, d.equipeId, 'REFUSEE', 'Trop de candidats');
      expect(snack.open).toHaveBeenCalledWith(
        'Demande de Jean Dupont refusée', '✕',
        jasmine.objectContaining({ panelClass: ['snack-success'] }),
      );
      expect(component.motifDialogOpen).toBeFalse();
      expect(component.pendingRefuse).toBeNull();
      expect(svc.getAll).toHaveBeenCalled();
    });

    it('confirmerRefus should refuse without motif', () => {
      svc.traiter.and.returnValue(of(mockDemandes[2] as any));
      svc.getAll.and.returnValue(of([]));

      component.ouvrirRefus(d);
      component.confirmerRefus();

      expect(svc.traiter).toHaveBeenCalledWith(d.id, d.equipeId, 'REFUSEE', undefined);
    });

    it('confirmerRefus should show error toast on failure', () => {
      svc.traiter.and.returnValue(throwError(() => new Error('fail')));

      component.ouvrirRefus(d);
      component.confirmerRefus();

      expect(snack.open).toHaveBeenCalledWith(
        'Erreur lors du refus', '✕',
        jasmine.objectContaining({ panelClass: ['snack-error'] }),
      );
    });

    it('annulerRefus should close dialog', () => {
      component.ouvrirRefus(d);
      component.annulerRefus();
      expect(component.motifDialogOpen).toBeFalse();
      expect(component.pendingRefuse).toBeNull();
    });
  });

  describe('formatDate', () => {
    it('should format a valid date string', () => {
      const result = component.formatDate('2025-06-01T10:00:00Z');
      expect(result).toMatch(/\d{2}\/\d{2}\/\d{4}/);
    });

    it('should return empty string for falsy date', () => {
      expect(component.formatDate('')).toBe('');
    });
  });
});
