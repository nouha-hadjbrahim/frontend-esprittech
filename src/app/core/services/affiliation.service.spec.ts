import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { environment } from '../../../environments/environment';
import { AffiliationEnseignantResponse } from '../models/affiliation-request.model';
import { AffiliationService } from './affiliation.service';

const API = `${environment.apiUrl}/equipes`;

describe('AffiliationService', () => {
  let service: AffiliationService;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(AffiliationService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('should get all affiliations', () => {
    const affiliations = [{ id: 1, statut: 'EN_ATTENTE' } as AffiliationEnseignantResponse];
    service.getAll().subscribe((res) => expect(res).toEqual(affiliations));
    const req = http.expectOne(`${API}/affiliations`);
    expect(req.request.method).toBe('GET');
    req.flush(affiliations);
  });

  it('should get affiliations by equipe', () => {
    const affiliations = [{ id: 2, equipeId: 3 } as AffiliationEnseignantResponse];
    service.getByEquipe(3).subscribe((res) => expect(res).toEqual(affiliations));
    const req = http.expectOne(`${API}/3/affiliations`);
    expect(req.request.method).toBe('GET');
    req.flush(affiliations);
  });

  it('should get my affiliation requests', () => {
    const affiliations = [{ id: 4, statut: 'ACCEPTEE' } as AffiliationEnseignantResponse];
    service.getMesDemandes().subscribe((res) => expect(res).toEqual(affiliations));
    const req = http.expectOne(`${API}/affiliations/mine`);
    expect(req.request.method).toBe('GET');
    req.flush(affiliations);
  });

  it('should create an affiliation request', () => {
    const created = { id: 5, statut: 'EN_ATTENTE' } as AffiliationEnseignantResponse;
    service.create(2).subscribe((res) => expect(res).toEqual(created));
    const req = http.expectOne(`${API}/2/affiliations`);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual({});
    req.flush(created);
  });

  it('should traiter an affiliation with motifDecision', () => {
    const updated = { id: 6, statut: 'ACCEPTEE', motifDecision: 'Approved' } as unknown as AffiliationEnseignantResponse;
    service.traiter(6, 3, 'ACCEPTEE', 'Approved').subscribe((res) => expect(res).toEqual(updated));
    const req = http.expectOne(`${API}/3/affiliations/6`);
    expect(req.request.method).toBe('PUT');
    expect(req.request.body).toEqual({ statut: 'ACCEPTEE', motifDecision: 'Approved' });
    req.flush(updated);
  });

  it('should traiter an affiliation without motifDecision', () => {
    const updated = { id: 7, statut: 'REFUSEE', motifDecision: null } as unknown as AffiliationEnseignantResponse;
    service.traiter(7, 4, 'REFUSEE').subscribe((res) => expect(res).toEqual(updated));
    const req = http.expectOne(`${API}/4/affiliations/7`);
    expect(req.request.method).toBe('PUT');
    expect(req.request.body).toEqual({ statut: 'REFUSEE', motifDecision: undefined });
    req.flush(updated);
  });
});
