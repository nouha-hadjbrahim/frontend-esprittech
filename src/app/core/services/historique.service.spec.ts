import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { HistoriqueService } from './historique.service';

describe('HistoriqueService', () => {
  let service: HistoriqueService;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(HistoriqueService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('should search with default params', () => {
    service.search().subscribe();
    const req = http.expectOne(r => r.url.includes('/historique'));
    expect(req.request.method).toBe('GET');
    expect(req.request.params.get('page')).toBe('0');
    expect(req.request.params.get('size')).toBe('20');
    expect(req.request.params.get('sort')).toBe('createdAt,DESC');
    req.flush({ content: [], totalElements: 0, totalPages: 0, page: 0, size: 20, first: true, last: true });
  });

  it('should search with filters', () => {
    service.search({
      entityType: 'SUJET_PROJET',
      entityId: 5,
      action: 'CREATE',
      actorId: 10,
      dateFrom: '2026-01-01',
      dateTo: '2026-12-31',
    }, 1, 50, 'createdAt,ASC').subscribe();
    const req = http.expectOne(r => r.url.includes('/historique'));
    expect(req.request.params.get('entityType')).toBe('SUJET_PROJET');
    expect(req.request.params.get('entityId')).toBe('5');
    expect(req.request.params.get('action')).toBe('CREATE');
    expect(req.request.params.get('actorId')).toBe('10');
    expect(req.request.params.get('dateFrom')).toBe('2026-01-01');
    expect(req.request.params.get('dateTo')).toBe('2026-12-31');
    expect(req.request.params.get('page')).toBe('1');
    expect(req.request.params.get('size')).toBe('50');
    expect(req.request.params.get('sort')).toBe('createdAt,ASC');
    req.flush({ content: [], totalElements: 0, totalPages: 0, page: 1, size: 50, first: false, last: true });
  });

  it('should search with partial filters', () => {
    service.search({ entityType: 'USER' }).subscribe();
    const req = http.expectOne(r => r.url.includes('/historique'));
    expect(req.request.params.get('entityType')).toBe('USER');
    expect(req.request.params.has('entityId')).toBeFalse();
    expect(req.request.params.has('action')).toBeFalse();
    req.flush({ content: [], totalElements: 0, totalPages: 0, page: 0, size: 20, first: true, last: true });
  });

  it('should call findByProjet', () => {
    service.findByProjet(42).subscribe();
    const req = http.expectOne(r => r.url.includes('/historique/projet/42'));
    expect(req.request.method).toBe('GET');
    req.flush([]);
  });

  it('should call getBySujet with default filter', () => {
    service.getBySujet(1).subscribe();
    const req = http.expectOne(r => r.url.includes('/historique/sujet/1'));
    expect(req.request.method).toBe('GET');
    expect(req.request.params.get('filter')).toBe('TOUT');
    req.flush([]);
  });

  it('should call getBySujet with custom filter', () => {
    service.getBySujet(1, 'SUJET').subscribe();
    const req = http.expectOne(r => r.url.includes('/historique/sujet/1'));
    expect(req.request.params.get('filter')).toBe('SUJET');
    req.flush([]);
  });
});
