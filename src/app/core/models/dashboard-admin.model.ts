export interface AdminKpiResponse {
  usersTotal: number;
  encadrantsTotal: number;
  equipesTotal: number;
  affiliationsEnAttente: number;
  sujetsTotal: number;
  sujetsEnAttente: number;
  sujetsValides: number;
  sujetsInvalides: number;
  candidaturesEnAttente: number;
  candidaturesAcceptees: number;
  candidaturesRefusees: number;
  projetsCatalogue: number;
  industrialisationsGo: number;
  industrialisationsNoGo: number;
  scoreMoyen: number;
}

export interface TrendItem {
  month: string;
  value: number;
}

export interface SujetByStatutItem {
  name: string;
  value: number;
  color: string;
}

export interface UsersByRoleItem {
  role: string;
  value: number;
}

export interface CatalogueByDomainItem {
  domain: string;
  value: number;
}

export interface RecentActivityItem {
  id: number;
  message: string;
  actor: string;
  time: string;
  type: string;
}

export interface ExtendedDashboardResponse {
  kpis: AdminKpiResponse;
  trendsSujets: TrendItem[];
  trendsCandidatures: TrendItem[];
  trendsEquipes: TrendItem[];
  sujetsByStatut: SujetByStatutItem[];
  usersByRole: UsersByRoleItem[];
  catalogueByDomain: CatalogueByDomainItem[];
  recentActivity: RecentActivityItem[];
}

export interface KpiCard {
  label: string;
  value: number | string;
  delta: string;
  trend: 'up' | 'down';
  icon: string;
  color: string;
}

export const KPI_DELTAS: Record<string, { delta: string; trend: 'up' | 'down' }> = {};
