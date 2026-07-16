import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { Page } from '../models/page.model';
import { User } from '../models/user.model';
import { AdminService, MessageResponse } from './admin.service';

const API = 'http://localhost:8080/api/admin';

const USER: User = {
  id: 5,
  nom: 'Ben',
  prenom: 'Ali',
  email: 'ali@esprit.tn',
  role: 'ROLE_ETUDIANT',
  typeUtilisateur: 'ETUDIANT',
  departement: null,
  enabled: true,
  createdAt: '2025-01-01T00:00:00Z',
  isAffilieToEquipe: false,
  equipeId: null,
  equipeNom: null,
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

  it('should create a user', () => {
    service
      .createUser({ nom: 'N', prenom: 'P', email: 'e@esprit.tn', password: 'pw', role: 'ROLE_ETUDIANT', enabled: true })
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
