import { User } from './user.model';

export interface AffiliationEnseignantResponse {
  id: number;
  enseignant: User;
  equipeId: number;
  equipeNom: string;
  statut: 'EN_ATTENTE' | 'ACCEPTEE' | 'REFUSEE';
  dateDemande: string;
  dateDecision: string | null;
  motifDecision: string | null;
}

export interface TraiterAffiliationRequest {
  statut: 'EN_ATTENTE' | 'ACCEPTEE' | 'REFUSEE';
  motifDecision?: string;
}
