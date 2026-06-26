import { TestBed } from '@angular/core/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { EvaluationService } from './evaluation.service';
import { environment } from '../../../environments/environment';
import { EvaluationResponse } from '../models/evaluation.model';

describe('EvaluationService', () => {
  let service: EvaluationService;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [EvaluationService]
    });
    service = TestBed.inject(EvaluationService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('should post calculateScore to correct URL', () => {
    const mockRes: EvaluationResponse = {
      id: 1,
      sujetProjetId: 123,
      scoreFinal: 42,
      eligibleIndustrialisation: true,
      bloqueParEliminatoire: false,
      dateCalcul: new Date().toISOString(),
      commentaire: 'ok',
      calculatedBy: 'ROLE_ADMIN Admin Root',
      recalculationReason: 'Recalcul manuel',
      resultats: []
    };

    service.calculateScore(123).subscribe(res => {
      expect(res).toEqual(mockRes);
    });

    const req = http.expectOne(`${environment.apiUrl}/projets/123/calculer-score`);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual({});
    req.flush(mockRes);
  });

  it('should reuse calculateScore for a recalculation request', () => {
    service.calculateScore(5).subscribe();

    const req = http.expectOne(`${environment.apiUrl}/projets/5/calculer-score`);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual({});
    req.flush({});
  });

  it('should getLatestEvaluation from correct URL', () => {
    const mockRes: EvaluationResponse = {
      id: 2,
      sujetProjetId: 5,
      scoreFinal: 10,
      eligibleIndustrialisation: false,
      bloqueParEliminatoire: false,
      dateCalcul: new Date().toISOString(),
      commentaire: '',
      calculatedBy: 'SYSTEM',
      recalculationReason: null,
      resultats: []
    };

    service.getLatestEvaluation(5).subscribe(res => {
      expect(res).toEqual(mockRes);
    });

    const req = http.expectOne(`${environment.apiUrl}/projets/5/evaluation`);
    expect(req.request.method).toBe('GET');
    req.flush(mockRes);
  });
});
