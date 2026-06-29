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
    return Math.max(0, Math.min(100, this.evaluation?.scoreFinal ?? 0));
  }

  get statusLabel(): string {
    if (this.evaluation?.eligibleIndustrialisation && !this.evaluationComplete) {
      return 'Analyse necessaire';
    }
    return this.evaluation?.eligibleIndustrialisation ? 'GO - Eligible' : 'NO GO - Non eligible';
  }

  get statusClass(): string {
    if (!this.evaluation?.eligibleIndustrialisation || this.hasBlockingCriteria) {
      return 'decision-badge--no';
    }
    if (!this.evaluationComplete) {
      return 'decision-badge--warning';
    }
    return 'decision-badge--go';
  }

  get progressClass(): string {
    if (!this.evaluation?.eligibleIndustrialisation || this.hasBlockingCriteria) {
      return 'checklist-progress__bar--danger';
    }
    if (!this.evaluationComplete) {
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

  get nonConfiguredCount(): number {
    return this.evaluation?.resultats?.filter((resultat) => resultat.ruleConfigured === false).length ?? 0;
  }

  isBlocking(resultat: ResultatCritereResponse): boolean {
    return resultat.typeCritere === 'ELIMINATOIRE' && resultat.reponseEliminatoire === 'NOT_OK';
  }

  resultLabel(resultat: ResultatCritereResponse): string {
    if (resultat.typeCritere === 'ELIMINATOIRE') {
      return resultat.reponseEliminatoire ?? 'Non renseigne';
    }
    const note = resultat.noteObtenue ?? 0;
    const bareme = resultat.bareme ?? resultat.scorePondere ?? 0;
    return `${note} / ${bareme}`;
  }
}
