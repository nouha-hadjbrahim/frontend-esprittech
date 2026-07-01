export type StatutCandidature = 'DEPOSEE' | 'ACCEPTEE' | 'REFUSEE' | 'ARCHIVEE';

export type StatutAffectation = 'ACTIVE' | 'RETIREE_ARCHIVEE';

export type TypeLivrable = 'DOCUMENTATION' | 'CODE_SOURCE' | 'RAPPORT' | 'PRESENTATION' | 'AUTRE';

export interface Candidature {
  id: number;
  sujetId: number;
  etudiantId: number;
  etudiantNom: string;
  etudiantPrenom: string;
  etudiantEmail?: string | null;
  statut: StatutCandidature;
  motifRefus: string | null;
  messageEtudiant: string | null;
  dateDepot: string;
  dateDecision: string | null;
  sujetTitre?: string | null;
  sujetCategorie?: string | null;
  encadrantNom?: string | null;
}

export interface DecisionCandidatureRequest {
  accepter: boolean;
  motifRefus?: string | null;
}

export interface Affectation {
  id: number;
  sujetId: number;
  etudiantId: number;
  etudiantNom: string;
  etudiantPrenom: string;
  etudiantEmail?: string | null;
  statut: StatutAffectation;
  dateDebut: string;
  dateRetrait: string | null;
  motifRetrait: string | null;
}

export interface RetraitEtudiantRequest {
  motifRetrait: string;
}

export interface Livrable {
  id: number;
  sujetId: number;
  type: TypeLivrable;
  nom: string;
  lien: string;
  description: string | null;
  visible: boolean;
  deposantId: number;
  deposantNom: string;
  dateDepot: string;
}
