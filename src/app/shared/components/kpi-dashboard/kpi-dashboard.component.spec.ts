import { ComponentFixture, TestBed, fakeAsync, tick } from '@angular/core/testing';
import { signal } from '@angular/core';
import { KpiDashboardComponent } from './kpi-dashboard.component';
import { DashboardAdminService } from '../../../core/services/dashboard-admin.service';
import { ExtendedDashboardResponse } from '../../../core/models/dashboard-admin.model';

const mockData: ExtendedDashboardResponse = {
  kpis: {
    usersTotal: 100, encadrantsTotal: 20, equipesTotal: 10,
    affiliationsEnAttente: 5, sujetsTotal: 50, sujetsEnAttente: 8,
    sujetsValides: 30, sujetsInvalides: 12, candidaturesEnAttente: 15,
    candidaturesAcceptees: 20, candidaturesRefusees: 5, projetsCatalogue: 25,
    industrialisationsGo: 3, industrialisationsNoGo: 1, scoreMoyen: 72,
  },
  trendsCandidatures: [{ month: 'Jan', value: 10 }, { month: 'Feb', value: 20 }],
  trendsSujets: [], trendsIndustrialisation: [], trendsEquipes: [],
  sujetsByStatut: [{ name: 'Validé', value: 30, color: '#10B981' }],
  sujetsByCategorie: [], usersByRole: [{ role: 'Admin', value: 5 }],
  catalogueByDomain: [{ domain: 'IA', value: 10 }],
  sujetsByDomaine: [],
  recentActivity: [{ id: 1, message: 'Test activity', actor: 'Admin', time: 'il y a 1h', type: 'creation' }],
};

describe('KpiDashboardComponent', () => {
  let component: KpiDashboardComponent;
  let fixture: ComponentFixture<KpiDashboardComponent>;
  let dashboardServiceSpy: jasmine.SpyObj<DashboardAdminService>;

  beforeEach(() => {
    dashboardServiceSpy = jasmine.createSpyObj('DashboardAdminService', ['getExtendedDashboard']);

    TestBed.configureTestingModule({
      imports: [KpiDashboardComponent],
      providers: [{ provide: DashboardAdminService, useValue: dashboardServiceSpy }],
    });

    fixture = TestBed.createComponent(KpiDashboardComponent);
    component = fixture.componentInstance;
  });

  it('should create', () => {
    dashboardServiceSpy.getExtendedDashboard.and.returnValue({ subscribe: () => {} } as any);
    fixture.detectChanges();
    expect(component).toBeTruthy();
  });

  it('should set loading to true then false on success', fakeAsync(() => {
    let subscriber: any;
    dashboardServiceSpy.getExtendedDashboard.and.returnValue({ subscribe: (s: any) => { subscriber = s; } } as any);
    fixture.detectChanges();

    expect(component.loading()).toBeTrue();
    subscriber.next(mockData);
    tick();
    expect(component.loading()).toBeFalse();
    expect(component.data()).toEqual(mockData);
    expect(component.error()).toBeFalse();
  }));

  it('should set error on failure', () => {
    let subscriber: any;
    dashboardServiceSpy.getExtendedDashboard.and.returnValue({ subscribe: (s: any) => { subscriber = s; } } as any);
    fixture.detectChanges();

    subscriber.error(new Error('fail'));
    expect(component.error()).toBeTrue();
    expect(component.loading()).toBeFalse();
  });

  it('load() can be called again (retry)', () => {
    let subscriber: any;
    dashboardServiceSpy.getExtendedDashboard.and.returnValue({ subscribe: (s: any) => { subscriber = s; } } as any);
    fixture.detectChanges();

    component.load();
    subscriber.next(mockData);
    expect(component.data()).toEqual(mockData);
  });

  it('should have chart data structures', () => {
    dashboardServiceSpy.getExtendedDashboard.and.returnValue({ subscribe: () => {} } as any);
    fixture.detectChanges();
    expect(component.areaChartData).toBeDefined();
    expect(component.pieChartData).toBeDefined();
    expect(component.barChartData).toBeDefined();
    expect(component.hBarChartData).toBeDefined();
  });
});
