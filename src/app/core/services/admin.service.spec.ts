import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { AdminService } from './admin.service';

describe('AdminService', () => {
  let service: AdminService;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(AdminService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('should getSujetById', () => {
    const mock = { id: 1, titre: 'Test' } as any;
    service.getSujetById(1).subscribe(result => expect(result).toEqual(mock));
    const req = http.expectOne(r => r.url.includes('/admin/sujet-projets/1'));
    expect(req.request.method).toBe('GET');
    req.flush(mock);
  });

  it('should deleteSujet', () => {
    service.deleteSujet(1).subscribe();
    const req = http.expectOne(r => r.url.includes('/admin/sujet-projets/1'));
    expect(req.request.method).toBe('DELETE');
    req.flush({ message: 'ok', timestamp: '' });
  });

  it('should createUser', () => {
    const reqBody = { nom: 'Test', prenom: 'User', email: 't@t.com', password: 'pass', role: 'ROLE_ADMIN', enabled: true };
    service.createUser(reqBody as any).subscribe();
    const req = http.expectOne(r => r.url.includes('/admin/users'));
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual(reqBody);
    req.flush({ id: 1, ...reqBody });
  });

  it('should getUsers', () => {
    service.getUsers(0, 10, 'search').subscribe();
    const req = http.expectOne(r => r.url.includes('/admin/users'));
    expect(req.request.params.get('page')).toBe('0');
    expect(req.request.params.get('size')).toBe('10');
    expect(req.request.params.get('search')).toBe('search');
    req.flush({ content: [], totalElements: 0, totalPages: 0, page: 0, size: 10, first: true, last: true });
  });

  it('should getUsers without search', () => {
    service.getUsers(0, 10).subscribe();
    const req = http.expectOne(r => r.url.includes('/admin/users'));
    expect(req.request.params.has('search')).toBeFalse();
    req.flush({ content: [], totalElements: 0, totalPages: 0, page: 0, size: 10, first: true, last: true });
  });

  it('should updateUser', () => {
    service.updateUser(1, { nom: 'New' } as any).subscribe();
    const req = http.expectOne(r => r.url.includes('/admin/users/1'));
    expect(req.request.method).toBe('PUT');
    req.flush({ id: 1 });
  });

  it('should deleteUser', () => {
    service.deleteUser(1).subscribe();
    const req = http.expectOne(r => r.url.includes('/admin/users/1'));
    expect(req.request.method).toBe('DELETE');
    req.flush({ message: 'deleted', timestamp: '' });
  });

  it('should chercherEncadrants', () => {
    service.chercherEncadrants('search', 1, 5).subscribe();
    const req = http.expectOne(r => r.url.includes('/admin/encadrants'));
    expect(req.request.params.get('search')).toBe('search');
    expect(req.request.params.get('page')).toBe('1');
    req.flush({ content: [], totalElements: 0, totalPages: 0, page: 1, size: 5, first: false, last: true });
  });

  it('should chercherEncadrants without search', () => {
    service.chercherEncadrants('  ').subscribe();
    const req = http.expectOne(r => r.url.includes('/admin/encadrants'));
    expect(req.request.params.has('search')).toBeFalse();
    req.flush({ content: [], totalElements: 0, totalPages: 0, page: 0, size: 6, first: true, last: true });
  });

  it('should createSujet', () => {
    service.createSujet({ sujet: { titre: 'T' } } as any).subscribe();
    const req = http.expectOne(r => r.url.includes('/admin/sujet-projets'));
    expect(req.request.method).toBe('POST');
    req.flush({ id: 1 });
  });

  it('should getSujets with all filters', () => {
    service.getSujets(0, 10, 'search', 'PFE', 'VALIDE').subscribe();
    const req = http.expectOne(r => r.url.includes('/admin/sujet-projets'));
    expect(req.request.params.get('search')).toBe('search');
    expect(req.request.params.get('categorie')).toBe('PFE');
    expect(req.request.params.get('statut')).toBe('VALIDE');
    req.flush({ content: [], totalElements: 0, totalPages: 0, page: 0, size: 10, first: true, last: true });
  });

  it('should getSujets without filters', () => {
    service.getSujets(0, 10).subscribe();
    const req = http.expectOne(r => r.url.includes('/admin/sujet-projets'));
    expect(req.request.params.has('search')).toBeFalse();
    expect(req.request.params.has('categorie')).toBeFalse();
    expect(req.request.params.has('statut')).toBeFalse();
    req.flush({ content: [], totalElements: 0, totalPages: 0, page: 0, size: 10, first: true, last: true });
  });

  it('should getDemandes', () => {
    service.getDemandes(0, 10, 'search', 'PFE').subscribe();
    const req = http.expectOne(r => r.url.includes('/admin/sujet-projets/demandes'));
    expect(req.request.params.get('search')).toBe('search');
    expect(req.request.params.get('categorie')).toBe('PFE');
    req.flush({ content: [], totalElements: 0, totalPages: 0, page: 0, size: 10, first: true, last: true });
  });

  it('should getDemandes without filters', () => {
    service.getDemandes(0, 10).subscribe();
    const req = http.expectOne(r => r.url.includes('/admin/sujet-projets/demandes'));
    expect(req.request.params.has('search')).toBeFalse();
    req.flush({ content: [], totalElements: 0, totalPages: 0, page: 0, size: 10, first: true, last: true });
  });

  it('should getSujetsDisponibles', () => {
    service.getSujetsDisponibles(0, 10, 'search', 'RDI').subscribe();
    const req = http.expectOne(r => r.url.includes('/admin/sujet-projets/disponibles'));
    expect(req.request.params.get('search')).toBe('search');
    expect(req.request.params.get('categorie')).toBe('RDI');
    req.flush({ content: [], totalElements: 0, totalPages: 0, page: 0, size: 10, first: true, last: true });
  });

  it('should getSujetsDisponibles without filters', () => {
    service.getSujetsDisponibles(0, 10).subscribe();
    const req = http.expectOne(r => r.url.includes('/admin/sujet-projets/disponibles'));
    expect(req.request.params.has('search')).toBeFalse();
    req.flush({ content: [], totalElements: 0, totalPages: 0, page: 0, size: 10, first: true, last: true });
  });

  it('should validerSujet', () => {
    service.validerSujet(1).subscribe();
    const req = http.expectOne(r => r.url.includes('/admin/sujet-projets/1/valider'));
    expect(req.request.method).toBe('POST');
    req.flush({ id: 1 });
  });

  it('should invaliderSujet', () => {
    service.invaliderSujet(1, 'motif').subscribe();
    const req = http.expectOne(r => r.url.includes('/admin/sujet-projets/1/invalider'));
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual({ motif: 'motif' });
    req.flush({ id: 1 });
  });

  it('should updateSujet', () => {
    service.updateSujet(1, { titre: 'New' } as any).subscribe();
    const req = http.expectOne(r => r.url.includes('/admin/sujet-projets/1'));
    expect(req.request.method).toBe('PUT');
    req.flush({ id: 1 });
  });
});
