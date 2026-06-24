import { ReponseEliminatoire } from './critere.model';

export interface ProjetEvaluable {
  id: number;
  titre: string;
  statut: string;
  scoreFinalEvaluation?: number;
  eligibleIndustrialisation?: boolean;
  bloqueParEliminatoire?: boolean;
}

/** Résultat pour un critère éliminatoire. */
export interface ResultatEliminatoireRequest {
  critereId: number;
  reponse: ReponseEliminatoire;
  commentaire?: string;
}

/** Résultat pour un critère noté. */
export interface ResultatNoteRequest {
  critereId: number;
  noteObtenue: number;
  commentaire?: string;
}

/** Requête d'évaluation d'un projet. */
export interface EvaluationRequest {
  eliminatoires: ResultatEliminatoireRequest[];
  notes: ResultatNoteRequest[];
}

/** Résultat détaillé par critère renvoyé par le backend. */
export interface ResultatCritereResponse {
  id: number;
  critereId: number;
  typeCritere: 'ELIMINATOIRE' | 'NOTE';
  reponseEliminatoire?: ReponseEliminatoire;
  noteObtenue?: number;
  scorePondere?: number;
  commentaire?: string;
}

/** Réponse d'évaluation d'un projet. */
export interface EvaluationResponse {
  id: number;
  sujetProjetId: number;
  scoreFinal: number;
  eligibleIndustrialisation: boolean;
  bloqueParEliminatoire: boolean;
  dateCalcul: string;
  commentaire: string;
  resultats?: ResultatCritereResponse[];
}
