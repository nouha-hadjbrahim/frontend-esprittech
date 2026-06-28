import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { EquipeDomaine } from '../models/equipe-domaine.model';
import { Page } from '../models/page.model';
import { EquipeDomaineService } from './equipe-domaine.service';

const API = 'http://localhost:8080/api/equipes/admin/domaines';

describe('EquipeDomaineService', () => {
  let service: EquipeDomaineService;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(EquipeDomaineService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('should get a page of domaines', () => {
    const page: Page<EquipeDomaine> = {
      content: [{ id: 1, nom: 'Informatique', dateCreation: '2025-01-01' }],
      page: 0, size: 12, totalElements: 1, totalPages: 1, first: true, last: true,
    };
    service.getPage(0, 12, 'test').subscribe((res) => expect(res).toEqual(page));
    const req = http.expectOne((r) => r.url === API);
    expect(req.request.method).toBe('GET');
    expect(req.request.params.get('page')).toBe('0');
    expect(req.request.params.get('size')).toBe('12');
    expect(req.request.params.get('search')).toBe('test');
    req.flush(page);
  });

  it('should get page without search param when empty', () => {
    const page: Page<EquipeDomaine> = {
      content: [], page: 0, size: 12, totalElements: 0, totalPages: 0, first: true, last: true,
    };
    service.getPage().subscribe();
    const req = http.expectOne((r) => r.url.startsWith(API) && r.method === 'GET');
    expect(req.request.params.has('search')).toBeFalse();
    req.flush(page);
  });

  it('should get all domaines', () => {
    const list: EquipeDomaine[] = [{ id: 1, nom: 'IA', dateCreation: '2025-01-01' }];
    service.getAll().subscribe((res) => expect(res).toEqual(list));
    const req = http.expectOne(`${API}/all`);
    expect(req.request.method).toBe('GET');
    req.flush(list);
  });

  it('should get count of domaines', () => {
    service.getCount().subscribe((res) => expect(res).toBe(5));
    const req = http.expectOne(`${API}/count`);
    expect(req.request.method).toBe('GET');
    req.flush(5);
  });

  it('should create a domaine', () => {
    const created: EquipeDomaine = { id: 3, nom: 'Robotique', dateCreation: '2025-06-01' };
    service.create('Robotique').subscribe((res) => expect(res).toEqual(created));
    const req = http.expectOne(API);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual({ nom: 'Robotique' });
    req.flush(created);
  });

  it('should update a domaine', () => {
    const updated: EquipeDomaine = { id: 3, nom: 'Robotique Avancée', dateCreation: '2025-01-01' };
    service.update(3, 'Robotique Avancée').subscribe((res) => expect(res).toEqual(updated));
    const req = http.expectOne(`${API}/3`);
    expect(req.request.method).toBe('PUT');
    expect(req.request.body).toEqual({ nom: 'Robotique Avancée' });
    req.flush(updated);
  });

  it('should delete a domaine', () => {
    service.delete(3).subscribe((res) => expect(res).toBeNull());
    const req = http.expectOne(`${API}/3`);
    expect(req.request.method).toBe('DELETE');
    req.flush(null);
  });
});
