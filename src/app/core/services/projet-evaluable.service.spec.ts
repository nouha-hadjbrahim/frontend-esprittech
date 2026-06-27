import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { environment } from '../../../environments/environment';
import { ProjetEvaluableService } from './projet-evaluable.service';

describe('ProjetEvaluableService', () => {
  let service: ProjetEvaluableService;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting(), ProjetEvaluableService],
    });
    service = TestBed.inject(ProjetEvaluableService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('should call the evaluables endpoint', () => {
    service.getEvaluables().subscribe();

    const req = http.expectOne(`${environment.apiUrl}/projets/evaluables`);
    expect(req.request.method).toBe('GET');
    req.flush([]);
  });
});
