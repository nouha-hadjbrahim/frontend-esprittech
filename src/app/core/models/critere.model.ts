/** Énumération des réponses possibles pour un critère éliminatoire. */
export enum ReponseEliminatoire {
  OK = 'OK',
  NOT_OK = 'NOT_OK'
}

export type ModeEvaluation =
  | 'LIVRABLE_TYPE_PRESENT'
  | 'LIVRABLE_LINK_PRESENT'
  | 'LIVRABLE_FILE_PRESENT'
  | 'LIVRABLE_COUNT_MIN'
  | 'GIT_LINK_PRESENT'
  | 'DOCUMENTATION_PRESENT'
  | 'KEYWORD_IN_LIVRABLE_NAME_OR_DESCRIPTION'
  | 'MANUAL_ADMIN_VALUE';

export const MODE_EVALUATION_OPTIONS: { value: ModeEvaluation; label: string }[] = [
  { value: 'DOCUMENTATION_PRESENT', label: 'Documentation presente' },
  { value: 'GIT_LINK_PRESENT', label: 'Lien Git disponible' },
  { value: 'LIVRABLE_TYPE_PRESENT', label: 'Type de livrable present' },
  { value: 'LIVRABLE_LINK_PRESENT', label: 'Lien externe present' },
  { value: 'LIVRABLE_FILE_PRESENT', label: 'Fichier present' },
  { value: 'LIVRABLE_COUNT_MIN', label: 'Nombre minimum de livrables' },
  { value: 'KEYWORD_IN_LIVRABLE_NAME_OR_DESCRIPTION', label: 'Mot-cle dans livrable' },
  { value: 'MANUAL_ADMIN_VALUE', label: 'Valeur manuelle admin' },
];

export interface CritereEvaluationRuleFields {
  modeEvaluation?: ModeEvaluation | null;
  expectedLivrableTypes?: string | null;
  minLivrableCount?: number | null;
  expectedKeyword?: string | null;
  noteMaxAuto?: number | null;
  ruleEnabled?: boolean;
  ruleDescription?: string | null;
}

/** Base de tous les critères d'évaluation. */
export interface CritereEvaluation extends CritereEvaluationRuleFields {
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
export interface CritereEliminatoireRequest extends CritereEvaluationRuleFields {
  libelle: string;
  description?: string;
  domaine: string;
  ordre: number;
  reponseAttendue: ReponseEliminatoire;
  actif?: boolean;
}

/** Corps de création/mise à jour d'un critère noté. */
export interface CritereNoteRequest extends CritereEvaluationRuleFields {
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
