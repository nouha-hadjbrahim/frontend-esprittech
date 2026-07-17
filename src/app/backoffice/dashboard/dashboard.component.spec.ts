import { TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { ExtendedDashboardResponse } from '../../core/models/dashboard-admin.model';
import { DashboardAdminService } from '../../core/services/dashboard-admin.service';
import { DashboardComponent } from './dashboard.component';

describe('DashboardComponent', () => {
  const dashboard: ExtendedDashboardResponse = {
    kpis: {
      usersTotal: 0,
      encadrantsTotal: 0,
      equipesTotal: 0,
      affiliationsEnAttente: 0,
      sujetsTotal: 0,
      sujetsEnAttente: 0,
      sujetsValides: 0,
      sujetsInvalides: 0,
      candidaturesEnAttente: 0,
      candidaturesAcceptees: 0,
      candidaturesRefusees: 0,
      projetsCatalogue: 0,
      industrialisationsGo: 0,
      industrialisationsNoGo: 0,
      scoreMoyen: 0,
    },
    trendsSujets: [],
    trendsCandidatures: [],
    trendsEquipes: [],
    sujetsByStatut: [],
    usersByRole: [],
    catalogueByDomain: [],
    recentActivity: [],
  };

  beforeEach(() => TestBed.configureTestingModule({
    imports: [DashboardComponent],
    providers: [
      {
        provide: DashboardAdminService,
        useValue: {
          getExtendedDashboard: jasmine.createSpy('getExtendedDashboard').and.returnValue(of(dashboard)),
        },
      },
    ],
  }));

  it('should create', () => {
    const fixture = TestBed.createComponent(DashboardComponent);
    fixture.detectChanges();
    expect(fixture.componentInstance).toBeTruthy();
  });
});
