import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment';
import { LivrableService } from './livrable.service';
import { TypeLivrable } from '../models/livrable.model';

describe('LivrableService', () => {
  let service: LivrableService;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting(), LivrableService],
    });
    service = TestBed.inject(LivrableService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('should upload a file livrable as multipart form data', () => {
    const file = new File(['demo'], 'report.pdf', { type: 'application/pdf' });
    const payload = { typeLivrable: 'RAPPORT' as TypeLivrable, nom: 'Rapport final', description: 'Desc', file };

    service.upload(42, payload).subscribe();

    const req = http.expectOne(`${environment.apiUrl}/projets/42/livrables/upload`);
    expect(req.request.method).toBe('POST');
    const body = req.request.body as FormData;
    expect(body.get('typeLivrable')).toBe('RAPPORT');
    expect(body.get('nom')).toBe('Rapport final');
    expect(body.get('description')).toBe('Desc');
    expect(body.get('file')).toEqual(file);
    req.flush({ id: 1 });
  });

  it('should add a link livrable', () => {
    const request = {
      typeLivrable: 'LIEN_GIT' as TypeLivrable,
      nom: 'Repo',
      lienExterne: 'https://github.com/esprit/demo',
    };

    service.addLink(7, request).subscribe();

    const req = http.expectOne(`${environment.apiUrl}/projets/7/livrables/link`);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual(request);
    req.flush({ id: 2 });
  });

  it('should list livrables for a project and admin', () => {
    service.findByProjet(7).subscribe();
    const projectReq = http.expectOne(`${environment.apiUrl}/projets/7/livrables`);
    expect(projectReq.request.method).toBe('GET');
    projectReq.flush([]);

    service.findAllAdmin().subscribe();
    const adminReq = http.expectOne(`${environment.apiUrl}/admin/livrables`);
    expect(adminReq.request.method).toBe('GET');
    adminReq.flush([]);
  });

  it('should update and delete livrables on both user and admin paths', () => {
    const request = { typeLivrable: 'DOCUMENTATION' as TypeLivrable, nom: 'Doc', description: null, lienExterne: null, actif: true };

    service.update(3, request).subscribe();
    const updateReq = http.expectOne(`${environment.apiUrl}/livrables/3`);
    expect(updateReq.request.method).toBe('PUT');
    expect(updateReq.request.body).toEqual(request);
    updateReq.flush({ id: 3 });

    service.updateAdmin(4, request).subscribe();
    const updateAdminReq = http.expectOne(`${environment.apiUrl}/admin/livrables/4`);
    expect(updateAdminReq.request.method).toBe('PUT');
    updateAdminReq.flush({ id: 4 });

    service.delete(3).subscribe();
    const deleteReq = http.expectOne(`${environment.apiUrl}/livrables/3`);
    expect(deleteReq.request.method).toBe('DELETE');
    deleteReq.flush(null);

    service.deleteAdmin(4).subscribe();
    const deleteAdminReq = http.expectOne(`${environment.apiUrl}/admin/livrables/4`);
    expect(deleteAdminReq.request.method).toBe('DELETE');
    deleteAdminReq.flush(null);
  });

  it('should expose a download URL', () => {
    expect(service.downloadUrl(99)).toBe(`${environment.apiUrl}/livrables/99/download`);
  });
});
