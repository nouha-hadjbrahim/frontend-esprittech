/** Énumération des réponses possibles pour un critère éliminatoire. */
export enum ReponseEliminatoire {
  OK = 'OK',
  NOT_OK = 'NOT_OK'
}

/** Base de tous les critères d'évaluation. */
export interface CritereEvaluation {
  id: number;
  libelle: string;
  description: string | null;
  domaine: string;
  ordre: number;
  actif: boolean;
  dateCreation: string;
  dateMiseAJour: string;
}

/** Critère éliminatoire (accepté/rejeté). */
export interface CritereEliminatoire extends CritereEvaluation {
  reponseAttendue: ReponseEliminatoire;
}

/** Critère noté (avec barème, poids, seuil). */
export interface CritereNote extends CritereEvaluation {
  bareme: number;
  poids: number;
  seuil: number;
}

/** Corps de création/mise à jour d'un critère éliminatoire. */
export interface CritereEliminatoireRequest {
  libelle: string;
  description?: string;
  domaine: string;
  ordre: number;
  reponseAttendue: ReponseEliminatoire;
  actif?: boolean;
}

/** Corps de création/mise à jour d'un critère noté. */
export interface CritereNoteRequest {
  libelle: string;
  description?: string;
  domaine: string;
  ordre: number;
  bareme: number;
  poids: number;
  seuil: number;
  actif?: boolean;
}

/** Requête pour réorganiser les critères. */
export interface OrdreCritereRequest {
  critereId: number;
  ordre: number;
}
