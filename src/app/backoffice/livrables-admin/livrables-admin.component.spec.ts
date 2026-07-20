import { CommonModule } from '@angular/common';
import { ComponentFixture, TestBed, fakeAsync, tick } from '@angular/core/testing';
import { FormsModule } from '@angular/forms';
import { of, throwError } from 'rxjs';
import { Livrable } from '../../core/models/livrable.model';
import { LivrableService } from '../../core/services/livrable.service';
import { LivrablesAdminComponent } from './livrables-admin.component';

describe('LivrablesAdminComponent', () => {
  let component: LivrablesAdminComponent;
  let fixture: ComponentFixture<LivrablesAdminComponent>;
  let service: jasmine.SpyObj<LivrableService>;

  const livrable: Livrable = {
    id: 1,
    sujetProjetId: 42,
    projetTitre: 'Plateforme IoT',
    typeLivrable: 'RAPPORT',
    nom: 'Rapport final',
    description: 'Desc',
    originalFileName: 'rapport.pdf',
    objectName: 'obj',
    contentType: 'application/pdf',
    size: 2048,
    lienExterne: null,
    deposantId: 7,
    deposantNom: 'Jean Dupont',
    dateDepot: new Date().toISOString(),
    actif: true,
  };

  const livrable2: Livrable = {
    ...livrable,
    id: 2,
    nom: 'Documentation projet',
    typeLivrable: 'DOCUMENTATION',
    objectName: null,
    size: null,
    lienExterne: 'https://example.com',
    actif: false,
  };

  beforeEach(async () => {
    service = jasmine.createSpyObj<LivrableService>('LivrableService', ['findAllAdmin', 'updateAdmin', 'deleteAdmin', 'downloadUrl']);
    service.findAllAdmin.and.returnValue(of([livrable, livrable2]));
    service.updateAdmin.and.returnValue(of(livrable));
    service.deleteAdmin.and.returnValue(of(void 0));
    service.downloadUrl.and.returnValue('http://download');

    await TestBed.configureTestingModule({
      imports: [CommonModule, FormsModule, LivrablesAdminComponent],
      providers: [{ provide: LivrableService, useValue: service }],
    }).compileComponents();

    fixture = TestBed.createComponent(LivrablesAdminComponent);
    component = fixture.componentInstance;
  });

  it('should load livrables on init and filter them', () => {
    component.ngOnInit();

    expect(service.findAllAdmin).toHaveBeenCalled();
    expect(component.filteredLivrables().length).toBe(2);

    component.selectedType.set('RAPPORT');
    expect(component.filteredLivrables().length).toBe(1);

    component.selectedType.set('DOCUMENTATION');
    expect(component.filteredLivrables().length).toBe(1);

    component.selectedType.set('LIEN_GIT');
    expect(component.filteredLivrables().length).toBe(0);

    component.selectedType.set('');
    component.query.set('plateforme');
    expect(component.filteredLivrables().length).toBe(2);

    component.query.set('unknown');
    expect(component.filteredLivrables().length).toBe(0);
  });

  it('should filter by deposantNom in query', () => {
    component.ngOnInit();
    component.query.set('jean dupont');
    expect(component.filteredLivrables().length).toBe(2);

    component.query.set('marie');
    expect(component.filteredLivrables().length).toBe(0);
  });

  it('should open edit, validate and save the livrable', fakeAsync(() => {
    component.openEdit(livrable);
    expect(component.selectedLivrable()?.id).toBe(1);
    expect(component.editForm.nom).toBe('Rapport final');

    component.editForm.nom = '  Nouveau nom  ';
    component.editForm.description = '  Nouvelle desc  ';
    component.editForm.lienExterne = '  https://example.com  ';
    component.saveEdit();

    expect(service.updateAdmin).toHaveBeenCalledWith(1, jasmine.objectContaining({
      nom: 'Nouveau nom',
      description: 'Nouvelle desc',
      lienExterne: 'https://example.com',
      actif: true,
    }));

    tick(2500);
  }));

  it('should save with empty description and lienExterne as null', fakeAsync(() => {
    component.openEdit(livrable);
    component.editForm.nom = 'Test';
    component.editForm.description = '   ';
    component.editForm.lienExterne = '   ';
    component.saveEdit();

    expect(service.updateAdmin).toHaveBeenCalledWith(1, jasmine.objectContaining({
      description: null,
      lienExterne: null,
    }));
    tick(2500);
  }));

  it('should reject save when name is empty and support delete / helpers', () => {
    component.openEdit(livrable);
    component.editForm.nom = '   ';
    component.saveEdit();
    expect(component.error()).toBe('Le nom est obligatoire.');

    component.delete(livrable);
    expect(service.deleteAdmin).toHaveBeenCalledWith(1);

    expect(component.download(livrable)).toBe('http://download');
    expect(component.formatSize(null)).toBe('-');
    expect(component.formatSize(0)).toBe('-');
    expect(component.formatSize(1024)).toBe('1 Ko');
    expect(component.formatSize(500)).toBe('0 Ko');
    expect(component.formatSize(1024 * 1024 - 1)).toBe('1024 Ko');
    expect(component.formatSize(2 * 1024 * 1024)).toBe('2.0 Mo');
    expect(component.formatSize(1024 * 1024)).toBe('1.0 Mo');
  });

  it('should expose an error when load fails', () => {
    service.findAllAdmin.and.returnValue(throwError(() => new Error('boom')));
    component.load();
    expect(component.error()).toBe('Impossible de charger les livrables.');
  });

  it('should expose update and delete errors', () => {
    component.openEdit(livrable);
    component.editForm.nom = 'Nouveau nom';
    service.updateAdmin.and.returnValue(throwError(() => ({ error: { detail: 'Nom invalide' } })));

    component.saveEdit();

    expect(component.error()).toBe('Nom invalide');

    service.updateAdmin.and.returnValue(throwError(() => new Error('boom')));
    component.saveEdit();
    expect(component.error()).toBe('Mise a jour impossible.');

    service.deleteAdmin.and.returnValue(throwError(() => new Error('boom')));
    component.delete(livrable);

    expect(component.error()).toBe('Suppression impossible.');
  });

  it('should not save when no selectedLivrable', () => {
    component.selectedLivrable.set(null);
    component.saveEdit();
    expect(component.error()).toBe('Le nom est obligatoire.');
    expect(service.updateAdmin).not.toHaveBeenCalled();
  });

  // ── typeBadgeClass ────────────────────────────────────────────────
  it('typeBadgeClass should return correct class for DOCUMENTATION', () => {
    expect(component.typeBadgeClass('DOCUMENTATION')).toBe('badge--doc');
  });

  it('typeBadgeClass should return correct class for CODE_SOURCE', () => {
    expect(component.typeBadgeClass('CODE_SOURCE')).toBe('badge--code');
  });

  it('typeBadgeClass should return correct class for LIEN_GIT', () => {
    expect(component.typeBadgeClass('LIEN_GIT')).toBe('badge--git');
  });

  it('typeBadgeClass should return correct class for RAPPORT', () => {
    expect(component.typeBadgeClass('RAPPORT')).toBe('badge--rapport');
  });

  it('typeBadgeClass should return correct class for PRESENTATION', () => {
    expect(component.typeBadgeClass('PRESENTATION')).toBe('badge--presentation');
  });

  it('typeBadgeClass should return correct class for IMAGE', () => {
    expect(component.typeBadgeClass('IMAGE')).toBe('badge--image');
  });

  it('typeBadgeClass should return correct class for FICHIER_TXT', () => {
    expect(component.typeBadgeClass('FICHIER_TXT')).toBe('badge--txt');
  });

  it('typeBadgeClass should return default class for AUTRE', () => {
    expect(component.typeBadgeClass('AUTRE')).toBe('badge--autre');
  });

  // ── typeDotClass ──────────────────────────────────────────────────
  it('typeDotClass should return correct class for DOCUMENTATION', () => {
    expect(component.typeDotClass('DOCUMENTATION')).toBe('dot-doc');
  });

  it('typeDotClass should return correct class for CODE_SOURCE', () => {
    expect(component.typeDotClass('CODE_SOURCE')).toBe('dot-code');
  });

  it('typeDotClass should return correct class for LIEN_GIT', () => {
    expect(component.typeDotClass('LIEN_GIT')).toBe('dot-git');
  });

  it('typeDotClass should return correct class for RAPPORT', () => {
    expect(component.typeDotClass('RAPPORT')).toBe('dot-rapport');
  });

  it('typeDotClass should return correct class for PRESENTATION', () => {
    expect(component.typeDotClass('PRESENTATION')).toBe('dot-presentation');
  });

  it('typeDotClass should return correct class for IMAGE', () => {
    expect(component.typeDotClass('IMAGE')).toBe('dot-image');
  });

  it('typeDotClass should return correct class for FICHIER_TXT', () => {
    expect(component.typeDotClass('FICHIER_TXT')).toBe('dot-txt');
  });

  it('typeDotClass should return default class for AUTRE', () => {
    expect(component.typeDotClass('AUTRE')).toBe('dot-autre');
  });

  // ── toggleFilter ──────────────────────────────────────────────────
  it('toggleFilter should set filter when currently null', () => {
    const event = new Event('click');
    spyOn(event, 'stopPropagation');
    component.toggleFilter('type', event);
    expect(component.openFilter()).toBe('type');
    expect(event.stopPropagation).toHaveBeenCalled();
  });

  it('toggleFilter should clear filter when same filter is already open', () => {
    component.openFilter.set('type');
    const event = new Event('click');
    component.toggleFilter('type', event);
    expect(component.openFilter()).toBeNull();
  });

  it('toggleFilter should switch filter when different filter is open', () => {
    component.openFilter.set('type');
    const event = new Event('click');
    component.toggleFilter('type', event);
    expect(component.openFilter()).toBeNull();
  });

  // ── selectTypeFilter ──────────────────────────────────────────────
  it('selectTypeFilter should set type, close filter, and reset page', () => {
    component.openFilter.set('type');
    component.currentPage.set(5);
    component.selectTypeFilter('RAPPORT');
    expect(component.selectedType()).toBe('RAPPORT');
    expect(component.openFilter()).toBeNull();
    expect(component.currentPage()).toBe(1);
  });

  it('selectTypeFilter should clear type when empty value selected', () => {
    component.selectedType.set('RAPPORT');
    component.selectTypeFilter('');
    expect(component.selectedType()).toBe('');
  });

  // ── updateSearch ──────────────────────────────────────────────────
  it('updateSearch should set query and reset page', () => {
    component.currentPage.set(5);
    component.updateSearch('test');
    expect(component.query()).toBe('test');
    expect(component.currentPage()).toBe(1);
  });

  // ── goToPage ─────────────────────────────────────────────────────
  it('goToPage should set valid page number', () => {
    component.ngOnInit();
    component.goToPage(1);
    expect(component.currentPage()).toBe(1);
  });

  it('goToPage should clamp to 1 when page < 1', () => {
    component.ngOnInit();
    component.goToPage(0);
    expect(component.currentPage()).toBe(1);

    component.goToPage(-5);
    expect(component.currentPage()).toBe(1);
  });

  it('goToPage should clamp to totalPages when page > totalPages', () => {
    component.ngOnInit();
    const maxPage = component.totalPages;
    component.goToPage(999);
    expect(component.currentPage()).toBe(maxPage);
  });

  // ── closeFiltersOnOutsideClick ────────────────────────────────────
  it('closeFiltersOnOutsideClick should close open filter', () => {
    component.openFilter.set('type');
    component.closeFiltersOnOutsideClick();
    expect(component.openFilter()).toBeNull();
  });

  it('closeFiltersOnOutsideClick should be no-op when no filter open', () => {
    component.openFilter.set(null);
    component.closeFiltersOnOutsideClick();
    expect(component.openFilter()).toBeNull();
  });

  // ── statsCards ────────────────────────────────────────────────────
  it('statsCards should compute correct stats', () => {
    component.ngOnInit();
    const stats = component.statsCards();
    expect(stats.length).toBe(4);
    expect(stats[0].label).toBe('Total livrables');
    expect(stats[0].value).toBe(2);
    expect(stats[1].label).toBe('Actifs');
    expect(stats[1].value).toBe(1);
    expect(stats[2].label).toBe('Fichiers');
    expect(stats[2].value).toBe(1);
    expect(stats[3].label).toBe('Liens externes');
    expect(stats[3].value).toBe(1);
  });

  it('statsCards should compute 0 for empty livrables', () => {
    component.livrables.set([]);
    const stats = component.statsCards();
    expect(stats[0].value).toBe(0);
    expect(stats[1].value).toBe(0);
    expect(stats[2].value).toBe(0);
    expect(stats[3].value).toBe(0);
  });

  // ── pageNumbers ──────────────────────────────────────────────────
  it('pageNumbers should return array of page numbers', () => {
    component.ngOnInit();
    expect(component.pageNumbers).toEqual([1]);
  });

  it('pageNumbers should handle multiple pages', () => {
    component.livrables.set(Array.from({ length: 20 }, (_, i) => ({ ...livrable, id: i + 1 })));
    expect(component.pageNumbers).toEqual([1, 2, 3]);
  });

  // ── visibleLivrables ──────────────────────────────────────────────
  it('visibleLivrables should return current page slice', () => {
    component.ngOnInit();
    component.currentPage.set(1);
    expect(component.visibleLivrables.length).toBe(2);
  });

  it('visibleLivrables should return empty for out-of-range page', () => {
    component.ngOnInit();
    component.currentPage.set(99);
    expect(component.visibleLivrables.length).toBe(0);
  });

  // ── totalPages ───────────────────────────────────────────────────
  it('totalPages should return at least 1', () => {
    component.livrables.set([]);
    expect(component.totalPages).toBe(1);
  });

  // ── typeFilterLabel ──────────────────────────────────────────────
  it('typeFilterLabel should return selected type label', () => {
    component.selectedType.set('RAPPORT');
    expect(component.typeFilterLabel).toBe('Rapport');
  });

  it('typeFilterLabel should return Tous les types when empty', () => {
    component.selectedType.set('');
    expect(component.typeFilterLabel).toBe('Tous les types');
  });

  it('typeFilterLabel should return Tous les types for unknown value', () => {
    component.selectedType.set('UNKNOWN' as any);
    expect(component.typeFilterLabel).toBe('Tous les types');
  });

  // ── closeEdit ────────────────────────────────────────────────────
  it('closeEdit should clear selectedLivrable', () => {
    component.openEdit(livrable);
    expect(component.selectedLivrable()).toBeTruthy();
    component.closeEdit();
    expect(component.selectedLivrable()).toBeNull();
  });

  // ── load success ─────────────────────────────────────────────────
  it('should set livrables on successful load', () => {
    service.findAllAdmin.and.returnValue(of([livrable, { ...livrable, id: 2, nom: 'Rapport 2' }]));
    component.load();
    expect(component.livrables().length).toBe(2);
    expect(component.loading()).toBeFalse();
  });
});
