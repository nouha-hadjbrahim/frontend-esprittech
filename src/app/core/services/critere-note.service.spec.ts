import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { environment } from '../../../environments/environment';
import { CritereNoteService } from './critere-note.service';

describe('CritereNoteService', () => {
  let service: CritereNoteService;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting(), CritereNoteService],
    });
    service = TestBed.inject(CritereNoteService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('should call the expected endpoints for note criteria management', () => {
    service.findAll().subscribe();
    const findAllReq = http.expectOne(`${environment.apiUrl}/admin/criteres/notes`);
    expect(findAllReq.request.method).toBe('GET');
    findAllReq.flush([]);

    service.findActive().subscribe();
    const findActiveReq = http.expectOne(`${environment.apiUrl}/admin/criteres/notes/actifs`);
    expect(findActiveReq.request.method).toBe('GET');
    findActiveReq.flush([]);

    const request = { libelle: 'Score', domaine: 'Projet', ordre: 1, poids: 2, defaultNoteValue: 3, actif: true };
    service.create(request as never).subscribe();
    const createReq = http.expectOne(`${environment.apiUrl}/admin/criteres/notes`);
    expect(createReq.request.method).toBe('POST');
    expect(createReq.request.body).toEqual(request);
    createReq.flush({ id: 1 });

    service.update(5, request as never).subscribe();
    const updateReq = http.expectOne(`${environment.apiUrl}/admin/criteres/notes/5`);
    expect(updateReq.request.method).toBe('PUT');
    updateReq.flush({ id: 5 });

    service.delete(5).subscribe();
    const deleteReq = http.expectOne(`${environment.apiUrl}/admin/criteres/notes/5`);
    expect(deleteReq.request.method).toBe('DELETE');
    deleteReq.flush(null);

    service.deactivate(5).subscribe();
    const deactivateReq = http.expectOne(`${environment.apiUrl}/admin/criteres/notes/5/deactivate`);
    expect(deactivateReq.request.method).toBe('PATCH');
    expect(deactivateReq.request.body).toEqual({});
    deactivateReq.flush(null);

    service.activate(5).subscribe();
    const activateReq = http.expectOne(`${environment.apiUrl}/admin/criteres/notes/5/activate`);
    expect(activateReq.request.method).toBe('PATCH');
    activateReq.flush(null);

    const reorderBody = [{ critereId: 1, ordre: 2 }];
    service.reorder(reorderBody).subscribe();
    const reorderReq = http.expectOne(`${environment.apiUrl}/admin/criteres/notes/ordre`);
    expect(reorderReq.request.method).toBe('PUT');
    expect(reorderReq.request.body).toEqual(reorderBody);
    reorderReq.flush(null);
  });

});
