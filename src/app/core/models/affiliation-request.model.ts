import { User } from './user.model';

export interface AffiliationRequest {
  id: number;
  equipeId: number;
  equipeNom?: string;
  encadrantId: number;
  encadrantNom: string;
  encadrantPrenom: string;
  encadrantEmail: string;
  message: string;
  statut: 'en_attente' | 'acceptee' | 'refusee';
  dateCreation: string;
}

export interface CreateAffiliationRequest {
  equipeId: number;
  message: string;
}

export type AffiliationDecision = 'acceptee' | 'refusee';

export interface AffiliationDecisionRequest {
  decision: AffiliationDecision;
}
