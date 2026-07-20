import { TestBed } from '@angular/core/testing';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideHttpClient } from '@angular/common/http';
import { DashboardService } from './dashboard.service';

describe('DashboardService', () => {
  let service: DashboardService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [DashboardService, provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(DashboardService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpMock.verify());

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('should GET dashboard stats', () => {
    const mockStats = { totalUsers: 10, totalSujets: 5 } as any;
    service.getDashboard().subscribe(result => {
      expect(result).toEqual(mockStats);
    });
    const req = httpMock.expectOne(r => r.url.includes('/dashboard'));
    expect(req.request.method).toBe('GET');
    req.flush(mockStats);
  });
});
