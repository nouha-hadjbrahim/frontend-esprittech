import { ModeEvaluation, ReponseEliminatoire } from './critere.model';

export interface ProjetEvaluable {
  id: number;
  titre: string;
  statut: string;
  scoreFinal?: number | null;
  eligibleIndustrialisation?: boolean;
  bloqueParEliminatoire?: boolean;
  latestEvaluation?: EvaluationResponse | null;
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
  mlScore?: number | null;
  mlMaxScore?: number | null;
  normalizedScore?: number | null;
  confidence?: number | null;
  criterionStatus?: string | null;
  evidenceQuality?: number | null;
  extractionQuality?: number | null;
  sourceCoverage?: number | null;
  eliminatoryState?: string | null;
  analysisMethods?: string[];
  evidenceJson?: string | null;
  strengths?: string[];
  weaknesses?: string[];
  recommendations?: string[];
}

export interface CriterionConfigurationIssueResponse {
  criterionId: number;
  criterionName: string;
  criterionType: 'ELIMINATOIRE' | 'NOTE' | string;
  blockingMissingFields: string[];
  nonBlockingMissingFields: string[];
  configurationVersion?: string | null;
  consequence?: string | null;
}

export interface EvidenceReference {
  evidenceId?: string | null;
  deliverableId?: number | null;
  sourceType?: string | null;
  source?: string | null;
  page?: number | null;
  path?: string | null;
  contentHash?: string | null;
  relevance?: number | null;
  rawSemanticSimilarity?: number | null;
  calibratedRelevance?: number | null;
  projectRelevanceScore?: number | null;
  rankingMargin?: number | null;
  stance?: 'SUPPORTS' | 'CONTRADICTS' | 'NEUTRAL' | 'INSUFFICIENT' | string | null;
  projectRelevanceType?: string | null;
  stanceConfidence?: number | null;
  sourceAuthority?: number | null;
  contradictionStrength?: number | null;
  evidenceQuality?: number | null;
  extractionQuality?: number | null;
  documentCategory?: string | null;
  documentCategoryConfidence?: number | null;
  documentCategoryReasonCodes?: string[];
  evidenceNature?: 'SEMANTIC' | 'DETERMINISTIC' | 'STRUCTURED_REPORT' | string | null;
  excerpt?: string | null;
}

export interface EvaluationResponse {
  id: number;
  sujetProjetId: number;
  scoreFinal: number | null;
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
  criteresEliminatoiresNonSatisfaits?: number | null;
  criteresEliminatoiresIndetermines?: number | null;
  criteresEliminatoiresConfigurationIncomplete?: number | null;
  incompleteCriteriaCount?: number | null;
  incompleteCriteria?: CriterionConfigurationIssueResponse[];
  evaluationComplete?: boolean | null;
  scoreCalculationCoverageMessage?: string | null;
  blockingCriteriaNames?: string[];
  mlStatus?: string | null;
  mlModelVersion?: string | null;
  mlGlobalConfidence?: number | null;
  mlScore?: number | null;
  finalValidatedScore?: number | null;
  validationStatus?: string | null;
  validatedBy?: string | null;
  validatedAt?: string | null;
  overrideReason?: string | null;
  mlWarnings?: string[];
  strengths?: string[];
  weaknesses?: string[];
  recommendations?: string[];
  errorMessage?: string | null;
  trigger?: string | null;
  correlationId?: string | null;
  engineType?: string | null;
  modelName?: string | null;
  pipelineVersion?: string | null;
  criteriaVersion?: string | null;
  projectSnapshotHash?: string | null;
  deliverableSnapshotHash?: string | null;
  inputSnapshotHash?: string | null;
  processingStatus?: string | null;
  eligibilityStatus?: string | null;
}

export interface EvaluationValidationRequest {
  commentaire?: string | null;
}

export interface EvaluationOverrideRequest {
  finalScore: number;
  reason?: string | null;
}
