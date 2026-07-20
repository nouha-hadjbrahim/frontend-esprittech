import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { environment } from '../../../environments/environment';
import { TypeLivrable } from '../models/livrable.model';
import { CatalogueLivrableService } from './catalogue-livrable.service';

describe('CatalogueLivrableService', () => {
  let service: CatalogueLivrableService;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting(), CatalogueLivrableService],
    });
    service = TestBed.inject(CatalogueLivrableService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('loads published project deliverables through the catalogue endpoint', () => {
    service.findPublishedByProjet(100).subscribe();

    const req = http.expectOne(`${environment.apiUrl}/catalogue/100/livrables`);
    expect(req.request.method).toBe('GET');
    req.flush([]);
  });

  it('builds inherited and direct published download URLs without changing ids', () => {
    expect(service.downloadPublishedUrl(100, 10, true))
      .toBe(`${environment.apiUrl}/catalogue/100/livrables/10/download?fromSujet=true`);
    expect(service.downloadPublishedUrl(100, 20, false))
      .toBe(`${environment.apiUrl}/catalogue/100/livrables/20/download`);
  });

  it('keeps direct catalogue management endpoints for future project uploads', () => {
    const file = new File(['demo'], 'doc.pdf', { type: 'application/pdf' });
    service.upload(100, {
      typeLivrable: 'DOCUMENTATION' as TypeLivrable,
      nom: 'Documentation',
      file,
    }).subscribe();

    const req = http.expectOne(`${environment.apiUrl}/projets-catalogue/100/livrables/upload`);
    expect(req.request.method).toBe('POST');
    expect(req.request.body.get('file')).toEqual(file);
    req.flush({ id: 20 });
  });
});
