import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { environment } from '../../../environments/environment';
import { SujetProjetService } from './sujet-projet.service';

describe('SujetProjetService', () => {
  let service: SujetProjetService;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting(), SujetProjetService],
    });
    service = TestBed.inject(SujetProjetService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('should send CRUD requests with query parameters when needed', () => {
    const payload = { titre: 'Sujet', categorie: 'RDI', description: 'Desc', objectifs: 'Obj', prerequis: [], domaines: [], technologies: [], capaciteAccueil: 2 };

    service.creerSujet(payload as never).subscribe();
    const createReq = http.expectOne(`${environment.apiUrl}/sujet-projets`);
    expect(createReq.request.method).toBe('POST');
    expect(createReq.request.body).toEqual(payload);
    createReq.flush({ id: 1 });

    service.modifierSujet(1, payload as never).subscribe();
    const updateReq = http.expectOne(`${environment.apiUrl}/sujet-projets/1`);
    expect(updateReq.request.method).toBe('PUT');
    updateReq.flush({ id: 1 });

    service.supprimerSujet(1).subscribe();
    const deleteReq = http.expectOne(`${environment.apiUrl}/sujet-projets/1`);
    expect(deleteReq.request.method).toBe('DELETE');
    deleteReq.flush(null);

    service.getMesSujets('RDI' as never, 'REALISATION_TERMINEE' as never).subscribe();
    const mesReq = http.expectOne((req) => req.url === `${environment.apiUrl}/sujet-projets/mes-sujets`);
    expect(mesReq.request.params.get('categorie')).toBe('RDI');
    expect(mesReq.request.params.get('statut')).toBe('REALISATION_TERMINEE');
    mesReq.flush([]);

    service.getSujetsDisponibles('PFE' as never).subscribe();
    const dispoReq = http.expectOne((req) => req.url === `${environment.apiUrl}/sujet-projets/disponibles`);
    expect(dispoReq.request.params.get('categorie')).toBe('PFE');
    dispoReq.flush([]);

    service.getSujetById(7).subscribe();
    const byIdReq = http.expectOne(`${environment.apiUrl}/sujet-projets/7`);
    expect(byIdReq.request.method).toBe('GET');
    byIdReq.flush({ id: 7 });

    service.getTechnologies().subscribe();
    const techReq = http.expectOne(`${environment.apiUrl}/sujet-projets/technologies`);
    expect(techReq.request.method).toBe('GET');
    techReq.flush([]);

    service.getPrerequisSuggestions().subscribe();
    const prereqReq = http.expectOne(`${environment.apiUrl}/sujet-projets/suggestions/prerequis`);
    expect(prereqReq.request.method).toBe('GET');
    prereqReq.flush([]);

    service.getDomainesSuggestions().subscribe();
    const domainesReq = http.expectOne(`${environment.apiUrl}/sujet-projets/suggestions/domaines`);
    expect(domainesReq.request.method).toBe('GET');
    domainesReq.flush([]);
  });
});
