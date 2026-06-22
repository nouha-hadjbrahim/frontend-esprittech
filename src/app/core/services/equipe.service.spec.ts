import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { Equipe } from '../models/equipe.model';
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
});
