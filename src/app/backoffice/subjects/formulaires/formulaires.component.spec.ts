import { ComponentFixture, TestBed, fakeAsync, tick } from '@angular/core/testing';
import { of, throwError } from 'rxjs';
import { Page } from '../../../core/models/page.model';
import { ReferenceCounts, ReferenceItem } from '../../../core/models/sujet-reference.model';
import { SujetReferenceService } from '../../../core/services/sujet-reference.service';
import { FormulairesComponent } from './formulaires.component';

describe('FormulairesComponent', () => {
  let fixture: ComponentFixture<FormulairesComponent>;
  let component: FormulairesComponent;
  let referenceService: jasmine.SpyObj<SujetReferenceService>;

  const item: ReferenceItem = {
    id: 1,
    nom: 'Angular',
    dateCreation: '2026-01-01T00:00:00Z',
  };
  const counts: ReferenceCounts = {
    domaines: 2,
    prerequis: 3,
    technologies: 4,
  };

  const page = (content: ReferenceItem[] = [item], overrides: Partial<Page<ReferenceItem>> = {}): Page<ReferenceItem> => ({
    content,
    page: 0,
    size: 12,
    totalElements: content.length,
    totalPages: 1,
    first: true,
    last: true,
    ...overrides,
  });

  beforeEach(() => {
    referenceService = jasmine.createSpyObj<SujetReferenceService>('SujetReferenceService', [
      'getCounts',
      'getPage',
      'create',
      'update',
      'delete',
    ]);
    referenceService.getCounts.and.returnValue(of(counts));
    referenceService.getPage.and.returnValue(of(page()));
    referenceService.create.and.returnValue(of(item));
    referenceService.update.and.returnValue(of(item));
    referenceService.delete.and.returnValue(of(void 0));

    TestBed.configureTestingModule({
      imports: [FormulairesComponent],
      providers: [{ provide: SujetReferenceService, useValue: referenceService }],
    });

    fixture = TestBed.createComponent(FormulairesComponent);
    component = fixture.componentInstance;
  });

  afterEach(() => {
    fixture.destroy();
  });

  it('should load counts and paged items on init', () => {
    component.ngOnInit();

    expect(referenceService.getCounts).toHaveBeenCalled();
    expect(referenceService.getPage).toHaveBeenCalledWith('domaines', 0, 12, '');
    expect(component.counts).toEqual(counts);
    expect(component.items).toEqual([item]);
    expect(component.totalElements).toBe(1);
    expect(component.loading).toBeFalse();
    expect(component.activeTab.type).toBe('domaines');
    expect(component.countForActiveTab).toBe(2);
  });

  it('should debounce search input and reset to first page', fakeAsync(() => {
    component.ngOnInit();
    component.page = 2;

    component.onSearchInput('ang');
    tick(299);
    expect(referenceService.getPage).toHaveBeenCalledTimes(1);

    tick(1);
    expect(component.searchTerm).toBe('ang');
    expect(component.page).toBe(0);
    expect(referenceService.getPage).toHaveBeenCalledWith('domaines', 0, 12, 'ang');

    component.onSearchInput('ang');
    tick(300);
    expect(referenceService.getPage).toHaveBeenCalledTimes(2);
  }));

  it('should navigate tabs only when the target tab changes', () => {
    component.ngOnInit();
    referenceService.getPage.calls.reset();

    component.navigateTab(component.tabs[0]);
    expect(referenceService.getPage).not.toHaveBeenCalled();

    component.page = 3;
    component.searchTerm = 'old';
    component.navigateTab(component.tabs[2]);

    expect(component.activeType).toBe('technologies');
    expect(component.page).toBe(0);
    expect(component.searchTerm).toBe('');
    expect(component.activeTab.label).toBe('Technologies');
    expect(component.countForActiveTab).toBe(4);
    expect(referenceService.getPage).toHaveBeenCalledWith('technologies', 0, 12, '');

    component.activeType = 'prerequis';
    expect(component.countForActiveTab).toBe(3);
    component.activeType = 'unknown' as never;
    expect(component.activeTab.type).toBe('domaines');
  });

  it('should open, close and validate create/edit modals', () => {
    component.openCreateModal();
    expect(component.isModalOpen).toBeTrue();
    expect(component.editingItem).toBeNull();

    component.modalNom = '   ';
    component.saveItem();
    expect(component.modalError).toBe('Le nom est obligatoire.');

    component.modalNom = '  React  ';
    component.saveItem();
    expect(referenceService.create).toHaveBeenCalledWith('domaines', { nom: 'React' });
    expect(component.isModalOpen).toBeFalse();

    component.openEditModal(item);
    expect(component.editingItem).toBe(item);
    expect(component.modalNom).toBe('Angular');

    component.modalNom = 'Angular 20';
    component.saveItem();
    expect(referenceService.update).toHaveBeenCalledWith('domaines', 1, { nom: 'Angular 20' });

    component.closeModal();
    expect(component.isModalOpen).toBeFalse();
    expect(component.editingItem).toBeNull();
    expect(component.modalNom).toBe('');
  });

  it('should expose save errors from detail, message and fallback', () => {
    component.openCreateModal();
    component.modalNom = 'React';

    referenceService.create.and.returnValue(throwError(() => ({ error: { detail: 'Existe deja' } })));
    component.saveItem();
    expect(component.modalError).toBe('Existe deja');
    expect(component.saving).toBeFalse();

    referenceService.create.and.returnValue(throwError(() => ({ error: { message: 'Message backend' } })));
    component.saveItem();
    expect(component.modalError).toBe('Message backend');

    referenceService.create.and.returnValue(throwError(() => new Error('boom')));
    component.saveItem();
    expect(component.modalError).toBe('Erreur lors de l\'enregistrement.');
  });

  it('should handle delete confirmation, success, paging and alert errors', () => {
    component.items = [item];
    component.page = 2;

    component.deleteItem(item);
    expect(component.itemToDelete).toBe(item);
    expect(component.deleteConfirmOpen).toBeTrue();
    expect(component.deleteConfirmMessage).toContain('Angular');

    component.cancelDelete();
    expect(component.deleteConfirmOpen).toBeFalse();
    expect(component.itemToDelete).toBeNull();
    expect(component.deleting).toBeFalse();

    component.confirmDelete();
    expect(referenceService.delete).not.toHaveBeenCalled();

    component.deleteItem(item);
    component.confirmDelete();
    expect(referenceService.delete).toHaveBeenCalledWith('domaines', 1);
    expect(referenceService.getPage).toHaveBeenCalledWith('domaines', 1, 12, '');
    expect(component.itemToDelete).toBeNull();

    referenceService.delete.and.returnValue(throwError(() => new Error('boom')));
    component.deleteItem(item);
    component.confirmDelete();
    expect(component.deleteAlertOpen).toBeTrue();
    expect(component.deleteAlertMessage).toContain('Impossible de supprimer');
    expect(component.deleting).toBeFalse();

    component.closeDeleteAlert();
    expect(component.deleteAlertOpen).toBeFalse();
    expect(component.deleteAlertMessage).toBe('');
  });

  it('should clamp page navigation and expose load errors', () => {
    component.totalPages = 3;
    referenceService.getPage.calls.reset();

    component.goToPage(-1);
    component.goToPage(3);
    expect(referenceService.getPage).not.toHaveBeenCalled();

    referenceService.getPage.and.returnValue(of(page([item], { page: 1, first: false })));
    component.goToPage(1);
    expect(component.page).toBe(1);
    expect(referenceService.getPage).toHaveBeenCalledWith('domaines', 1, 12, '');

    referenceService.getCounts.and.returnValue(throwError(() => new Error('boom')));
    referenceService.getPage.and.returnValue(throwError(() => new Error('boom')));
    component.ngOnInit();

    expect(component.loading).toBeFalse();
    expect(component.loadError).toContain('Impossible de charger');
  });

  it('should return initials and an empty delete message when no item is selected', () => {
    expect(component.getInitial('angular')).toBe('A');
    expect(component.deleteConfirmMessage).toBe('');
  });
});
