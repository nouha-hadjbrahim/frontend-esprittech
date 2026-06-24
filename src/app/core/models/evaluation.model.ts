import { ReponseEliminatoire } from './critere.model';

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

/** Résultat de critère dans une évaluation. */
export interface ResultatCritereResponse {
  id: number;
  critereId: number;
  valeur: string | number;
  commentaire?: string;
  valide: boolean;
}

/** Réponse d'évaluation d'un projet. */
export interface EvaluationResponse {
  id: number;
  sujetProjetId: number;
  scoreFinal: number;
  eligibleIndustrialisation: boolean;
  bloqueParEliminatoire: boolean;
  dateCalcul: string;
  commentaire?: string;
  resultats: ResultatCritereResponse[];
}
