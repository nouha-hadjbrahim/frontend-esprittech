import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { Equipe } from '../models/equipe.model';
import { Page } from '../models/page.model';
import { User } from '../models/user.model';
import { AdminService, MessageResponse } from './admin.service';

const API = 'http://localhost:8080/api/admin';

const USER: User = {
  id: 5,
  nom: 'Ben',
  prenom: 'Ali',
  email: 'ali@esprit.tn',
  identifiant: 'AB5',
  role: 'ROLE_ETUDIANT',
  typeUtilisateur: 'ETUDIANT',
  departement: null,
  enabled: true,
  createdAt: '2025-01-01T00:00:00Z',
};

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

  it('should import a CSV referential as multipart form data', () => {
    const file = new File(['a;b'], 'ref.csv', { type: 'text/csv' });
    const message: MessageResponse = { message: 'ok', timestamp: 'now' };
    service.importCsv(file).subscribe((res) => expect(res).toEqual(message));

    const req = http.expectOne(`${API}/import-referentiel`);
    expect(req.request.method).toBe('POST');
    expect(req.request.body instanceof FormData).toBeTrue();
    expect((req.request.body as FormData).get('file')).toBe(file);
    req.flush(message);
  });

  it('should create an equipe', () => {
    const equipe = { id: 1, nom: 'E1' } as Equipe;
    service.createEquipe({ nom: 'E1', domaine: 'Info', chefId: 2 }).subscribe((res) => expect(res).toEqual(equipe));
    const req = http.expectOne(`${API}/equipes`);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual({ nom: 'E1', domaine: 'Info', chefId: 2 });
    req.flush(equipe);
  });

  it('should assign a chef to an equipe', () => {
    service.assignChef(7, 9).subscribe();
    const req = http.expectOne(`${API}/equipes/7/chef`);
    expect(req.request.method).toBe('PUT');
    expect(req.request.body).toEqual({ chefId: 9 });
    req.flush({ id: 7 } as Equipe);
  });

  it('should create a user', () => {
    service
      .createUser({ nom: 'N', prenom: 'P', email: 'e@esprit.tn', identifiant: 'I', password: 'pw', role: 'ROLE_ETUDIANT', enabled: true })
      .subscribe((res) => expect(res).toEqual(USER));
    const req = http.expectOne(`${API}/users`);
    expect(req.request.method).toBe('POST');
    req.flush(USER);
  });

  it('should list users without a search term', () => {
    const page: Page<User> = {
      content: [USER], page: 0, size: 8, totalElements: 1, totalPages: 1, first: true, last: true,
    };
    service.getUsers(0, 8).subscribe((res) => expect(res).toEqual(page));
    const req = http.expectOne((r) => r.url === `${API}/users`);
    expect(req.request.params.get('page')).toBe('0');
    expect(req.request.params.get('size')).toBe('8');
    expect(req.request.params.has('search')).toBeFalse();
    req.flush(page);
  });

  it('should include a trimmed search term when provided', () => {
    service.getUsers(1, 10, '  ali  ').subscribe();
    const req = http.expectOne((r) => r.url === `${API}/users`);
    expect(req.request.params.get('search')).toBe('ali');
    req.flush({ content: [], page: 1, size: 10, totalElements: 0, totalPages: 0, first: false, last: true });
  });

  it('should ignore a blank search term', () => {
    service.getUsers(0, 8, '   ').subscribe();
    const req = http.expectOne((r) => r.url === `${API}/users`);
    expect(req.request.params.has('search')).toBeFalse();
    req.flush({ content: [], page: 0, size: 8, totalElements: 0, totalPages: 0, first: true, last: true });
  });

  it('should update a user', () => {
    service
      .updateUser(5, { nom: 'N', prenom: 'P', email: 'e@esprit.tn', role: 'ROLE_ADMIN', enabled: false })
      .subscribe((res) => expect(res).toEqual(USER));
    const req = http.expectOne(`${API}/users/5`);
    expect(req.request.method).toBe('PUT');
    req.flush(USER);
  });

  it('should delete a user', () => {
    const message: MessageResponse = { message: 'deleted', timestamp: 'now' };
    service.deleteUser(5).subscribe((res) => expect(res).toEqual(message));
    const req = http.expectOne(`${API}/users/5`);
    expect(req.request.method).toBe('DELETE');
    req.flush(message);
  });
});
