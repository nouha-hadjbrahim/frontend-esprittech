import { ModeEvaluation, ReponseEliminatoire } from './critere.model';

export interface ProjetEvaluable {
  id: number;
  titre: string;
  statut: string;
  scoreFinal?: number | null;
  eligibleIndustrialisation?: boolean;
  bloqueParEliminatoire?: boolean;
}

export interface ResultatCritereResponse {
  id: number;
  critereId: number;
  critereLibelle: string;
  critereDescription?: string | null;
  critereDomaine?: string | null;
  typeCritere: 'ELIMINATOIRE' | 'NOTE';
  modeEvaluation?: ModeEvaluation | null;
  reponseEliminatoire?: ReponseEliminatoire;
  noteObtenue?: number;
  scorePondere?: number;
  bareme?: number | null;
  poids?: number | null;
  noteValue?: number | null;
  noteLabel?: string | null;
  matchedRule?: string | null;
  metadataUsed?: string | null;
  explanation?: string | null;
  evidenceSummary?: string | null;
  evidenceLivrableIds?: number[];
  ruleConfigured?: boolean;
  commentaire?: string;
}

export interface EvaluationResponse {
  id: number;
  sujetProjetId: number;
  scoreFinal: number;
  eligibleIndustrialisation: boolean;
  bloqueParEliminatoire: boolean;
  hasEliminatoryWarnings?: boolean | null;
  eliminatoryWarningsCount?: number | null;
  eliminatoryWarningsDetails?: string[];
  dateCalcul: string;
  commentaire: string;
  calculatedBy?: string | null;
  recalculationReason?: string | null;
  resultats?: ResultatCritereResponse[];
  totalCriteresNotes?: number | null;
  criteresNotesConfigures?: number | null;
  criteresNotesNonConfigures?: number | null;
  totalCriteresEliminatoires?: number | null;
  criteresEliminatoiresSatisfaits?: number | null;
  criteresEliminatoiresNonConfigures?: number | null;
  evaluationComplete?: boolean | null;
  scoreCalculationCoverageMessage?: string | null;
  blockingCriteriaNames?: string[];
}
