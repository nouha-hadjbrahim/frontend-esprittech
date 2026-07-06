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

  get evaluationComplete(): boolean {
    return this.evaluation?.evaluationComplete !== false;
  }

  get hasBlockingCriteria(): boolean {
    return (this.evaluation?.blockingCriteriaNames?.length ?? 0) > 0
      || this.eliminatoires.some((resultat) => resultat.reponseEliminatoire === 'NOT_OK');
  }

  get scorePercent(): number {
    return Math.max(0, Math.min(100, this.displayScore));
  }

  get displayScore(): number {
    return this.evaluation?.finalValidatedScore ?? this.evaluation?.scoreFinal ?? 0;
  }

  get mlScore(): number {
    return this.evaluation?.mlScore ?? this.evaluation?.scoreFinal ?? 0;
  }

  get validationLabel(): string {
    switch (this.evaluation?.validationStatus) {
      case 'VALIDATED':
        return 'Validee';
      case 'REJECTED':
        return 'Rejetee';
      case 'OVERRIDDEN':
        return 'Override admin';
      case 'PENDING':
      default:
        return 'En attente';
    }
  }

  get statusLabel(): string {
    switch (this.evaluation?.eligibilityStatus) {
      case 'ELIGIBLE':
        return 'GO - Eligible';
      case 'REVIEW_REQUIRED':
        return 'Revue requise';
      case 'NON_ELIGIBLE_EN_L_ETAT':
        return 'Non eligible en l etat';
      case 'NOT_EVALUABLE':
        return 'Non evaluable';
    }
    if (this.evaluation?.eligibleIndustrialisation && !this.evaluationComplete) {
      return 'Analyse necessaire';
    }
    if (this.evaluation?.eligibleIndustrialisation && this.hasBlockingCriteria) {
      return 'Eligible avec alertes';
    }
    return this.evaluation?.eligibleIndustrialisation ? 'GO - Eligible' : 'NO GO - Non eligible';
  }

  get statusClass(): string {
    if (this.evaluation?.eligibilityStatus === 'NON_ELIGIBLE_EN_L_ETAT' || this.evaluation?.eligibilityStatus === 'NOT_EVALUABLE') {
      return 'decision-badge--no';
    }
    if (this.evaluation?.eligibilityStatus === 'REVIEW_REQUIRED') {
      return 'decision-badge--warning';
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
      return 'Indetermine';
    }
    if (resultat.typeCritere === 'ELIMINATOIRE') {
      return resultat.reponseEliminatoire ?? 'Non renseigne';
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
          deliverableId: typeof item.deliverableId === 'number' ? item.deliverableId : null,
          sourceType: typeof item.sourceType === 'string' ? item.sourceType : null,
          source: typeof item.source === 'string' ? item.source : null,
          page: typeof item.page === 'number' ? item.page : null,
          path: typeof item.path === 'string' ? item.path : null,
          contentHash: typeof item.contentHash === 'string' ? item.contentHash : null,
          relevance: typeof item.relevance === 'number' ? item.relevance : null,
          excerpt: typeof item.excerpt === 'string' ? item.excerpt : null,
        }));
    } catch {
      return [];
    }
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
        return 'Score calcule';
      case 'INSUFFICIENT_EVIDENCE':
        return 'Preuves insuffisantes';
      case 'INDETERMINATE':
        return 'Indetermine';
      case 'OK':
        return 'OK';
      case 'NOT_OK':
        return 'NOT_OK';
      default:
        return resultat.criterionStatus ?? null;
    }
  }
}
