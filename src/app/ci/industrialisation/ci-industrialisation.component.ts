import { CommonModule } from '@angular/common';
import { Component, OnInit, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import {
  CandidatureIndustrialisation,
  ORIENTATION_OPTIONS,
  OrientationIndustrialisation,
  STATUT_INDUSTRIALISATION_LABELS,
  StatutIndustrialisation,
  TYPE_INDUSTRIALISATION_LABELS,
  TypeIndustrialisation,
} from '../../core/models/industrialisation.model';
import { TYPE_LIVRABLE_LABELS } from '../../core/models/livrable.model';
import { IndustrialisationService } from '../../core/services/industrialisation.service';
import { LivrableService } from '../../core/services/livrable.service';
import { EvaluationChecklistComponent } from '../../shared/components/evaluation-checklist/evaluation-checklist.component';

@Component({
  selector: 'app-ci-industrialisation',
  standalone: true,
  imports: [CommonModule, FormsModule, EvaluationChecklistComponent],
  templateUrl: './ci-industrialisation.component.html',
  styleUrl: './ci-industrialisation.component.css',
})
export class CiIndustrialisationComponent implements OnInit {
  private readonly service = inject(IndustrialisationService);
  private readonly livrableService = inject(LivrableService);

  demandes = signal<CandidatureIndustrialisation[]>([]);
  selected = signal<CandidatureIndustrialisation | null>(null);
  loading = signal(false);
  detailLoading = signal(false);
  error = signal<string | null>(null);
  message = signal<string | null>(null);

  statutFilter = '';
  typeFilter = '';
  decisionMode: 'GO' | 'NO_GO' | null = null;
  orientation: OrientationIndustrialisation | '' = '';
  commentaire = '';
  motif = '';

  readonly statutLabels = STATUT_INDUSTRIALISATION_LABELS;
  readonly typeLabels = TYPE_INDUSTRIALISATION_LABELS;
  readonly livrableLabels = TYPE_LIVRABLE_LABELS;
  readonly orientations = ORIENTATION_OPTIONS;
  readonly statuts: StatutIndustrialisation[] = ['SOUMISE', 'RECUE_PAR_CI', 'A_COMPLETER', 'RECEVABLE', 'GO', 'NO_GO', 'REFUSEE'];
  readonly types: TypeIndustrialisation[] = ['INTERNE', 'EXTERNE'];

  ngOnInit(): void {
    this.load();
  }

  load(): void {
    this.loading.set(true);
    this.service.findCiRequests({
      statut: this.statutFilter as StatutIndustrialisation || undefined,
      type: this.typeFilter as TypeIndustrialisation || undefined,
    }).subscribe({
      next: (demandes) => {
        this.demandes.set(demandes);
        this.loading.set(false);
        if (!this.selected() && demandes.length) {
          this.openDetail(demandes[0].id);
        }
      },
      error: () => {
        this.error.set('Impossible de charger les demandes.');
        this.loading.set(false);
      },
    });
  }

  openDetail(id: number): void {
    this.detailLoading.set(true);
    this.service.getCiDetail(id).subscribe({
      next: (detail) => {
        this.selected.set(detail);
        this.detailLoading.set(false);
        this.closeDecision();
      },
      error: () => {
        this.error.set('Impossible de charger le detail.');
        this.detailLoading.set(false);
      },
    });
  }

  openDecision(mode: 'GO' | 'NO_GO'): void {
    this.decisionMode = mode;
    this.orientation = '';
    this.commentaire = '';
    this.motif = '';
  }

  closeDecision(): void {
    this.decisionMode = null;
  }

  decideGo(): void {
    const candidature = this.selected();
    if (!candidature || !this.orientation) {
      this.error.set('Orientation obligatoire.');
      return;
    }
    this.service.decideGo(candidature.id, {
      orientation: this.orientation,
      commentaire: this.commentaire || undefined,
    }).subscribe({
      next: (updated) => this.afterDecision(updated, 'Decision Go enregistree.'),
      error: (err) => this.error.set(err?.error?.detail ?? 'Decision Go impossible.'),
    });
  }

  decideNoGo(): void {
    const candidature = this.selected();
    if (!candidature || !this.motif.trim()) {
      this.error.set('Motif obligatoire.');
      return;
    }
    this.service.decideNoGo(candidature.id, { motif: this.motif.trim() }).subscribe({
      next: (updated) => this.afterDecision(updated, 'Decision No Go enregistree.'),
      error: (err) => this.error.set(err?.error?.detail ?? 'Decision No Go impossible.'),
    });
  }

  afterDecision(updated: CandidatureIndustrialisation, message: string): void {
    this.selected.set(updated);
    this.message.set(message);
    this.closeDecision();
    this.load();
    setTimeout(() => this.message.set(null), 2500);
  }

  canDecide(candidature: CandidatureIndustrialisation | null): boolean {
    return !!candidature && ['SOUMISE', 'RECUE_PAR_CI', 'RECEVABLE'].includes(candidature.statut);
  }

  downloadLivrable(id: number): string {
    return this.livrableService.downloadUrl(id);
  }

  answerValue(answer: CandidatureIndustrialisation['reponses'][number]): string {
    if (answer.valeurTexte) return answer.valeurTexte;
    if (answer.valeurUrl) return answer.valeurUrl;
    if (answer.valeurNumerique != null) return String(answer.valeurNumerique);
    if (answer.valeurBoolean != null) return answer.valeurBoolean ? 'Oui' : 'Non';
    if (answer.preuveOriginalFileName) return answer.preuveOriginalFileName;
    if (answer.reponseEliminatoire) return answer.reponseEliminatoire;
    return '-';
  }

  blockingCriteriaCount(candidature: CandidatureIndustrialisation): number {
    return candidature.latestEvaluation?.resultats
      ?.filter((resultat) => resultat.typeCritere === 'ELIMINATOIRE' && resultat.reponseEliminatoire === 'NOT_OK')
      .length ?? (candidature.bloqueParEliminatoire ? 1 : 0);
  }

  recommendation(candidature: CandidatureIndustrialisation): string {
    if (this.blockingCriteriaCount(candidature) > 0 || candidature.eligibleIndustrialisation === false) {
      return 'NO GO recommande';
    }
    if (candidature.latestEvaluation?.evaluationComplete === false) {
      return 'Analyse necessaire';
    }
    if (candidature.eligibleIndustrialisation && (candidature.scoreEvaluationProjet ?? 0) >= 70) {
      return 'GO recommande';
    }
    return 'Analyse necessaire';
  }

  recommendationExplanation(candidature: CandidatureIndustrialisation): string {
    if (this.blockingCriteriaCount(candidature) > 0 || candidature.eligibleIndustrialisation === false) {
      return 'Le systeme recommande NO GO car un critere eliminatoire est NOT_OK.';
    }
    if (candidature.latestEvaluation?.evaluationComplete === false) {
      return 'Analyse necessaire : certaines regles automatiques ne sont pas configurees.';
    }
    return 'Le systeme recommande GO car les criteres bloquants sont satisfaits.';
  }

  nonConfiguredCount(candidature: CandidatureIndustrialisation): number {
    return candidature.latestEvaluation?.resultats?.filter((resultat) => resultat.ruleConfigured === false).length ?? 0;
  }
}
