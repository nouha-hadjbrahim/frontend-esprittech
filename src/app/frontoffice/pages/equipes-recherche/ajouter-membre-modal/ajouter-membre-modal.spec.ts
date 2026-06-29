import { ComponentFixture, TestBed, fakeAsync, tick } from '@angular/core/testing';
import { of, throwError } from 'rxjs';
import { AjouterMembreModal } from './ajouter-membre-modal';
import { EquipeService } from '../../../../core/services/equipe.service';
import { Equipe } from '../../../../core/models/equipe.model';
import { User } from '../../../../core/models/user.model';
import { Page } from '../../../../core/models/page.model';

const mockEquipe: Equipe = {
  id: 1, nom: 'AI Lab', description: null, domaineId: 1, domaine: 'Info',
  chef: null, nbMembres: 2, createdAt: '2025-01-01', statut: 'Actif',
};

const mockUsers: User[] = [
  { id: 10, prenom: 'Jean', nom: 'Dupont', email: 'jean@test.tn', identifiant: 'jd', role: 'ROLE_ENSEIGNANT', typeUtilisateur: 'ENSEIGNANT', departement: 'Info', enabled: true, createdAt: '2025-01-01' },
  { id: 11, prenom: 'Marie', nom: 'Curie', email: 'marie@test.tn', identifiant: 'mc', role: 'ROLE_ENSEIGNANT', typeUtilisateur: 'ENSEIGNANT', departement: null, enabled: true, createdAt: '2025-01-01' },
];

const mockPage: Page<User> = { content: mockUsers, page: 0, size: 10, totalElements: 2, totalPages: 1, first: true, last: true };
const mockEmptyPage: Page<User> = { content: [], page: 0, size: 10, totalElements: 0, totalPages: 0, first: true, last: true };

describe('AjouterMembreModal', () => {
  let component: AjouterMembreModal;
  let fixture: ComponentFixture<AjouterMembreModal>;
  let svc: jasmine.SpyObj<EquipeService>;

  beforeEach(() => {
    svc = jasmine.createSpyObj<EquipeService>('EquipeService', ['chercherUtilisateursEligibles', 'ajouterMembres']);
    svc.chercherUtilisateursEligibles.and.returnValue(of(mockPage));

    TestBed.configureTestingModule({
      imports: [AjouterMembreModal],
      providers: [
        { provide: EquipeService, useValue: svc },
      ],
    });
    fixture = TestBed.createComponent(AjouterMembreModal);
    component = fixture.componentInstance;
    component.equipe = mockEquipe;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  describe('ngOnChanges', () => {
    it('should reset state when isOpen becomes true', () => {
      component.searchQuery = 'old';
      component.users = mockUsers;
      component.selectedIds.add(10);
      component.errorMessage = 'some error';
      const spy = spyOn(component['search$'], 'next');

      component.isOpen = true;
      component.ngOnChanges();

      expect(component.searchQuery).toBe('');
      expect(component.users).toEqual([]);
      expect(component.selectedIds.size).toBe(0);
      expect(component.errorMessage).toBe('');
      expect(spy).toHaveBeenCalledWith('');
    });

    it('should not reset state when isOpen is false', () => {
      component.searchQuery = 'old';
      component.ngOnChanges();
      expect(component.searchQuery).toBe('old');
    });
  });

  describe('constructor subscription', () => {
    it('should set users on search success', fakeAsync(() => {
      component.searchQuery = 'Jean';
      component.onSearchChange('Jean');
      tick(300);
      expect(component.loading).toBeFalse();
      expect(component.users).toEqual(mockUsers);
    }));

    it('should handle search error', fakeAsync(() => {
      svc.chercherUtilisateursEligibles.and.returnValue(throwError(() => new Error('fail')));
      component.onSearchChange('test');
      tick(300);
      expect(component.loading).toBeFalse();
      expect(component.users).toEqual([]);
      expect(component.errorMessage).toBe('Erreur lors de la recherche.');
    }));
  });

  describe('onSearchChange', () => {
    it('should update searchQuery and emit to subject', () => {
      const spy = spyOn(component['search$'], 'next');
      component.onSearchChange('test');
      expect(component.searchQuery).toBe('test');
      expect(spy).toHaveBeenCalledWith('test');
    });
  });

  describe('toggleUser', () => {
    it('should add id to selectedIds', () => {
      component.toggleUser(10);
      expect(component.selectedIds.has(10)).toBeTrue();
    });

    it('should remove id from selectedIds if already present', () => {
      component.selectedIds.add(10);
      component.toggleUser(10);
      expect(component.selectedIds.has(10)).toBeFalse();
    });
  });

  describe('close', () => {
    it('should clear error and emit closed', () => {
      component.errorMessage = 'err';
      const spy = spyOn(component.closed, 'emit');
      component.close();
      expect(component.errorMessage).toBe('');
      expect(spy).toHaveBeenCalled();
    });
  });

  describe('onOverlayClick', () => {
    it('should close when target has modal-overlay class', () => {
      const spy = spyOn(component, 'close');
      const event = new MouseEvent('click');
      Object.defineProperty(event, 'target', { value: { classList: { contains: (cls: string) => cls === 'modal-overlay' } } });
      component.onOverlayClick(event);
      expect(spy).toHaveBeenCalled();
    });

    it('should not close when target does not have modal-overlay class', () => {
      const spy = spyOn(component, 'close');
      const event = new MouseEvent('click');
      Object.defineProperty(event, 'target', { value: { classList: { contains: () => false } } });
      component.onOverlayClick(event);
      expect(spy).not.toHaveBeenCalled();
    });
  });

  describe('ajouter', () => {
    it('should not call service when no users selected', () => {
      component.ajouter();
      expect(svc.ajouterMembres).not.toHaveBeenCalled();
    });

    it('should call ajouterMembres and emit saved on success', () => {
      svc.ajouterMembres.and.returnValue(of(mockEquipe));
      component.selectedIds.add(10);
      component.selectedIds.add(11);
      const spy = spyOn(component.saved, 'emit');

      component.ajouter();

      expect(svc.ajouterMembres).toHaveBeenCalledWith(1, [10, 11]);
      expect(component.loading).toBeFalse();
      expect(spy).toHaveBeenCalled();
    });

    it('should set errorMessage on failure', () => {
      svc.ajouterMembres.and.returnValue(throwError(() => new Error('fail')));
      component.selectedIds.add(10);

      component.ajouter();

      expect(component.loading).toBeFalse();
      expect(component.errorMessage).toBe('Erreur lors de l\'ajout des membres.');
    });
  });

  describe('initiales', () => {
    it('should return two initials', () => {
      expect(component.initiales(mockUsers[0])).toBe('JD');
    });

    it('should handle null prenom', () => {
      const u: User = { ...mockUsers[0], prenom: null as any };
      expect(component.initiales(u)).toBe('D');
    });

    it('should handle null nom', () => {
      const u: User = { ...mockUsers[0], nom: null as any };
      expect(component.initiales(u)).toBe('J');
    });

    it('should handle both null', () => {
      const u: User = { ...mockUsers[0], prenom: null as any, nom: null as any };
      expect(component.initiales(u)).toBe('');
    });
  });

  describe('nomComplet', () => {
    it('should return prenom and nom', () => {
      expect(component.nomComplet(mockUsers[0])).toBe('Jean Dupont');
    });
  });
});
