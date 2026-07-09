export enum ReponseEliminatoire {
  OK = 'OK',
  NOT_OK = 'NOT_OK',
}

export type ModeEvaluation =
  | 'CONTENT_ANALYSIS'
  | 'LIVRABLE_TYPE_PRESENT'
  | 'LIVRABLE_LINK_PRESENT'
  | 'LIVRABLE_FILE_PRESENT'
  | 'LIVRABLE_COUNT_MIN'
  | 'GIT_LINK_PRESENT'
  | 'DOCUMENTATION_PRESENT'
  | 'KEYWORD_IN_LIVRABLE_NAME_OR_DESCRIPTION'
  | 'MANUAL_ADMIN_VALUE';

export const MODE_EVALUATION_OPTIONS: { value: ModeEvaluation; label: string }[] = [
  { value: 'CONTENT_ANALYSIS', label: 'Analyse du contenu des livrables' },
  { value: 'MANUAL_ADMIN_VALUE', label: 'Valeur manuelle admin' },
];

export interface NoteLevel {
  id: number;
  value: number;
  label: string;
  description: string | null;
  active: boolean;
  order: number;
  dateCreation: string;
  dateMiseAJour: string;
}

export interface NoteLevelRequest {
  value: number;
  label: string;
  description?: string | null;
  active?: boolean;
  order: number;
}

export interface CritereEvaluationRuleFields {
  modeEvaluation?: ModeEvaluation | null;
  expectedLivrableTypes?: string | null;
  minLivrableCount?: number | null;
  expectedKeyword?: string | null;
  noteMaxAuto?: number | null;
  ruleEnabled?: boolean;
  ruleDescription?: string | null;
}

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

export interface CritereEliminatoire extends CritereEvaluation {
  reponseAttendue: ReponseEliminatoire;
}

export interface CritereNote extends CritereEvaluation {
  bareme?: number;
  poids: number;
  seuil?: number;
  defaultNoteValue?: number | null;
}

export interface CritereEliminatoireRequest extends CritereEvaluationRuleFields {
  libelle: string;
  description?: string;
  domaine: string;
  ordre: number;
  reponseAttendue: ReponseEliminatoire;
  actif?: boolean;
}

export interface CritereNoteRequest extends CritereEvaluationRuleFields {
  libelle: string;
  description?: string;
  domaine: string;
  ordre: number;
  bareme?: number;
  poids: number;
  seuil?: number;
  defaultNoteValue?: number | null;
  actif?: boolean;
}

export interface OrdreCritereRequest {
  critereId: number;
  ordre: number;
}
