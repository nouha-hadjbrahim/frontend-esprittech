import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { environment } from '../../../environments/environment';
import { SujetReferenceService } from './sujet-reference.service';

describe('SujetReferenceService', () => {
  let service: SujetReferenceService;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting(), SujetReferenceService],
    });
    service = TestBed.inject(SujetReferenceService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('should cover counts, paginated queries and CRUD actions', () => {
    service.getCounts().subscribe();
    const countsReq = http.expectOne(`${environment.apiUrl}/sujet-projets/admin/references/counts`);
    expect(countsReq.request.method).toBe('GET');
    countsReq.flush({ domaines: 1, prerequis: 2, technologies: 3 });

    service.getPage('domaines', 1, 12, ' ia ').subscribe();
    const pageReq = http.expectOne((req) => req.url === `${environment.apiUrl}/sujet-projets/admin/references/domaines`);
    expect(pageReq.request.params.get('page')).toBe('1');
    expect(pageReq.request.params.get('size')).toBe('12');
    expect(pageReq.request.params.get('search')).toBe('ia');
    pageReq.flush({ content: [], page: 1, size: 12, totalElements: 0, totalPages: 0, first: true, last: true });

    const request = { nom: 'Cloud' };
    service.create('technologies', request).subscribe();
    const createReq = http.expectOne(`${environment.apiUrl}/sujet-projets/admin/references/technologies`);
    expect(createReq.request.method).toBe('POST');
    expect(createReq.request.body).toEqual(request);
    createReq.flush({ id: 1, nom: 'Cloud', dateCreation: new Date().toISOString() });

    service.update('prerequis', 5, request).subscribe();
    const updateReq = http.expectOne(`${environment.apiUrl}/sujet-projets/admin/references/prerequis/5`);
    expect(updateReq.request.method).toBe('PUT');
    updateReq.flush({ id: 5, nom: 'Cloud', dateCreation: new Date().toISOString() });

    service.delete('domaines', 3).subscribe();
    const deleteReq = http.expectOne(`${environment.apiUrl}/sujet-projets/admin/references/domaines/3`);
    expect(deleteReq.request.method).toBe('DELETE');
    deleteReq.flush(null);

    service.suggestDomaine('IA').subscribe();
    const suggestDomaineReq = http.expectOne(`${environment.apiUrl}/sujet-projets/references/domaines`);
    expect(suggestDomaineReq.request.method).toBe('POST');
    suggestDomaineReq.flush({ id: 2, nom: 'IA', dateCreation: new Date().toISOString() });

    service.suggestPrerequis('Java').subscribe();
    const suggestPrerequisReq = http.expectOne(`${environment.apiUrl}/sujet-projets/references/prerequis`);
    expect(suggestPrerequisReq.request.method).toBe('POST');
    suggestPrerequisReq.flush({ id: 3, nom: 'Java', dateCreation: new Date().toISOString() });

    service.suggestTechnologie('Angular').subscribe();
    const suggestTechnologieReq = http.expectOne(`${environment.apiUrl}/sujet-projets/references/technologies`);
    expect(suggestTechnologieReq.request.method).toBe('POST');
    suggestTechnologieReq.flush({ id: 4, nom: 'Angular', dateCreation: new Date().toISOString() });
  });
});
