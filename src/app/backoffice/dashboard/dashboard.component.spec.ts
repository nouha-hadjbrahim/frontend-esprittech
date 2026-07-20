import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { of, throwError } from 'rxjs';
import { signal } from '@angular/core';
import { ExtendedDashboardResponse } from '../../core/models/dashboard-admin.model';
import { DashboardAdminService } from '../../core/services/dashboard-admin.service';
import { AuthService } from '../../core/services/auth.service';
import { User } from '../../core/models/user.model';
import { DashboardComponent } from './dashboard.component';

describe('DashboardComponent', () => {
  const dashboard: ExtendedDashboardResponse = {
    kpis: {
      usersTotal: 40,
      encadrantsTotal: 12,
      equipesTotal: 5,
      affiliationsEnAttente: 1,
      sujetsTotal: 28,
      sujetsEnAttente: 3,
      sujetsValides: 20,
      sujetsInvalides: 5,
      candidaturesEnAttente: 2,
      candidaturesAcceptees: 8,
      candidaturesRefusees: 1,
      projetsCatalogue: 9,
      industrialisationsGo: 2,
      industrialisationsNoGo: 1,
      scoreMoyen: 74,
    },
    trendsSujets: [
      { month: 'janv. 2026', value: 4 },
      { month: 'févr. 2026', value: 7 },
    ],
    trendsCandidatures: [
      { month: 'janv. 2026', value: 4 },
      { month: 'févr. 2026', value: 7 },
    ],
    trendsIndustrialisation: [
      { month: 'janv. 2026', value: 1 },
      { month: 'févr. 2026', value: 3 },
    ],
    trendsEquipes: [],
    sujetsByStatut: [],
    sujetsByCategorie: [
      { name: 'Stage', value: 10, color: '#FFB74D' },
      { name: 'PFE', value: 12, color: '#E23E3E' },
      { name: 'RDI', value: 6, color: '#94A3B8' },
    ],
    usersByRole: [],
    catalogueByDomain: [],
    sujetsByDomaine: [
      { domain: 'IA', value: 12 },
      { domain: 'Data', value: 8 },
    ],
    recentActivity: [
      {
        id: 1,
        message: 'a soumis un nouveau sujet Recherche appliquée en IA',
        actor: 'Salima Goubi',
        time: 'Il y a 5 min',
        type: 'en_attente',
      },
    ],
  };

  const currentUser = signal<User | null>({
    id: 1,
    nom: 'Admin',
    prenom: 'EspritTECH',
    email: 'admin@esprit.tn',
    role: 'ROLE_ADMIN',
    typeUtilisateur: 'ENSEIGNANT',
    departement: null,
    enabled: true,
    createdAt: null,
  });

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [DashboardComponent],
      providers: [
        provideRouter([]),
        {
          provide: DashboardAdminService,
          useValue: {
            getExtendedDashboard: jasmine.createSpy('getExtendedDashboard').and.returnValue(of(dashboard)),
          },
        },
        {
          provide: AuthService,
          useValue: { currentUser },
        },
      ],
    });
  });

  it('should create', () => {
    const fixture = TestBed.createComponent(DashboardComponent);
    fixture.detectChanges();
    expect(fixture.componentInstance).toBeTruthy();
  });

  it('should render domains and recent activity sections', () => {
    const fixture = TestBed.createComponent(DashboardComponent);
    fixture.detectChanges();
    const text = (fixture.nativeElement as HTMLElement).textContent ?? '';
    expect(text).toContain('Top domaines');
    expect(text).toContain('Activité récente');
    expect(text).toContain('Salima Goubi');
    expect(text).toContain('Tout voir');
    expect(text).toContain('SG');
  });

  it('should show retry state on error', () => {
    const service = TestBed.inject(DashboardAdminService) as jasmine.SpyObj<DashboardAdminService>;
    service.getExtendedDashboard.and.returnValue(throwError(() => new Error('fail')));
    const fixture = TestBed.createComponent(DashboardComponent);
    fixture.detectChanges();
    expect((fixture.nativeElement as HTMLElement).textContent).toContain('Impossible de charger les statistiques');
  });
});
