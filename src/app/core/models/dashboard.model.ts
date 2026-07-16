export interface DashboardStats {
  sujetsTotal: number;
  sujetsValides: number;
  sujetsInvalides: number;
  sujetsEnAttente: number;

  candidaturesTotal: number;
  candidaturesEnAttente: number;
  candidaturesAcceptees: number;
  candidaturesRefusees: number;

  projetsAuCatalogue: number;
  projetsEnAttenteValidationCatalogue: number;

  industrialisationsGo: number;
  industrialisationsNoGo: number;
  scoreMoyen: number;
}
