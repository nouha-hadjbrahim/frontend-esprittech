export enum ReponseEliminatoire {
  OK = 'OK',
  NOT_OK = 'NOT_OK',
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

export type RuleOperator =
  | 'EXISTS'
  | 'NOT_EXISTS'
  | 'EQUALS'
  | 'NOT_EQUALS'
  | 'CONTAINS'
  | 'GTE'
  | 'LTE'
  | 'BETWEEN'
  | 'COUNT_GTE'
  | 'COUNT_LTE';

export const RULE_OPERATOR_OPTIONS: { value: RuleOperator; label: string }[] = [
  { value: 'EXISTS', label: 'Existe' },
  { value: 'NOT_EXISTS', label: "N'existe pas" },
  { value: 'EQUALS', label: 'Egal' },
  { value: 'NOT_EQUALS', label: 'Different' },
  { value: 'CONTAINS', label: 'Contient' },
  { value: 'GTE', label: 'Superieur ou egal' },
  { value: 'LTE', label: 'Inferieur ou egal' },
  { value: 'BETWEEN', label: 'Entre' },
  { value: 'COUNT_GTE', label: 'Nombre >=' },
  { value: 'COUNT_LTE', label: 'Nombre <=' },
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

export interface CritereNoteRule {
  id: number;
  critereNoteId: number;
  ruleName: string;
  description: string | null;
  metadataKey: string;
  operator: RuleOperator;
  expectedValue: string | null;
  minValue: number | null;
  maxValue: number | null;
  noteValue: number;
  noteLabel: string | null;
  priority: number;
  active: boolean;
  dateCreation: string;
  dateMiseAJour: string;
}

export interface CritereNoteRuleRequest {
  ruleName: string;
  description?: string | null;
  metadataKey: string;
  operator: RuleOperator;
  expectedValue?: string | null;
  minValue?: number | null;
  maxValue?: number | null;
  noteValue: number;
  priority: number;
  active?: boolean;
}

export interface OrdreCritereRequest {
  critereId: number;
  ordre: number;
}
