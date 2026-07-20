import { HttpErrorResponse } from '@angular/common/http';
import { TestBed, fakeAsync, tick } from '@angular/core/testing';
import { of, throwError } from 'rxjs';
import { Page } from '../../core/models/page.model';
import { User } from '../../core/models/user.model';
import { AdminService } from '../../core/services/admin.service';
import { UsersComponent } from './users.component';

function makeUser(over: Partial<User> = {}): User {
  return {
    id: 1, nom: 'Dupont', prenom: 'Jean', email: 'jean@esprit.tn',
    role: 'ROLE_ETUDIANT', typeUtilisateur: 'ETUDIANT', departement: null, enabled: true,
    createdAt: '2025-01-15T10:00:00Z', isAffilieToEquipe: false, equipeId: null, equipeNom: null, ...over,
  };
}

function makePage(content: User[], over: Partial<Page<User>> = {}): Page<User> {
  return {
    content, page: 0, size: 8, totalElements: content.length, totalPages: 1, first: true, last: true, ...over,
  };
}

/** Construit un faux événement de clic avec une cible et une cible courante données. */
function clickEvent(target: object, currentTarget: object): Event {
  return { target, currentTarget } as unknown as Event;
}

describe('UsersComponent', () => {
  let component: UsersComponent;
  let adminService: jasmine.SpyObj<AdminService>;

  beforeEach(() => {
    adminService = jasmine.createSpyObj<AdminService>('AdminService', [
      'getUsers', 'createUser', 'updateUser', 'deleteUser',
    ]);
    adminService.getUsers.and.returnValue(of(makePage([])));

    TestBed.configureTestingModule({
      imports: [UsersComponent],
      providers: [{ provide: AdminService, useValue: adminService }],
    });
    component = TestBed.createComponent(UsersComponent).componentInstance;
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  describe('loadUsers', () => {
    it('should map users to rows and pagination state', () => {
      adminService.getUsers.and.returnValue(of(makePage([makeUser({ enabled: false, createdAt: null })], { totalElements: 1, totalPages: 2, first: true, last: false })));
      component.loadUsers();
      expect(component.users.length).toBe(1);
      expect(component.users[0].name).toBe('Jean Dupont');
      expect(component.users[0].role).toBe('Étudiant');
      expect(component.users[0].status).toBe('Suspendu');
      expect(component.users[0].initials).toBe('JD');
      expect(component.users[0].joined).toBe('—');
      expect(component.totalElements).toBe(1);
      expect(component.last).toBeFalse();
      expect(component.loading()).toBeFalse();
    });

    it('should format the joined date when present', () => {
      adminService.getUsers.and.returnValue(of(makePage([makeUser()])));
      component.loadUsers();
      expect(component.users[0].joined).toBe('2025-01-15');
    });

    it('should fall back to the raw role for an unknown role', () => {
      adminService.getUsers.and.returnValue(of(makePage([makeUser({ role: 'ROLE_FUTURE' as never })])));
      component.loadUsers();
      expect(component.users[0].role).toBe('ROLE_FUTURE');
    });

    it('should set a load error on failure', () => {
      adminService.getUsers.and.returnValue(throwError(() => new HttpErrorResponse({ error: { detail: 'KO' } })));
      component.loadUsers();
      expect(component.loadError()).toBe('KO');
    });

    it('should use a default load error message', () => {
      adminService.getUsers.and.returnValue(throwError(() => new HttpErrorResponse({ status: 500 })));
      component.loadUsers();
      expect(component.loadError()).toContain('Impossible de charger');
    });
  });

  describe('search and pagination', () => {
    it('should debounce search input and reset to first page', fakeAsync(() => {
      component.ngOnInit();
      adminService.getUsers.calls.reset();
      component.page = 3;
      component.onSearchInput('ali');
      tick(300);
      expect(component.searchTerm).toBe('ali');
      expect(component.page).toBe(0);
      expect(adminService.getUsers).toHaveBeenCalled();
      component.ngOnDestroy();
    }));

    it('should go to the next page only when not on the last page', () => {
      component.last = false;
      component.page = 0;
      component.nextPage();
      expect(component.page).toBe(1);
      component.last = true;
      component.nextPage();
      expect(component.page).toBe(1);
    });

    it('should go to the previous page only when not on the first page', () => {
      component.first = false;
      component.page = 2;
      component.prevPage();
      expect(component.page).toBe(1);
      component.first = true;
      component.prevPage();
      expect(component.page).toBe(1);
    });
  });

  describe('getStatusClass', () => {
    it('should map statuses to css classes', () => {
      expect(component.getStatusClass('Actif')).toBe('status-active');
      expect(component.getStatusClass('Suspendu')).toBe('status-suspended');
      expect(component.getStatusClass('En attente')).toBe('status-pending');
      expect(component.getStatusClass('Inconnu')).toBe('');
    });
  });

  describe('create user', () => {
    it('should open and close the create modal', () => {
      component.openCreateModal();
      expect(component.isCreateModalOpen).toBeTrue();
      component.closeCreateModal();
      expect(component.isCreateModalOpen).toBeFalse();
    });

    it('should not create when required fields are missing', () => {
      component.createUserForm = { name: '', email: '', password: '', role: '', status: 'Actif' };
      component.createUser();
      expect(adminService.createUser).not.toHaveBeenCalled();
    });

    it('should create a user and reload', () => {
      component.createUserForm = {
        name: 'Marie Curie', email: 'm@esprit.tn', password: 'pw', role: 'Administrateur', status: 'Actif',
      };
      adminService.createUser.and.returnValue(of(makeUser()));
      component.createUser();
      expect(adminService.createUser).toHaveBeenCalledWith(jasmine.objectContaining({
        prenom: 'Marie', nom: 'Curie', role: 'ROLE_ADMIN', enabled: true,
      }));
      expect(component.isCreateModalOpen).toBeFalse();
    });

    it('should map an unknown role label to ROLE_ETUDIANT', () => {
      component.createUserForm = {
        name: 'Solo', email: 'm@esprit.tn', password: 'pw', role: 'Bogus', status: 'Suspendu',
      };
      adminService.createUser.and.returnValue(of(makeUser()));
      component.createUser();
      expect(adminService.createUser).toHaveBeenCalledWith(jasmine.objectContaining({
        prenom: 'Solo', nom: 'Solo', role: 'ROLE_ETUDIANT', enabled: false,
      }));
    });

    it('should surface a field-validation error (400)', () => {
      component.createUserForm = { name: 'A B', email: 'm@esprit.tn', password: 'pw', role: 'CI', status: 'Actif' };
      adminService.createUser.and.returnValue(throwError(() => new HttpErrorResponse({ status: 400, error: { errors: { email: 'bad' } } })));
      component.createUser();
      expect(component.createError()).toBe('bad');
    });

    it('should surface an unreachable-server error (0)', () => {
      component.createUserForm = { name: 'A B', email: 'm@esprit.tn', password: 'pw', role: 'CI', status: 'Actif' };
      adminService.createUser.and.returnValue(throwError(() => new HttpErrorResponse({ status: 0 })));
      component.createUser();
      expect(component.createError()).toBe('Serveur injoignable.');
    });

    it('should surface the backend detail otherwise', () => {
      component.createUserForm = { name: 'A B', email: 'm@esprit.tn', password: 'pw', role: 'CI', status: 'Actif' };
      adminService.createUser.and.returnValue(throwError(() => new HttpErrorResponse({ status: 409, error: { detail: 'Conflit' } })));
      component.createUser();
      expect(component.createError()).toBe('Conflit');
    });

    it('should fall back to a generic message when no detail is provided', () => {
      component.createUserForm = { name: 'A B', email: 'm@esprit.tn', password: 'pw', role: 'CI', status: 'Actif' };
      adminService.createUser.and.returnValue(throwError(() => new HttpErrorResponse({ status: 500 })));
      component.createUser();
      expect(component.createError()).toBe('Une erreur est survenue. Veuillez réessayer.');
    });
  });

  describe('details and edit', () => {
    const row = {
      id: 1, name: 'Jean Dupont', email: 'jean@esprit.tn', role: 'Étudiant', status: 'Actif',
      joined: '2025-01-15', initials: 'JD', color: '#000',
    };

    it('should open and close the details modal', () => {
      component.openDetailsModal(row);
      expect(component.isDetailsModalOpen).toBeTrue();
      expect(component.selectedUser).toBe(row);
      component.closeDetailsModal();
      expect(component.isDetailsModalOpen).toBeFalse();
      expect(component.selectedUser).toBeNull();
    });

    it('should open the edit modal from the details and prefill the form', () => {
      component.openEditModal(row);
      expect(component.isEditModalOpen).toBeTrue();
      expect(component.editUserForm.name).toBe('Jean Dupont');
      component.closeEditModal();
      expect(component.isEditModalOpen).toBeFalse();
    });

    it('should not save when no user is selected', () => {
      component.selectedUser = null;
      component.saveUser();
      expect(adminService.updateUser).not.toHaveBeenCalled();
    });

    it('should save the edited user and reload', () => {
      component.selectedUser = row;
      component.editUserForm = { name: 'Paul Martin', email: 'p@esprit.tn', role: 'Enseignant', status: 'Suspendu' };
      adminService.updateUser.and.returnValue(of(makeUser()));
      component.saveUser();
      expect(adminService.updateUser).toHaveBeenCalledWith(1, jasmine.objectContaining({
        prenom: 'Paul', nom: 'Martin', role: 'ROLE_ENSEIGNANT', enabled: false,
      }));
      expect(component.isEditModalOpen).toBeFalse();
    });

    it('should show an edit error on failure', () => {
      component.selectedUser = row;
      component.editUserForm = { name: 'Paul Martin', email: 'p@esprit.tn', role: 'Bogus', status: 'Actif' };
      adminService.updateUser.and.returnValue(throwError(() => new HttpErrorResponse({ status: 500 })));
      component.saveUser();
      expect(component.editError()).toContain('Échec de la mise à jour');
    });
  });

  describe('delete user', () => {
    const row = {
      id: 2, name: 'Jean Dupont', email: 'jean@esprit.tn', role: 'Étudiant', status: 'Actif',
      joined: '2025-01-15', initials: 'JD', color: '#000',
    };

    it('should not delete when cancelled', () => {
      component.deleteUser(row);
      component.cancelDelete();
      expect(adminService.deleteUser).not.toHaveBeenCalled();
    });

    it('should delete, step back a page when emptying it, and reload', () => {
      adminService.deleteUser.and.returnValue(of({ message: 'ok', timestamp: 'now' }));
      component.users = [row];
      component.page = 2;
      component.deleteUser(row);
      component.confirmDelete();
      expect(component.page).toBe(1);
      expect(adminService.deleteUser).toHaveBeenCalledWith(2);
    });

    it('should open an alert dialog on delete failure', () => {
      adminService.deleteUser.and.returnValue(throwError(() => new HttpErrorResponse({ status: 500 })));
      component.deleteUser(row);
      component.confirmDelete();
      expect(component.deleteAlertOpen).toBeTrue();
      expect(component.deleteAlertMessage).toBe('Échec de la suppression.');
    });
  });

  describe('onOverlayClick', () => {
    it('should ignore clicks coming from an inner element (target !== overlay)', () => {
      const overlay = {};
      const inner = {};
      component.isCreateModalOpen = true;
      component.onOverlayClick(clickEvent(inner, overlay), 'create');
      expect(component.isCreateModalOpen).toBeTrue();
    });

    it('should close the create modal when the overlay itself is clicked', () => {
      const overlay = {};
      component.isCreateModalOpen = true;
      component.onOverlayClick(clickEvent(overlay, overlay), 'create');
      expect(component.isCreateModalOpen).toBeFalse();
    });

    it('should close the edit modal when the overlay itself is clicked', () => {
      const overlay = {};
      component.isEditModalOpen = true;
      component.onOverlayClick(clickEvent(overlay, overlay), 'edit');
      expect(component.isEditModalOpen).toBeFalse();
    });

    it('should close the details modal when the overlay itself is clicked', () => {
      const overlay = {};
      component.isDetailsModalOpen = true;
      component.selectedUser = null;
      component.onOverlayClick(clickEvent(overlay, overlay), 'details');
      expect(component.isDetailsModalOpen).toBeFalse();
    });
  });
});
