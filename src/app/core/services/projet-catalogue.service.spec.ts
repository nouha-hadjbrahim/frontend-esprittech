import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { ProjetCatalogueService } from './projet-catalogue.service';
import { ProjetCard, ProjetCatalogue, ProjetDetails } from '../models/projet-catalogue.model';

describe('ProjetCatalogueService', () => {
  let service: ProjetCatalogueService;
  let httpTesting: HttpTestingController;
  const API = 'http://localhost:8080/api';

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(ProjetCatalogueService);
    httpTesting = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpTesting.verify());

  const mockCard: ProjetCard = {
    id: 1, typeProjet: 'RDI', titre: 'Projet IA', description: 'Desc',
    statut: 'SOUMIS_EN_VALIDATION', score: 0, encadrantId: 1,
    encadrantNom: 'Jean Dupont', equipeId: 100, equipeNom: 'Equipe IA',
    dateDebut: '2026-01-01', dateFin: '2026-12-31', dateCreation: '2026-01-01T10:00:00',
    domaines: ['IA'], technologies: ['Spring'],
  };

  const mockCatalogue: ProjetCatalogue = {
    ...mockCard, objectifs: 'Obj', chefValidateurId: null,
    chefValidateurNom: null, motifRefus: null, dateValidation: null,
    prerequis: [],
  };

  const mockDetails: ProjetDetails = { ...mockCatalogue, encadrantEmail: 'jean@esprit.tn' };

  // ── Enseignant ────────────────────────────────────────────────────

  it('creerProjet sends POST /api/projets', () => {
    const request = {
      typeProjet: 'RDI' as const, titre: 'Projet', description: 'Desc longue',
      objectifs: 'Obj', dateDebut: '2026-01-01', dateFin: '2026-12-31',
      domainesIds: [1], technologiesIds: [1], prerequisIds: [],
    };
    service.creerProjet(request).subscribe(r => expect(r.titre).toBe('Projet IA'));
    const req = httpTesting.expectOne(`${API}/projets`);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual(request);
    req.flush(mockCatalogue);
  });

  it('mesProjets sends GET /api/projets/mes-projets', () => {
    service.mesProjets().subscribe(r => expect(r.length).toBe(1));
    const req = httpTesting.expectOne(`${API}/projets/mes-projets`);
    expect(req.request.method).toBe('GET');
    req.flush([mockCard]);
  });

  // ── Chef d'équipe ─────────────────────────────────────────────────

  it('projetsAValider sends GET /api/projets/a-valider', () => {
    service.projetsAValider().subscribe(r => expect(r.length).toBe(1));
    const req = httpTesting.expectOne(`${API}/projets/a-valider`);
    expect(req.request.method).toBe('GET');
    req.flush([mockCard]);
  });

  it('valider sends PUT /api/projets/{id}/valider', () => {
    service.valider(1).subscribe(r => expect(r).toBeTruthy());
    const req = httpTesting.expectOne(`${API}/projets/1/valider`);
    expect(req.request.method).toBe('PUT');
    expect(req.request.body).toEqual({});
    req.flush(mockCatalogue);
  });

  it('refuser sends PUT /api/projets/{id}/refuser with motif', () => {
    service.refuser(1, 'Incomplet').subscribe(r => expect(r).toBeTruthy());
    const req = httpTesting.expectOne(`${API}/projets/1/refuser`);
    expect(req.request.method).toBe('PUT');
    expect(req.request.body).toEqual({ motifRefus: 'Incomplet' });
    req.flush(mockCatalogue);
  });

  // ── Détails ───────────────────────────────────────────────────────

  it('detailsProjet sends GET /api/projets/{id}', () => {
    service.detailsProjet(1).subscribe(r => expect(r.encadrantEmail).toBe('jean@esprit.tn'));
    const req = httpTesting.expectOne(`${API}/projets/1`);
    expect(req.request.method).toBe('GET');
    req.flush(mockDetails);
  });

  it('detailsCatalogue sends GET /api/catalogue/{id}', () => {
    service.detailsCatalogue(1).subscribe(r => expect(r).toBeTruthy());
    const req = httpTesting.expectOne(`${API}/catalogue/1`);
    expect(req.request.method).toBe('GET');
    req.flush(mockDetails);
  });

  // ── Catalogue ─────────────────────────────────────────────────────

  it('catalogue without filters sends GET /api/catalogue', () => {
    service.catalogue().subscribe(r => expect(r.length).toBe(1));
    const req = httpTesting.expectOne(`${API}/catalogue`);
    expect(req.request.method).toBe('GET');
    req.flush([mockCard]);
  });

  it('catalogue with filters appends query params', () => {
    service.catalogue({ type: 'PFE', domaineId: 2, annee: 2026, search: 'spring' })
      .subscribe(r => expect(r).toBeTruthy());
    const req = httpTesting.expectOne(
      r => r.url === `${API}/catalogue` && r.params.get('type') === 'PFE'
        && r.params.get('domaineId') === '2' && r.params.get('annee') === '2026'
        && r.params.get('search') === 'spring',
    );
    expect(req.request.method).toBe('GET');
    req.flush([]);
  });

  it('catalogue trims search whitespace', () => {
    service.catalogue({ search: '  spring  ' }).subscribe();
    const req = httpTesting.expectOne(
      r => r.url === `${API}/catalogue` && r.params.get('search') === 'spring',
    );
    req.flush([]);
  });

  it('catalogue ignores empty search', () => {
    service.catalogue({ search: '   ' }).subscribe();
    const req = httpTesting.expectOne(
      r => r.url === `${API}/catalogue` && !r.params.has('search'),
    );
    req.flush([]);
  });

  // ── Références ────────────────────────────────────────────────────

  it('getDomaines sends GET /api/projets/references/domaines', () => {
    service.getDomaines().subscribe(r => expect(r.length).toBe(1));
    const req = httpTesting.expectOne(`${API}/projets/references/domaines`);
    expect(req.request.method).toBe('GET');
    req.flush([{ id: 1, nom: 'IA' }]);
  });

  it('getTechnologies sends GET /api/projets/references/technologies', () => {
    service.getTechnologies().subscribe(r => expect(r.length).toBe(1));
    const req = httpTesting.expectOne(`${API}/projets/references/technologies`);
    expect(req.request.method).toBe('GET');
    req.flush([{ id: 1, nom: 'Spring' }]);
  });

  it('getPrerequis sends GET /api/projets/references/prerequis', () => {
    service.getPrerequis().subscribe(r => expect(r.length).toBe(0));
    const req = httpTesting.expectOne(`${API}/projets/references/prerequis`);
    expect(req.request.method).toBe('GET');
    req.flush([]);
  });
});
