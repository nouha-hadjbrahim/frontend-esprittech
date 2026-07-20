import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { AccueilService } from './accueil.service';
import { AccueilStats } from '../models/accueil-stats.model';

describe('AccueilService', () => {
  let service: AccueilService;
  let httpMock: HttpTestingController;

  const mockStats: AccueilStats = {
    projetsActifs: 25,
    etudiants: 120,
    encadrants: 30,
    equipesRdi: 10,
    industrialises: 5,
  };

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        AccueilService,
        provideHttpClient(),
        provideHttpClientTesting(),
      ],
    });
    service = TestBed.inject(AccueilService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  describe('getStats', () => {
    it('should fetch accueil stats', () => {
      service.getStats().subscribe((result) => {
        expect(result).toEqual(mockStats);
      });

      const req = httpMock.expectOne('/api/accueil/stats');
      expect(req.request.method).toBe('GET');
      req.flush(mockStats);
    });

    it('should propagate server errors', () => {
      service.getStats().subscribe({
        next: () => fail('expected error'),
        error: (error) => {
          expect(error.status).toBe(500);
        },
      });

      const req = httpMock.expectOne('/api/accueil/stats');
      req.flush('error', { status: 500, statusText: 'Internal Server Error' });
    });
  });
});
