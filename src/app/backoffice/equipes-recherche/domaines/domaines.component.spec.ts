import { ComponentFixture, TestBed, fakeAsync, tick } from '@angular/core/testing';
import { of, throwError } from 'rxjs';
import { EquipeDomaine } from '../../../core/models/equipe-domaine.model';
import { Page } from '../../../core/models/page.model';
import { EquipeDomaineService } from '../../../core/services/equipe-domaine.service';
import { DomainesComponent } from './domaines.component';

const mockPage: Page<EquipeDomaine> = {
  content: [
    { id: 1, nom: 'Informatique', dateCreation: '2025-01-01' },
    { id: 2, nom: 'Mathématiques', dateCreation: '2025-01-02' },
  ],
  page: 0, size: 12, totalElements: 2, totalPages: 1, first: true, last: true,
};

describe('DomainesComponent', () => {
  let component: DomainesComponent;
  let fixture: ComponentFixture<DomainesComponent>;
  let svc: jasmine.SpyObj<EquipeDomaineService>;

  beforeEach(() => {
    svc = jasmine.createSpyObj<EquipeDomaineService>('EquipeDomaineService', [
      'getPage', 'getAll', 'getCount', 'create', 'update', 'delete',
    ]);
    svc.getCount.and.returnValue(of(2));
    svc.getPage.and.returnValue(of(mockPage));
    svc.create.and.returnValue(of({ id: 3, nom: 'Nouveau', dateCreation: '2025-06-01' }));
    svc.update.and.returnValue(of({ id: 1, nom: 'Modifié', dateCreation: '2025-01-01' }));
    svc.delete.and.returnValue(of(void 0));

    TestBed.configureTestingModule({
      imports: [DomainesComponent],
      providers: [{ provide: EquipeDomaineService, useValue: svc }],
    });
    fixture = TestBed.createComponent(DomainesComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should load count and page on init', () => {
    expect(svc.getCount).toHaveBeenCalled();
    expect(svc.getPage).toHaveBeenCalledWith(0, 12, '');
    expect(component.domainItems.length).toBe(2);
    expect(component.domainsCount).toBe(2);
  });

  it('should handle page load error', fakeAsync(() => {
    svc.getPage.and.returnValue(throwError(() => new Error('fail')));
    component.onDomainSearchInput('notfound');
    tick(350);
    expect(component.domainsLoading).toBeFalse();
    expect(component.domainsLoadError).toContain('backend');
  }));

  it('should trigger search on input', fakeAsync(() => {
    const searchSpy = svc.getPage;
    searchSpy.calls.reset();
    component.onDomainSearchInput('test');
    tick(350);
    expect(searchSpy).toHaveBeenCalledWith(0, 12, 'test');
  }));

  it('should open and close create modal', () => {
    component.openCreateDomaineModal();
    expect(component.isDomainModalOpen).toBeTrue();
    expect(component.editingDomaine).toBeNull();
    expect(component.domainModalNom).toBe('');

    component.closeDomainModal();
    expect(component.isDomainModalOpen).toBeFalse();
    expect(component.editingDomaine).toBeNull();
    expect(component.domainModalNom).toBe('');
  });

  it('should open edit modal with existing data', () => {
    const item = mockPage.content[0];
    component.openEditDomaineModal(item);
    expect(component.isDomainModalOpen).toBeTrue();
    expect(component.editingDomaine).toEqual(item);
    expect(component.domainModalNom).toBe('Informatique');
  });

  it('should save new domaine (create)', () => {
    component.openCreateDomaineModal();
    component.domainModalNom = 'Nouveau';
    component.saveDomaine();
    expect(svc.create).toHaveBeenCalledWith('Nouveau');
    expect(component.isDomainModalOpen).toBeFalse();
  });

  it('should save edited domaine (update)', () => {
    const item = mockPage.content[0];
    component.openEditDomaineModal(item);
    component.domainModalNom = 'Modifié';
    component.saveDomaine();
    expect(svc.update).toHaveBeenCalledWith(1, 'Modifié');
    expect(component.isDomainModalOpen).toBeFalse();
  });

  it('should show error on save with empty name', () => {
    component.openCreateDomaineModal();
    component.domainModalNom = '';
    component.saveDomaine();
    expect(component.domainModalError).toContain('obligatoire');
    expect(svc.create).not.toHaveBeenCalled();
  });

  it('should show error on save API failure', () => {
    svc.create.and.returnValue(throwError(() => ({ error: { detail: 'API Error' } })));
    component.openCreateDomaineModal();
    component.domainModalNom = 'Nouveau';
    component.saveDomaine();
    expect(component.domainModalError).toContain('API Error');
  });

  it('should show error.message when error.detail is missing', () => {
    svc.create.and.returnValue(throwError(() => ({ error: { message: 'Msg only' } })));
    component.openCreateDomaineModal();
    component.domainModalNom = 'Nouveau';
    component.saveDomaine();
    expect(component.domainModalError).toContain('Msg only');
  });

  it('should show fallback error when neither detail nor message', () => {
    svc.create.and.returnValue(throwError(() => ({ error: {} })));
    component.openCreateDomaineModal();
    component.domainModalNom = 'Nouveau';
    component.saveDomaine();
    expect(component.domainModalError).toContain('enregistrement');
  });

  it('should open delete confirmation', () => {
    const item = mockPage.content[0];
    component.deleteDomaine(item);
    expect(component.deleteDomaineConfirmOpen).toBeTrue();
    expect(component.domaineToDelete).toEqual(item);
  });

  it('should cancel delete', () => {
    component.deleteDomaine(mockPage.content[0]);
    component.cancelDeleteDomaine();
    expect(component.deleteDomaineConfirmOpen).toBeFalse();
    expect(component.domaineToDelete).toBeNull();
  });

  it('should confirm delete and remove', () => {
    component.domainItems = [...mockPage.content];
    component.domainsPage = 0;
    component.deleteDomaine(mockPage.content[0]);
    component.confirmDeleteDomaine();
    expect(svc.delete).toHaveBeenCalledWith(1);
    expect(component.deleteDomaineConfirmOpen).toBeFalse();
  });

  it('should go to previous page when deleting last item on page > 0', () => {
    const page0: Page<EquipeDomaine> = {
      content: [], page: 0, size: 12, totalElements: 0, totalPages: 3, first: true, last: false,
    };
    svc.getPage.and.returnValue(of(page0));
    component.domainsPage = 1;
    component.domainItems = [{ id: 3, nom: 'Seul', dateCreation: '2025-01-01' }];
    component.deleteDomaine({ id: 3, nom: 'Seul', dateCreation: '2025-01-01' });
    component.confirmDeleteDomaine();
    expect(svc.delete).toHaveBeenCalledWith(3);
    expect(component.domainsPage).toBe(0);
  });

  it('should do nothing when confirmDeleteDomaine called without domaineToDelete', () => {
    component.confirmDeleteDomaine();
    expect(svc.delete).not.toHaveBeenCalled();
  });

  it('should show alert on delete error', () => {
    svc.delete.and.returnValue(throwError(() => new Error('fail')));
    component.deleteDomaine(mockPage.content[0]);
    component.confirmDeleteDomaine();
    expect(component.deleteDomaineAlertOpen).toBeTrue();
    expect(component.deleteDomaineAlertMessage).toContain('Impossible');
  });

  it('should close delete alert', () => {
    component.closeDeleteDomaineAlert();
    expect(component.deleteDomaineAlertOpen).toBeFalse();
    expect(component.deleteDomaineAlertMessage).toBe('');
  });

  it('should return confirm message from deleteDomaineConfirmMessage', () => {
    const item = mockPage.content[0];
    component.domaineToDelete = item;
    expect(component.deleteDomaineConfirmMessage).toContain('Informatique');
    component.domaineToDelete = null;
    expect(component.deleteDomaineConfirmMessage).toBe('');
  });

  it('should go to page within bounds', () => {
    const page1 = { ...mockPage, page: 1 };
    svc.getPage.and.returnValue(of(page1));
    component.domainsTotalPages = 3;
    component.goToDomainPage(1);
    expect(component.domainsPage).toBe(1);
  });

  it('should not go to page out of bounds', () => {
    component.domainsPage = 0;
    component.goToDomainPage(-1);
    expect(component.domainsPage).toBe(0);
    component.goToDomainPage(10);
    expect(component.domainsPage).toBe(0);
  });

  it('should get initial from name', () => {
    expect(component.getInitial('Informatique')).toBe('I');
    expect(component.getInitial('math')).toBe('M');
  });

  it('should handle getCount error gracefully', () => {
    svc.getCount.and.returnValue(throwError(() => new Error('fail')));
    (component as any).loadDomainesCount();
    expect(component.domainsCount).toBe(2);
  });
});
