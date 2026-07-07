import { CommonModule } from '@angular/common';
import { Component, Input } from '@angular/core';
import { EvaluationResponse, EvidenceReference, ResultatCritereResponse } from '../../../core/models/evaluation.model';

@Component({
  selector: 'app-evaluation-checklist',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './evaluation-checklist.component.html',
  styleUrl: './evaluation-checklist.component.scss',
})
export class EvaluationChecklistComponent {
  @Input({ required: true }) evaluation!: EvaluationResponse;
  @Input() projectTitle = '';

  get eliminatoires(): ResultatCritereResponse[] {
    return this.evaluation?.resultats?.filter((resultat) => resultat.typeCritere === 'ELIMINATOIRE') ?? [];
  }

  get notes(): ResultatCritereResponse[] {
    return this.evaluation?.resultats?.filter((resultat) => resultat.typeCritere === 'NOTE') ?? [];
  }

  get eliminatoiresOk(): number {
    return this.evaluation?.criteresEliminatoiresSatisfaits
      ?? this.eliminatoires.filter((resultat) => resultat.reponseEliminatoire === 'OK').length;
  }

  get eliminatoiresNotOk(): number {
    return this.evaluation?.criteresEliminatoiresNonSatisfaits
      ?? this.eliminatoires.filter((resultat) => resultat.reponseEliminatoire === 'NOT_OK').length;
  }

  get eliminatoiresIndetermines(): number {
    return this.evaluation?.criteresEliminatoiresIndetermines
      ?? this.eliminatoires.filter((resultat) => !resultat.reponseEliminatoire || resultat.eliminatoryState === 'INDETERMINATE').length;
  }

  get incompleteCriteria() {
    return this.evaluation?.incompleteCriteria ?? [];
  }

  get evaluationComplete(): boolean {
    return this.evaluation?.evaluationComplete !== false;
  }

  get hasBlockingCriteria(): boolean {
    return (this.evaluation?.blockingCriteriaNames?.length ?? 0) > 0
      || this.eliminatoires.some((resultat) => resultat.reponseEliminatoire === 'NOT_OK');
  }

  get scorePercent(): number {
    return Math.max(0, Math.min(100, this.displayScore ?? 0));
  }

  get displayScore(): number | null {
    return this.evaluation?.finalValidatedScore ?? this.currentScoreOrNull();
  }

  get mlScore(): number | null {
    if (this.isCurrentEvaluationUncalculated()) {
      return null;
    }
    return this.evaluation?.mlScore ?? this.evaluation?.scoreFinal ?? null;
  }

  get mlScoreLabel(): string {
    const score = this.mlScore;
    return score == null ? 'Non calculé' : `${this.formatNumber(score)} / 100`;
  }

  get officialScoreLabel(): string {
    const score = this.currentScoreOrNull();
    return score == null ? 'Non calculé' : `${this.formatNumber(score)} / 100`;
  }

  get validatedScoreLabel(): string {
    if (['VALIDATED', 'OVERRIDDEN'].includes(this.evaluation?.validationStatus ?? '') && this.evaluation?.finalValidatedScore != null) {
      return `${this.formatNumber(this.evaluation.finalValidatedScore)} / 100`;
    }
    return '-';
  }

  get uniqueStrengths(): string[] {
    return this.uniqueStrings(this.evaluation?.strengths).map((value) => this.localizedReason(value));
  }

  get uniqueWeaknesses(): string[] {
    return this.uniqueStrings(this.evaluation?.weaknesses).map((value) => this.localizedReason(value));
  }

  get uniqueRecommendations(): string[] {
    return this.uniqueStrings(this.evaluation?.recommendations).map((value) => this.localizedReason(value));
  }

  get validationLabel(): string {
    switch (this.evaluation?.validationStatus) {
      case 'VALIDATED':
        return 'Validée';
      case 'REJECTED':
        return 'Rejetée';
      case 'OVERRIDDEN':
        return 'Override admin';
      case 'PENDING':
      default:
        return 'En attente';
    }
  }

  get modelDisplayName(): string | null {
    const model = this.evaluation?.modelName;
    if (!model) {
      return null;
    }
    return model.replace(/\\/g, '/').split('/').filter(Boolean).pop() ?? model;
  }

  get statusLabel(): string {
    switch (this.evaluation?.eligibilityStatus) {
      case 'ELIGIBLE':
        return 'Éligible';
      case 'REVIEW_REQUIRED':
        return 'Revue requise';
      case 'NON_ELIGIBLE_EN_L_ETAT':
        return 'Non éligible en l’état';
      case 'NOT_EVALUABLE':
        return 'Non évaluable';
    }
    if (this.evaluation?.eligibleIndustrialisation && !this.evaluationComplete) {
      return 'Analyse nécessaire';
    }
    if (this.evaluation?.eligibleIndustrialisation && this.hasBlockingCriteria) {
      return 'Éligible avec alertes';
    }
    return this.evaluation?.eligibleIndustrialisation ? 'GO - Éligible' : 'NO GO - Non éligible';
  }

  get statusClass(): string {
    if (this.evaluation?.eligibilityStatus === 'NON_ELIGIBLE_EN_L_ETAT' || this.evaluation?.eligibilityStatus === 'NOT_EVALUABLE') {
      return 'decision-badge--no';
    }
    if (this.evaluation?.eligibilityStatus === 'REVIEW_REQUIRED') {
      return 'decision-badge--warning';
    }
    if (this.evaluation?.eligibilityStatus === 'ELIGIBLE') {
      return 'decision-badge--go';
    }
    if (!this.evaluation?.eligibleIndustrialisation) {
      return 'decision-badge--no';
    }
    if (!this.evaluationComplete || this.hasBlockingCriteria) {
      return 'decision-badge--warning';
    }
    return 'decision-badge--go';
  }

  get progressClass(): string {
    if (this.evaluation?.eligibilityStatus === 'NON_ELIGIBLE_EN_L_ETAT' || this.evaluation?.eligibilityStatus === 'NOT_EVALUABLE') {
      return 'checklist-progress__bar--danger';
    }
    if (this.evaluation?.eligibilityStatus === 'REVIEW_REQUIRED') {
      return 'checklist-progress__bar--warning';
    }
    if (!this.evaluation?.eligibleIndustrialisation) {
      return 'checklist-progress__bar--danger';
    }
    if (!this.evaluationComplete || this.hasBlockingCriteria) {
      return 'checklist-progress__bar--warning';
    }
    return this.scorePercent >= 70 ? 'checklist-progress__bar--success' : 'checklist-progress__bar--warning';
  }

  get blockingCriteriaNames(): string[] {
    if (this.evaluation?.blockingCriteriaNames?.length) {
      return this.evaluation.blockingCriteriaNames;
    }
    return this.eliminatoires
      .filter((resultat) => resultat.reponseEliminatoire === 'NOT_OK')
      .map((resultat) => resultat.critereLibelle);
  }

  get analysisIssueCount(): number {
    return this.evaluation?.resultats?.filter((resultat) => resultat.ruleConfigured === false).length ?? 0;
  }

  isBlocking(resultat: ResultatCritereResponse): boolean {
    return resultat.typeCritere === 'ELIMINATOIRE' && resultat.reponseEliminatoire === 'NOT_OK';
  }

  resultLabel(resultat: ResultatCritereResponse): string {
    if (resultat.criterionStatus === 'INSUFFICIENT_EVIDENCE') {
      return 'Preuves insuffisantes';
    }
    if (resultat.criterionStatus === 'INDETERMINATE' || resultat.eliminatoryState === 'INDETERMINATE') {
      return 'Indéterminé';
    }
    if (resultat.typeCritere === 'ELIMINATOIRE') {
      return resultat.reponseEliminatoire ?? 'Non renseigné';
    }
    if (resultat.mlScore != null && resultat.mlMaxScore != null) {
      const score = this.formatNumber(resultat.mlScore);
      const max = this.formatNumber(resultat.mlMaxScore);
      const normalizedValue = resultat.normalizedScore != null
        ? (resultat.normalizedScore <= 1 ? resultat.normalizedScore * 100 : resultat.normalizedScore)
        : null;
      const normalized = normalizedValue != null ? ` - ${this.formatNumber(normalizedValue)}/100` : '';
      return `${score}/${max}${normalized}`;
    }
    const hasExplicitNoteValue = resultat.noteValue != null || resultat.noteObtenue != null;
    if (!hasExplicitNoteValue) {
      return 'Non calculé';
    }
    const note = resultat.noteValue ?? resultat.noteObtenue ?? 0;
    const scale = resultat.bareme && resultat.bareme > 0 ? resultat.bareme : null;
    if (scale) {
      return resultat.noteLabel ? `${note}/${scale} - ${resultat.noteLabel}` : `${note}/${scale}`;
    }
    return resultat.noteLabel ? resultat.noteLabel : String(note);
  }

  confidencePercent(value: number | null | undefined): number | null {
    if (value == null) {
      return null;
    }
    const percent = value <= 1 ? value * 100 : value;
    return Math.max(0, Math.min(100, Math.round(percent)));
  }

  evidenceLabel(resultat: ResultatCritereResponse): string {
    const references = this.evidenceReferences(resultat)
      .map((reference) => this.evidenceReferenceLabel(reference))
      .filter(Boolean);
    const ids = resultat.evidenceLivrableIds?.length
      ? ` Livrables: ${resultat.evidenceLivrableIds.map((id) => `#${id}`).join(', ')}.`
      : '';
    const locations = references.length ? ` Sources: ${references.join('; ')}.` : '';
    return `${resultat.evidenceSummary ?? ''}${ids}${locations}`.trim();
  }

  hasCriterionDetails(resultat: ResultatCritereResponse): boolean {
    return !!(
      resultat.explanation
      || resultat.evidenceSummary
      || resultat.evidenceLivrableIds?.length
      || this.evidenceReferences(resultat).length
      || resultat.criterionStatus
      || resultat.analysisMethods?.length
      || resultat.strengths?.length
      || resultat.weaknesses?.length
      || resultat.recommendations?.length
    );
  }

  private formatNumber(value: number): string {
    return Number.isInteger(value) ? String(value) : value.toFixed(1);
  }

  criterionExplanation(resultat: ResultatCritereResponse): string | null {
    if (!resultat.explanation) {
      return null;
    }
    return this.localizedReason(resultat.explanation);
  }

  localizedMessage(value: string | null | undefined): string {
    return value ? this.localizedReason(value) : '';
  }

  localizedMessages(values: string[] | null | undefined): string {
    return this.uniqueStrings(values).map((value) => this.localizedReason(value)).join('; ');
  }

  evidenceReferences(resultat: ResultatCritereResponse): EvidenceReference[] {
    if (!resultat.evidenceJson) {
      return [];
    }
    try {
      const parsed = JSON.parse(resultat.evidenceJson);
      if (!Array.isArray(parsed)) {
        return [];
      }
      return parsed
        .filter((item) => item && typeof item === 'object')
        .map((item) => ({
          evidenceId: typeof item.evidenceId === 'string' ? item.evidenceId : null,
          deliverableId: typeof item.deliverableId === 'number' ? item.deliverableId : null,
          sourceType: typeof item.sourceType === 'string' ? item.sourceType : null,
          source: typeof item.source === 'string' ? item.source : null,
          page: typeof item.page === 'number' ? item.page : null,
          path: typeof item.path === 'string' ? item.path : null,
          contentHash: typeof item.contentHash === 'string' ? item.contentHash : null,
          relevance: typeof item.relevance === 'number' ? item.relevance : null,
          rawSemanticSimilarity: typeof item.rawSemanticSimilarity === 'number' ? item.rawSemanticSimilarity : null,
          calibratedRelevance: typeof item.calibratedRelevance === 'number' ? item.calibratedRelevance : null,
          projectRelevanceScore: typeof item.projectRelevanceScore === 'number' ? item.projectRelevanceScore : null,
          rankingMargin: typeof item.rankingMargin === 'number' ? item.rankingMargin : null,
          stance: typeof item.stance === 'string' ? item.stance : null,
          projectRelevanceType: typeof item.projectRelevanceType === 'string' ? item.projectRelevanceType : null,
          stanceConfidence: typeof item.stanceConfidence === 'number' ? item.stanceConfidence : null,
          sourceAuthority: typeof item.sourceAuthority === 'number' ? item.sourceAuthority : null,
          contradictionStrength: typeof item.contradictionStrength === 'number' ? item.contradictionStrength : null,
          evidenceQuality: typeof item.evidenceQuality === 'number' ? item.evidenceQuality : null,
          extractionQuality: typeof item.extractionQuality === 'number' ? item.extractionQuality : null,
          documentCategory: typeof item.documentCategory === 'string' ? item.documentCategory : null,
          documentCategoryConfidence: typeof item.documentCategoryConfidence === 'number' ? item.documentCategoryConfidence : null,
          documentCategoryReasonCodes: Array.isArray(item.documentCategoryReasonCodes)
            ? item.documentCategoryReasonCodes.filter((value: unknown): value is string => typeof value === 'string')
            : [],
          evidenceNature: typeof item.evidenceNature === 'string' ? item.evidenceNature : null,
          excerpt: typeof item.excerpt === 'string' ? item.excerpt : null,
        }));
    } catch {
      return [];
    }
  }

  stanceLabel(reference: EvidenceReference): string {
    if (this.isIgnoredEvidence(reference)) {
      return 'Preuve ignorée';
    }
    switch (reference.stance) {
      case 'SUPPORTS':
        return 'Preuve validée';
      case 'CONTRADICTS':
        return 'Contredit';
      case 'NEUTRAL':
        return 'Neutre';
      case 'INSUFFICIENT':
        return 'Insuffisant';
      default:
        return 'Non qualifié';
    }
  }

  stanceClass(reference: EvidenceReference): string {
    if (this.isIgnoredEvidence(reference)) {
      return 'evidence-badge--ignored';
    }
    switch (reference.stance) {
      case 'SUPPORTS':
        return 'evidence-badge--supports';
      case 'CONTRADICTS':
        return 'evidence-badge--contradicts';
      case 'NEUTRAL':
        return 'evidence-badge--neutral';
      default:
        return 'evidence-badge--insufficient';
    }
  }

  isIgnoredEvidence(reference: EvidenceReference): boolean {
    if (reference.stance !== 'SUPPORTS') {
      return false;
    }
    if (reference.evidenceNature === 'DETERMINISTIC' || reference.evidenceNature === 'STRUCTURED_REPORT') {
      return false;
    }
    return reference.projectRelevanceType !== 'PROJECT_SPECIFIC';
  }

  projectRelevanceLabel(reference: EvidenceReference): string {
    switch (reference.projectRelevanceType) {
      case 'PROJECT_SPECIFIC':
        return 'Projet';
      case 'GENERIC_DOMAIN_CONTENT':
        return 'Générique';
      case 'EVALUATOR_DOCUMENTATION':
        return 'Documentation évaluateur';
      case 'EXAMPLE_OR_TEMPLATE':
        return 'Exemple ou modèle';
      case 'HISTORICAL_CONTENT':
        return 'Historique';
      case 'UNKNOWN':
        return 'Incertain';
      default:
        return '-';
    }
  }

  relevancePercent(reference: EvidenceReference): number | null {
    return this.confidencePercent(reference.calibratedRelevance ?? reference.relevance);
  }

  evidenceReferenceLabel(reference: EvidenceReference): string {
    const sourceType = reference.sourceType || 'Source';
    const location = reference.path
      ? reference.path
      : (reference.page ? `page ${reference.page}` : (reference.deliverableId ? `livrable #${reference.deliverableId}` : ''));
    return `${sourceType}${location ? ` - ${location}` : ''}`;
  }

  criterionStatusLabel(resultat: ResultatCritereResponse): string | null {
    switch (resultat.criterionStatus) {
      case 'SCORED':
        return 'Score calculé';
      case 'INSUFFICIENT_EVIDENCE':
        return 'Preuves insuffisantes';
      case 'INDETERMINATE':
        return 'Indéterminé';
      case 'OK':
        return 'OK';
      case 'NOT_OK':
        return 'NOT_OK';
      default:
        return resultat.criterionStatus ?? null;
    }
  }

  private currentScoreOrNull(): number | null {
    if (this.isCurrentEvaluationUncalculated()) {
      return null;
    }
    return this.evaluation?.scoreFinal ?? null;
  }

  private isCurrentEvaluationUncalculated(): boolean {
    return ['FAILED_RETRYABLE', 'FAILED_PERMANENT', 'MODEL_UNAVAILABLE', 'NOT_EVALUABLE_NO_DELIVERABLE']
      .includes(this.evaluation?.mlStatus ?? this.evaluation?.processingStatus ?? '');
  }

  private uniqueStrings(values: string[] | null | undefined): string[] {
    return Array.from(new Set((values ?? []).filter(Boolean).map((value) => value.trim()).filter(Boolean)));
  }

  private localizedReason(reason: string): string {
    const normalized = reason.trim();
    const labels: Record<string, string> = {
      CRITERION_CONFIGURATION_INCOMPLETE: 'Configuration du critère incomplète.',
      CONFIGURATION_INCOMPLETE: 'Configuration du critère incomplète.',
      NO_VALIDATED_SUPPORTING_EVIDENCE: 'Aucune preuve positive validée n’a été trouvée.',
      RELATED_EVIDENCE_NOT_SCORABLE: 'Les passages génériques, neutres ou contradictoires n’ont pas contribué au score.',
      ELIMINATORY_RESULT_FROM_VALIDATED_EVIDENCE: 'L’état éliminatoire repose sur des preuves validées et des règles factuelles.',
      EVIDENCE_CONDITIONED_SCORE: 'Score calculé à partir de preuves positives validées et traçables.',
      CONFIRMED_NEGATIVE_EVIDENCE: 'Une preuve négative confirmée bloque le critère.',
      DETERMINISTIC_SOURCE_SIGNAL_CONFIRMED: 'Signal factuel structuré confirmé.',
      EVIDENCE_BELOW_MINIMUM_QUALITY: 'La preuve disponible est trop faible pour une évaluation fiable.',
      INSUFFICIENT_EVIDENCE: 'Preuves insuffisantes.',
      ADD_TRACEABLE_EVIDENCE: 'Ajoutez des preuves traçables propres au projet.',
      SECURITY_REJECTED: 'Source rejetée pour des raisons de sécurité.',
      MODEL_UNAVAILABLE: 'Modèle ML indisponible.',
      FAILED_PERMANENT: 'Évaluation impossible.',
      FAILED_RETRYABLE: 'Évaluation temporairement indisponible.',
      MISSING_CRITERION_NAME: 'Nom du critère manquant.',
      MISSING_CRITERION_DESCRIPTION: 'Description du critère manquante.',
      MISSING_MAXIMUM_SCORE: 'Score maximal manquant.',
      MISSING_REQUIRED_EVIDENCE_TYPES: 'Types de preuves requis manquants.',
      MISSING_CRITERION_FAMILY: 'Famille du critère manquante.',
      MISSING_POSITIVE_EVIDENCE_EXPECTATIONS: 'Attentes de preuve positive manquantes.',
      MISSING_NEGATIVE_EVIDENCE_EXPECTATIONS: 'Attentes de preuve négative manquantes.',
      MISSING_CRITERION_VERSION: 'Version de configuration manquante.',
      MISSING_APPLICABILITY: 'Règle d’applicabilité manquante.',
      MISSING_PERMITTED_EVIDENCE_NATURES: 'Natures de preuves autorisées manquantes.',
      MISSING_MINIMUM_SUPPORTING_EVIDENCE_COUNT: 'Nombre minimal de preuves manquant.',
      MISSING_SCORING_POLICY: 'Politique de scoring manquante.',
      MISSING_ELIMINATORY_DECISION_RULE: 'Règle de décision éliminatoire manquante.',
    };
    if (labels[normalized]) {
      return labels[normalized];
    }
    if (normalized.includes('No validated SUPPORTS evidence')) {
      return labels['NO_VALIDATED_SUPPORTING_EVIDENCE'];
    }
    if (normalized.includes('Eliminatory state derived')) {
      return labels['ELIMINATORY_RESULT_FROM_VALIDATED_EVIDENCE'];
    }
    if (normalized.includes('Evidence-conditioned score')) {
      return labels['EVIDENCE_CONDITIONED_SCORE'];
    }
    return normalized;
  }
}
