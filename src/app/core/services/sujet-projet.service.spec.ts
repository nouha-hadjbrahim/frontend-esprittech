import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { SujetProjetService } from './sujet-projet.service';

describe('SujetProjetService', () => {
  let service: SujetProjetService;
  let httpMock: HttpTestingController;

  const BASE = 'http://localhost:8080/api/sujet-projets';

  const mockSujet: any = {
    id: 1, titre: 'Sujet IA', categorie: 'STAGE_INGENIEUR',
    statut: 'VALIDE', encadrantId: 10, encadrantNom: 'Dr. Martin',
    domaines: ['IA'], technologies: ['Python'], capaciteAccueil: 2,
    dateCreation: '2026-06-01T00:00:00Z', dateSoumission: null,
  };

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [SujetProjetService, provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(SujetProjetService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpMock.verify());

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  // ── CRUD ──────────────────────────────────────────────────────────

  it('creerSujet should POST to base URL with request body', () => {
    const req: any = { titre: 'Sujet IA', categorie: 'STAGE_INGENIEUR' };
    service.creerSujet(req).subscribe((res) => expect(res).toEqual(mockSujet));
    const httpReq = httpMock.expectOne(BASE);
    expect(httpReq.request.method).toBe('POST');
    expect(httpReq.request.body).toEqual(req);
    httpReq.flush(mockSujet);
  });

  it('modifierSujet should PUT to correct URL', () => {
    const req: any = { titre: 'Sujet modifié' };
    service.modifierSujet(1, req).subscribe((res) => expect(res).toEqual(mockSujet));
    const httpReq = httpMock.expectOne(`${BASE}/1`);
    expect(httpReq.request.method).toBe('PUT');
    expect(httpReq.request.body).toEqual(req);
    httpReq.flush(mockSujet);
  });

  it('supprimerSujet should DELETE to correct URL', () => {
    service.supprimerSujet(1).subscribe();
    const httpReq = httpMock.expectOne(`${BASE}/1`);
    expect(httpReq.request.method).toBe('DELETE');
    httpReq.flush(null);
  });

  // ── Reads ──────────────────────────────────────────────────────────

  it('getMesSujets should GET without params when none provided', () => {
    service.getMesSujets().subscribe();
    const httpReq = httpMock.expectOne(`${BASE}/mes-sujets`);
    expect(httpReq.request.method).toBe('GET');
    expect(httpReq.request.params.keys().length).toBe(0);
    httpReq.flush([mockSujet]);
  });

  it('getMesSujets should append categorie param when provided', () => {
    service.getMesSujets('STAGE_INGENIEUR').subscribe();
    const httpReq = httpMock.expectOne(
      (req) => req.url === `${BASE}/mes-sujets` && req.params.has('categorie'),
    );
    expect(httpReq.request.params.get('categorie')).toBe('STAGE_INGENIEUR');
    httpReq.flush([mockSujet]);
  });

  it('getMesSujets should append statut param when provided', () => {
    service.getMesSujets(undefined, 'VALIDE').subscribe();
    const httpReq = httpMock.expectOne(
      (req) => req.url === `${BASE}/mes-sujets` && req.params.has('statut'),
    );
    expect(httpReq.request.params.get('statut')).toBe('VALIDE');
    httpReq.flush([]);
  });

  it('getMesSujets should append both params when provided', () => {
    service.getMesSujets('PFE', 'VALIDE').subscribe();
    const httpReq = httpMock.expectOne(
      (req) =>
        req.url === `${BASE}/mes-sujets` &&
        req.params.get('categorie') === 'PFE' &&
        req.params.get('statut') === 'VALIDE',
    );
    expect(httpReq.request.method).toBe('GET');
    expect(httpReq.request.params.get('categorie')).toBe('PFE');
    expect(httpReq.request.params.get('statut')).toBe('VALIDE');
    httpReq.flush([]);
  });

  it('getSujetsDisponibles should GET without params when none provided', () => {
    service.getSujetsDisponibles().subscribe();
    const httpReq = httpMock.expectOne(`${BASE}/disponibles`);
    expect(httpReq.request.method).toBe('GET');
    httpReq.flush([mockSujet]);
  });

  it('getSujetsDisponibles should append categorie param when provided', () => {
    service.getSujetsDisponibles('PFE').subscribe();
    const httpReq = httpMock.expectOne(
      (req) => req.url === `${BASE}/disponibles` && req.params.get('categorie') === 'PFE',
    );
    expect(httpReq.request.method).toBe('GET');
    expect(httpReq.request.params.get('categorie')).toBe('PFE');
    httpReq.flush([]);
  });

  it('getSujetById should GET to correct URL', () => {
    service.getSujetById(1).subscribe((res) => expect(res).toEqual(mockSujet));
    const httpReq = httpMock.expectOne(`${BASE}/1`);
    expect(httpReq.request.method).toBe('GET');
    httpReq.flush(mockSujet);
  });

  it('getSujetsPourCandidatures should GET from admin endpoint', () => {
    service.getSujetsPourCandidatures().subscribe();
    const httpReq = httpMock.expectOne(`${BASE}/admin/candidatures`);
    expect(httpReq.request.method).toBe('GET');
    httpReq.flush([]);
  });

  it('getSujetsEnAttenteValidation should GET from correct URL', () => {
    service.getSujetsEnAttenteValidation().subscribe();
    const httpReq = httpMock.expectOne(`${BASE}/en-attente-validation`);
    expect(httpReq.request.method).toBe('GET');
    httpReq.flush([]);
  });

  // ── Validation ────────────────────────────────────────────────────

  it('validerSujet should POST to correct URL with empty body', () => {
    service.validerSujet(1).subscribe();
    const httpReq = httpMock.expectOne(`${BASE}/1/valider`);
    expect(httpReq.request.method).toBe('POST');
    expect(httpReq.request.body).toEqual({});
    httpReq.flush(mockSujet);
  });

  it('invaliderSujet should POST motif to correct URL', () => {
    service.invaliderSujet(1, 'Hors périmètre').subscribe();
    const httpReq = httpMock.expectOne(`${BASE}/1/invalider`);
    expect(httpReq.request.method).toBe('POST');
    expect(httpReq.request.body).toEqual({ motif: 'Hors périmètre' });
    httpReq.flush(mockSujet);
  });

  // ── Suggestions ───────────────────────────────────────────────────

  it('getTechnologies should GET from correct URL', () => {
    service.getTechnologies().subscribe();
    const httpReq = httpMock.expectOne(`${BASE}/technologies`);
    expect(httpReq.request.method).toBe('GET');
    httpReq.flush(['Python', 'Angular']);
  });

  it('getPrerequisSuggestions should GET from correct URL', () => {
    service.getPrerequisSuggestions().subscribe();
    const httpReq = httpMock.expectOne(`${BASE}/suggestions/prerequis`);
    expect(httpReq.request.method).toBe('GET');
    httpReq.flush(['Java', 'SQL']);
  });

  it('getDomainesSuggestions should GET from correct URL', () => {
    service.getDomainesSuggestions().subscribe();
    const httpReq = httpMock.expectOne(`${BASE}/suggestions/domaines`);
    expect(httpReq.request.method).toBe('GET');
    httpReq.flush(['IA', 'Web']);
  });
});
