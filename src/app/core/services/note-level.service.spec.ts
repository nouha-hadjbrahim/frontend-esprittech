import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { environment } from '../../../environments/environment';
import { NoteLevelService } from './note-level.service';

describe('NoteLevelService', () => {
  let service: NoteLevelService;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting(), NoteLevelService],
    });
    service = TestBed.inject(NoteLevelService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('should call the expected endpoints for note level CRUD', () => {
    service.findAll().subscribe();
    const listReq = http.expectOne(`${environment.apiUrl}/admin/evaluation/note-levels`);
    expect(listReq.request.method).toBe('GET');
    listReq.flush([]);

    const request = { value: 4, label: 'Satisfait', description: 'Niveau 4', active: true, order: 4 };

    service.create(request).subscribe();
    const createReq = http.expectOne(`${environment.apiUrl}/admin/evaluation/note-levels`);
    expect(createReq.request.method).toBe('POST');
    expect(createReq.request.body).toEqual(request);
    createReq.flush({ id: 4 });

    service.update(4, request).subscribe();
    const updateReq = http.expectOne(`${environment.apiUrl}/admin/evaluation/note-levels/4`);
    expect(updateReq.request.method).toBe('PUT');
    expect(updateReq.request.body).toEqual(request);
    updateReq.flush({ id: 4 });

    service.activate(4).subscribe();
    const activateReq = http.expectOne(`${environment.apiUrl}/admin/evaluation/note-levels/4/activer`);
    expect(activateReq.request.method).toBe('PATCH');
    expect(activateReq.request.body).toEqual({});
    activateReq.flush(null);

    service.deactivate(4).subscribe();
    const deactivateReq = http.expectOne(`${environment.apiUrl}/admin/evaluation/note-levels/4/desactiver`);
    expect(deactivateReq.request.method).toBe('PATCH');
    expect(deactivateReq.request.body).toEqual({});
    deactivateReq.flush(null);

    service.delete(4).subscribe();
    const deleteReq = http.expectOne(`${environment.apiUrl}/admin/evaluation/note-levels/4`);
    expect(deleteReq.request.method).toBe('DELETE');
    deleteReq.flush(null);
  });
});
