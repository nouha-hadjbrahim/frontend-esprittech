import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { DashboardAdminService } from './dashboard-admin.service';
import { ExtendedDashboardResponse } from '../models/dashboard-admin.model';

describe('DashboardAdminService', () => {
  let service: DashboardAdminService;
  let httpMock: HttpTestingController;

  const mockResponse: ExtendedDashboardResponse = {
    kpis: {
      usersTotal: 100,
      encadrantsTotal: 20,
      equipesTotal: 15,
      affiliationsEnAttente: 5,
      sujetsTotal: 50,
      sujetsEnAttente: 10,
      sujetsValides: 30,
      sujetsInvalides: 10,
      candidaturesEnAttente: 8,
      candidaturesAcceptees: 12,
      candidaturesRefusees: 5,
      projetsCatalogue: 25,
      industrialisationsGo: 7,
      industrialisationsNoGo: 3,
      scoreMoyen: 75,
    },
    trendsSujets: [],
    trendsCandidatures: [],
    trendsIndustrialisation: [],
    trendsEquipes: [],
    sujetsByStatut: [],
    sujetsByCategorie: [],
    usersByRole: [],
    catalogueByDomain: [],
    sujetsByDomaine: [],
    recentActivity: [],
  };

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        DashboardAdminService,
        provideHttpClient(),
        provideHttpClientTesting(),
      ],
    });
    service = TestBed.inject(DashboardAdminService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  describe('getExtendedDashboard', () => {
    it('should fetch extended dashboard with default limit', () => {
      service.getExtendedDashboard().subscribe((result) => {
        expect(result).toEqual(mockResponse);
      });

      const req = httpMock.expectOne('/api/admin/dashboard/extended?recentActivityLimit=5');
      expect(req.request.method).toBe('GET');
      req.flush(mockResponse);
    });

    it('should fetch extended dashboard with custom limit', () => {
      service.getExtendedDashboard(10).subscribe((result) => {
        expect(result).toEqual(mockResponse);
      });

      const req = httpMock.expectOne('/api/admin/dashboard/extended?recentActivityLimit=10');
      expect(req.request.method).toBe('GET');
      req.flush(mockResponse);
    });

    it('should propagate server errors', () => {
      service.getExtendedDashboard().subscribe({
        next: () => fail('expected error'),
        error: (error) => {
          expect(error.status).toBe(500);
        },
      });

      const req = httpMock.expectOne('/api/admin/dashboard/extended?recentActivityLimit=5');
      req.flush('Server error', { status: 500, statusText: 'Internal Server Error' });
    });
  });
});
