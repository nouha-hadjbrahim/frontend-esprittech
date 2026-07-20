import { TestBed } from '@angular/core/testing';
import { of, throwError } from 'rxjs';
import { HistoriqueService } from '../../core/services/historique.service';
import { DomSanitizer } from '@angular/platform-browser';
import { HistoryComponent } from './history.component';

describe('HistoryComponent', () => {
  let component: HistoryComponent;
  let historiqueService: jasmine.SpyObj<HistoriqueService>;
  let sanitizer: jasmine.SpyObj<DomSanitizer>;

  const mockEntry = {
    id: 1,
    actorId: 10,
    actorNom: 'Dupont',
    actorPrenom: 'Jean',
    actorRole: 'ROLE_ADMIN',
    action: 'CREATE',
    entityType: 'SUJET_PROJET',
    entityId: 5,
    summary: 'Creation du sujet Test',
    oldValues: JSON.stringify({ statut: 'BROUILLON' }),
    newValues: JSON.stringify({ statut: 'VALIDE' }),
    metadata: JSON.stringify({ motif: 'Approuve' }),
    createdAt: '2026-07-15T10:30:00Z',
  };

  const mockResponse = {
    content: [mockEntry],
    totalElements: 1,
    totalPages: 1,
    page: 0,
    size: 100,
    first: true,
    last: true,
  };

  beforeEach(() => {
    historiqueService = jasmine.createSpyObj<HistoriqueService>('HistoriqueService', ['search']);
    sanitizer = jasmine.createSpyObj<DomSanitizer>('DomSanitizer', ['bypassSecurityTrustHtml']);
    sanitizer.bypassSecurityTrustHtml.and.callFake((val: string) => val as any);

    historiqueService.search.and.returnValue(of(mockResponse));

    TestBed.configureTestingModule({
      imports: [HistoryComponent],
      providers: [
        { provide: HistoriqueService, useValue: historiqueService },
        { provide: DomSanitizer, useValue: sanitizer },
      ],
    });

    const fixture = TestBed.createComponent(HistoryComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create and load logs', () => {
    expect(component).toBeTruthy();
    expect(historiqueService.search).toHaveBeenCalled();
    expect(component.allLogs().length).toBe(1);
  });

  it('should filter logs by search term', () => {
    component.onSearch('Dupont');
    expect(component.searchTerm()).toBe('Dupont');
    expect(component.filteredLogs().length).toBe(1);
    component.onSearch('zzz');
    expect(component.filteredLogs().length).toBe(0);
  });

  it('should filter logs by module', () => {
    component.selectModuleFilter('Sujets');
    expect(component.selectedModule()).toBe('Sujets');
    expect(component.viewPage()).toBe(0);
    component.selectModuleFilter('all');
    expect(component.selectedModule()).toBe('all');
  });

  it('should handle onModuleChange', () => {
    spyOn(component, 'selectModuleFilter');
    component.onModuleChange('Equipes');
    expect(component.selectModuleFilter).toHaveBeenCalledWith('Equipes');
  });

  it('should paginate forward and backward', () => {
    const manyLogs = Array.from({ length: 20 }, (_, i) => ({
      id: i,
      module: 'Sujets',
      action: 'Create',
      user: 'User ' + i,
      role: 'admin',
      date: '2026-07-15',
      time: '10:00',
      oldStatus: '—',
      newStatus: '—',
      comment: '',
      summary: '',
      moduleColor: '#3b82f6',
      moduleBg: 'rgba(59,130,246,0.1)',
      moduleBgSolid: '#3b82f6',
      oldValuesRaw: null,
      newValuesRaw: null,
      metadataRaw: null,
    }));
    component.allLogs.set(manyLogs);
    component.nextPage();
    expect(component.viewPage()).toBe(1);
    component.prevPage();
    expect(component.viewPage()).toBe(0);
  });

  it('should not go to first when already first', () => {
    component.prevPage();
    expect(component.viewPage()).toBe(0);
  });

  it('should go to page', () => {
    const manyLogs = Array.from({ length: 20 }, (_, i) => ({
      id: i, module: 'Sujets', action: 'Create', user: 'U', role: 'admin',
      date: '2026-07-15', time: '10:00', oldStatus: '—', newStatus: '—',
      comment: '', summary: '', moduleColor: '#3b82f6', moduleBg: '', moduleBgSolid: '#3b82f6',
      oldValuesRaw: null, newValuesRaw: null, metadataRaw: null,
    }));
    component.allLogs.set(manyLogs);
    component.goToPage(1);
    expect(component.viewPage()).toBe(1);
    component.goToPage(0);
    expect(component.viewPage()).toBe(0);
    component.goToPage(-1);
    expect(component.viewPage()).toBe(0);
    component.goToPage(999);
    expect(component.viewPage()).toBe(0);
    component.goToPage(1);
    component.goToPage(1);
    expect(component.viewPage()).toBe(1);
  });

  it('should open and close details', () => {
    const log = component.allLogs()[0];
    component.openDetails(log);
    expect(component.selectedLog()).toBe(log);
    expect(component.selectedLogOldKeys().length).toBeGreaterThan(0);
    component.closeDetails();
    expect(component.selectedLog()).toBeNull();
  });

  it('should format json keys', () => {
    const result = component.formatJsonKeys({ key1: 'value1', key2: { nested: true } });
    expect(result.length).toBe(2);
    expect(component.formatJsonKeys(null)).toEqual([]);
  });

  it('should load more', () => {
    component.allLogs.set([]);
    component.loadMore();
    expect(component.apiPage()).toBe(1);
    expect(historiqueService.search).toHaveBeenCalledTimes(2);
  });

  it('should handle loadLogs error', () => {
    historiqueService.search.and.returnValue(throwError(() => new Error('fail')));
    component.allLogs.set([]);
    component.loadLogs();
    expect(component.error()).toContain('Impossible');
  });

  it('should handle nextPage loading more when last', () => {
    historiqueService.search.and.returnValue(of({
      content: [], totalElements: 0, totalPages: 0, page: 0, size: 100, first: true, last: false,
    }));
    component.allLogs.set([]);
    component.hasMore.set(true);
    component.nextPage();
    expect(historiqueService.search).toHaveBeenCalled();
  });

  it('should not load more when already loading', () => {
    component.loading.set(true);
    component.hasMore.set(true);
    component.allLogs.set([]);
    component.nextPage();
    expect(historiqueService.search).toHaveBeenCalledTimes(1);
  });

  it('should toggle filter', () => {
    const event = new Event('click');
    component.toggleFilter('module', event);
    expect(component.openFilter()).toBe('module');
    component.toggleFilter('module', event);
    expect(component.openFilter()).toBeNull();
  });

  it('should close filters on outside click', () => {
    component.openFilter.set('module');
    component.closeFiltersOnOutsideClick();
    expect(component.openFilter()).toBeNull();
  });

  it('should get moduleFilterLabel', () => {
    expect(component.moduleFilterLabel).toBe('Tous les modules');
    component.selectedModule.set('Sujets');
    expect(component.moduleFilterLabel).toBe('Sujets');
  });

  it('should format date', () => {
    const result = component.formatDate('2026-07-15');
    expect(result).toContain('15');
  });

  it('should get module dot color', () => {
    expect(component.getModuleDotColor('Sujets')).toBeTruthy();
    expect(component.getModuleDotColor('UNKNOWN')).toBe('#64748b');
  });

  it('should get action icon', () => {
    const result = component.getActionIcon('Validation');
    expect(result).toBeTruthy();
    const result2 = component.getActionIcon('Refus');
    expect(result2).toBeTruthy();
    const result3 = component.getActionIcon('Creation');
    expect(result3).toBeTruthy();
    const result4 = component.getActionIcon('Suppression');
    expect(result4).toBeTruthy();
    const result5 = component.getActionIcon('Activation');
    expect(result5).toBeTruthy();
    const result6 = component.getActionIcon('Decision GO');
    expect(result6).toBeTruthy();
    const result7 = component.getActionIcon('Affiliation');
    expect(result7).toBeTruthy();
    const result8 = component.getActionIcon('Designeation chef');
    expect(result8).toBeTruthy();
    const result9 = component.getActionIcon('Televersement');
    expect(result9).toBeTruthy();
    const result10 = component.getActionIcon('UNKNOWN');
    expect(result10).toBeTruthy();
  });

  it('should get module icon', () => {
    const modules = ['Sujets', 'Equipes', 'Candidatures', 'Industrialisation', 'Affiliation', 'Utilisateurs', 'Catalogue', 'Evaluation', 'Unknown'];
    modules.forEach(m => {
      expect(component.getModuleIcon(m)).toBeTruthy();
    });
  });

  it('should export csv', () => {
    spyOn(document, 'createElement').and.callFake((tag: string) => {
      if (tag === 'a') {
        return { href: '', download: '', click: jasmine.createSpy('click') } as any;
      }
      return document.createElement.call(document, tag);
    });
    spyOn(URL, 'createObjectURL').and.returnValue('blob:mock');
    spyOn(URL, 'revokeObjectURL');
    component.exportCsv();
    expect(URL.createObjectURL).toHaveBeenCalled();
  });

  it('should compute stats', () => {
    const stats = component.stats();
    expect(stats.total).toBe(1);
  });

  it('should compute statsCards', () => {
    expect(component.statsCards().length).toBe(4);
  });

  it('should compute first and last', () => {
    expect(component.first()).toBeTrue();
    expect(component.last()).toBeTrue();
  });

  it('should handle mapEntry with invalid JSON', () => {
    historiqueService.search.and.returnValue(of({
      content: [{
        ...mockEntry,
        oldValues: 'not-json',
        newValues: 'not-json',
        metadata: 'not-json',
      }],
      totalElements: 1, totalPages: 1, page: 0, size: 100, first: true, last: true,
    }));
    component.allLogs.set([]);
    component.loadLogs();
    expect(component.allLogs().length).toBe(1);
  });

  it('should handle mapEntry with unknown entityType', () => {
    historiqueService.search.and.returnValue(of({
      content: [{ ...mockEntry, entityType: 'UNKNOWN_ENTITY', action: 'UNKNOWN_ACTION' }],
      totalElements: 1, totalPages: 1, page: 0, size: 100, first: true, last: true,
    }));
    component.allLogs.set([]);
    component.loadLogs();
    expect(component.allLogs().length).toBe(0);
  });

  it('should filter out entries with non-MODULE_NAMES modules', () => {
    historiqueService.search.and.returnValue(of({
      content: [{ ...mockEntry, entityType: 'NOT_IN_MODULE_NAMES' }],
      totalElements: 1, totalPages: 1, page: 0, size: 100, first: true, last: true,
    }));
    component.allLogs.set([]);
    component.loadLogs();
    expect(component.allLogs().length).toBe(0);
  });

  it('should handle mapEntry with null oldValues/newValues/metadata', () => {
    historiqueService.search.and.returnValue(of({
      content: [{ ...mockEntry, oldValues: null, newValues: null, metadata: null }],
      totalElements: 1, totalPages: 1, page: 0, size: 100, first: true, last: true,
    }));
    component.allLogs.set([]);
    component.loadLogs();
    const log = component.allLogs()[0];
    expect(log.oldValuesRaw).toBeNull();
    expect(log.newValuesRaw).toBeNull();
    expect(log.metadataRaw).toBeNull();
  });
});
