import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { environment } from '../../../environments/environment';
import { CritereEliminatoireService } from './critere-eliminatoire.service';

describe('CritereEliminatoireService', () => {
  let service: CritereEliminatoireService;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting(), CritereEliminatoireService],
    });
    service = TestBed.inject(CritereEliminatoireService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('should call the expected endpoints for eliminatory criteria management', () => {
    service.findAll().subscribe();
    const findAllReq = http.expectOne(`${environment.apiUrl}/admin/criteres/eliminatoires`);
    expect(findAllReq.request.method).toBe('GET');
    findAllReq.flush([]);

    service.findActive().subscribe();
    const findActiveReq = http.expectOne(`${environment.apiUrl}/admin/criteres/eliminatoires/actifs`);
    expect(findActiveReq.request.method).toBe('GET');
    findActiveReq.flush([]);

    const request = { libelle: 'Git disponible', domaine: 'Projet', ordre: 1, reponseAttendue: 'OK', actif: true };
    service.create(request as never).subscribe();
    const createReq = http.expectOne(`${environment.apiUrl}/admin/criteres/eliminatoires`);
    expect(createReq.request.method).toBe('POST');
    expect(createReq.request.body).toEqual(request);
    createReq.flush({ id: 1 });

    service.update(5, request as never).subscribe();
    const updateReq = http.expectOne(`${environment.apiUrl}/admin/criteres/eliminatoires/5`);
    expect(updateReq.request.method).toBe('PUT');
    updateReq.flush({ id: 5 });

    service.deactivate(5).subscribe();
    const deactivateReq = http.expectOne(`${environment.apiUrl}/admin/criteres/eliminatoires/5/desactiver`);
    expect(deactivateReq.request.method).toBe('PATCH');
    expect(deactivateReq.request.body).toEqual({});
    deactivateReq.flush(null);

    service.activate(5).subscribe();
    const activateReq = http.expectOne(`${environment.apiUrl}/admin/criteres/eliminatoires/5/activer`);
    expect(activateReq.request.method).toBe('PATCH');
    activateReq.flush(null);

    const reorderBody = [{ critereId: 1, ordre: 2 }];
    service.reorder(reorderBody).subscribe();
    const reorderReq = http.expectOne(`${environment.apiUrl}/admin/criteres/eliminatoires/ordre`);
    expect(reorderReq.request.method).toBe('PUT');
    expect(reorderReq.request.body).toEqual(reorderBody);
    reorderReq.flush(null);
  });
});
