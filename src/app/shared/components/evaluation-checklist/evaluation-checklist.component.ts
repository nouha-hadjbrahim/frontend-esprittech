import { CommonModule } from '@angular/common';
import { Component, Input } from '@angular/core';
import { EvaluationResponse, ResultatCritereResponse } from '../../../core/models/evaluation.model';

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
    if (this.evaluation?.eligibleIndustrialisation && !this.evaluationComplete) {
      return 'Analyse necessaire';
    }
    if (this.evaluation?.eligibleIndustrialisation && this.hasBlockingCriteria) {
      return 'Eligible avec alertes';
    }
    return this.evaluation?.eligibleIndustrialisation ? 'GO - Eligible' : 'NO GO - Non eligible';
  }

  get statusClass(): string {
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
    if (resultat.typeCritere === 'ELIMINATOIRE') {
      return resultat.reponseEliminatoire ?? 'Non renseigne';
    }
    if (resultat.mlScore != null && resultat.mlMaxScore != null) {
      const score = this.formatNumber(resultat.mlScore);
      const max = this.formatNumber(resultat.mlMaxScore);
      const normalized = resultat.normalizedScore != null ? ` - ${this.formatNumber(resultat.normalizedScore)}/100` : '';
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
    const ids = resultat.evidenceLivrableIds?.length
      ? ` Livrables: ${resultat.evidenceLivrableIds.map((id) => `#${id}`).join(', ')}.`
      : '';
    return `${resultat.evidenceSummary ?? ''}${ids}`.trim();
  }

  hasCriterionDetails(resultat: ResultatCritereResponse): boolean {
    return !!(
      resultat.explanation
      || resultat.evidenceSummary
      || resultat.evidenceLivrableIds?.length
      || resultat.strengths?.length
      || resultat.weaknesses?.length
      || resultat.recommendations?.length
    );
  }

  private formatNumber(value: number): string {
    return Number.isInteger(value) ? String(value) : value.toFixed(1);
  }
}
