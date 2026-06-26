import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { CreateEquipePayload, CreateEquipeRequest, Equipe } from '../models/equipe.model';
import { Page } from '../models/page.model';
import { User } from '../models/user.model';
import { EquipeService } from './equipe.service';

const API = 'http://localhost:8080/api/equipes';

describe('EquipeService', () => {
  let service: EquipeService;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(EquipeService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('should get all equipes', () => {
    const equipes = [{ id: 1, nom: 'E1' } as Equipe];
    service.getAll().subscribe((res) => expect(res).toEqual(equipes));
    const req = http.expectOne(API);
    expect(req.request.method).toBe('GET');
    req.flush(equipes);
  });

  it('should get an equipe by id', () => {
    const equipe = { id: 3, nom: 'E3' } as Equipe;
    service.getById(3).subscribe((res) => expect(res).toEqual(equipe));
    const req = http.expectOne(`${API}/3`);
    expect(req.request.method).toBe('GET');
    req.flush(equipe);
  });

  it('should get the members of an equipe', () => {
    const membres = [{ id: 1 } as User];
    service.getMembres(3).subscribe((res) => expect(res).toEqual(membres));
    const req = http.expectOne(`${API}/3/membres`);
    expect(req.request.method).toBe('GET');
    req.flush(membres);
  });

  it('should create an equipe', () => {
    const payload: CreateEquipePayload = {
      nom: 'New Team', description: null, domaine: 'AI',
      chefId: 10, memberIds: [20, 21],
    };
    const created = { id: 1, ...payload } as unknown as Equipe;
    service.creer(payload).subscribe((res) => expect(res).toEqual(created));
    const req = http.expectOne(API);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual(payload);
    req.flush(created);
  });

  it('should update an equipe', () => {
    const payload = { nom: 'Updated' };
    const updated = { id: 1, nom: 'Updated' } as Equipe;
    service.modifier(1, payload).subscribe((res) => expect(res).toEqual(updated));
    const req = http.expectOne(`${API}/1`);
    expect(req.request.method).toBe('PUT');
    req.flush(updated);
  });

  it('should delete an equipe', () => {
    service.supprimer(1).subscribe((res) => expect(res).toBeNull());
    const req = http.expectOne(`${API}/1`);
    expect(req.request.method).toBe('DELETE');
    req.flush(null);
  });

  it('should assign a chef', () => {
    const equipe = { id: 1, nom: 'E1', chef: { id: 5 } } as unknown as Equipe;
    service.assignerChef(1, 5).subscribe((res) => expect(res).toEqual(equipe));
    const req = http.expectOne(`${API}/1/chef`);
    expect(req.request.method).toBe('PUT');
    expect(req.request.body).toEqual({ chefId: 5 });
    req.flush(equipe);
  });

  it('should add members', () => {
    const equipe = { id: 1, nom: 'E1' } as Equipe;
    service.ajouterMembres(1, [10, 20]).subscribe((res) => expect(res).toEqual(equipe));
    const req = http.expectOne(`${API}/1/membres`);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual({ memberIds: [10, 20] });
    req.flush(equipe);
  });

  it('should remove a member', () => {
    const equipe = { id: 1, nom: 'E1' } as Equipe;
    service.retirerMembre(1, 5).subscribe((res) => expect(res).toEqual(equipe));
    const req = http.expectOne(`${API}/1/membres/5`);
    expect(req.request.method).toBe('DELETE');
    req.flush(equipe);
  });

  it('should create an equipe via CreateEquipeRequest', () => {
    const request: CreateEquipeRequest = { nom: 'E1', domaine: 'Info', chefId: 2 };
    const equipe = { id: 1, nom: 'E1' } as Equipe;
    service.createEquipe(request).subscribe((res) => expect(res).toEqual(equipe));
    const req = http.expectOne(API);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual(request);
    req.flush(equipe);
  });

  it('should assign a chef via assignChef', () => {
    const equipe = { id: 7, nom: 'E1' } as Equipe;
    service.assignChef(7, 9).subscribe((res) => expect(res).toEqual(equipe));
    const req = http.expectOne(`${API}/7/chef`);
    expect(req.request.method).toBe('PUT');
    expect(req.request.body).toEqual({ chefId: 9 });
    req.flush(equipe);
  });

  it('should get eligible users', () => {
    const page: Page<User> = {
      content: [{ id: 1 } as User], page: 0, size: 6, totalElements: 1, totalPages: 1, first: true, last: true,
    };
    service.chercherUtilisateursEligibles('ali', null, 'CHEF').subscribe((res) => expect(res).toEqual(page));
    const req = http.expectOne((r) => r.url === `${API}/users/eligible`);
    expect(req.request.method).toBe('GET');
    expect(req.request.params.get('search')).toBe('ali');
    expect(req.request.params.get('type')).toBe('CHEF');
    expect(req.request.params.get('equipeId')).toBeNull();
    req.flush(page);
  });

  it('should include equipeId param when provided in eligible users', () => {
    service.chercherUtilisateursEligibles('', 3, 'MEMBER', 0, 100).subscribe();
    const req = http.expectOne((r) => r.url === `${API}/users/eligible`);
    expect(req.request.params.get('equipeId')).toBe('3');
    expect(req.request.params.get('type')).toBe('MEMBER');
    expect(req.request.params.get('size')).toBe('100');
    req.flush({ content: [], page: 0, size: 100, totalElements: 0, totalPages: 0, first: true, last: true });
  });
});
