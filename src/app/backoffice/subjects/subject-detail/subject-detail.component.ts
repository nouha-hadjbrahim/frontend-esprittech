import { CommonModule } from '@angular/common';
import { Component, OnInit, inject } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { SujetProjet } from '../../../core/models/sujet-projet.model';
import { AdminService } from '../../../core/services/admin.service';
import { ConfirmDialog } from '../../../shared/components/confirm-dialog/confirm-dialog';
import { DeposerSujetModal } from '../../../frontoffice/components/sujets/deposer-sujet-modal/deposer-sujet-modal';
import { CATEGORIE_LABELS, STATUT_LABELS } from '../../../frontoffice/constants/sujet-projet.constants';

@Component({
  selector: 'app-subject-detail',
  standalone: true,
  imports: [CommonModule, RouterLink, ConfirmDialog, DeposerSujetModal],
  templateUrl: './subject-detail.component.html',
  styleUrl: './subject-detail.component.css',
})
export class SubjectDetailComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly adminService = inject(AdminService);

  sujet: SujetProjet | null = null;
  isLoading = true;
  loadError = '';

  deleteConfirmOpen = false;
  deleting = false;

  editModalOpen = false;

  readonly techColorClasses = ['tag--green', 'tag--purple', 'tag--yellow', 'tag--teal'];

  ngOnInit(): void {
    const id = Number(this.route.snapshot.paramMap.get('id'));

    if (!Number.isFinite(id) || id <= 0) {
      this.loadError = 'Identifiant du sujet invalide.';
      this.isLoading = false;
      return;
    }

    this.loadSujet(id);
  }

  private loadSujet(id: number): void {
    this.isLoading = true;
    this.loadError = '';

    this.adminService.getSujetById(id).subscribe({
      next: (sujet) => {
        this.sujet = sujet;
        this.isLoading = false;
      },
      error: () => {
        this.loadError = 'Impossible de charger ce sujet.';
        this.isLoading = false;
      },
    });
  }

  get categorieLabel(): string {
    return this.sujet ? (CATEGORIE_LABELS[this.sujet.categorie]?.label ?? this.sujet.categorie) : '';
  }

  get statutLabel(): string {
    return this.sujet ? (STATUT_LABELS[this.sujet.statut]?.label ?? this.sujet.statut) : '';
  }

  get scoreFinalLabel(): string {
    return this.formatScore(this.currentScoreFinal());
  }

  get eligibilityLabel(): string {
    return this.displayEligibilityStatus();
  }

  get eligibilityClass(): string {
    const status = this.currentEligibilityStatus();

    if (status === 'ELIGIBLE') {
      return 'eligibility-pill--eligible';
    }

    if (status === 'REVIEW_REQUIRED') {
      return 'eligibility-pill--review';
    }

    if (status === 'NON_ELIGIBLE' || status === 'NON_ELIGIBLE_EN_L_ETAT' || status === 'NOT_EVALUABLE') {
      return 'eligibility-pill--not-eligible';
    }

    return 'eligibility-pill--unknown';
  }

  getStatutClass(statut: SujetProjet['statut']): string {
    const cssClass = STATUT_LABELS[statut]?.cssClass ?? 'badge--neutral';
    switch (cssClass) {
      case 'badge--success':
        return 'status-success';
      case 'badge--danger':
        return 'status-danger';
      case 'badge--warning':
      case 'badge--progress':
        return 'status-warning';
      case 'badge--info':
        return 'status-info';
      default:
        return 'status-neutral';
    }
  }

  getObjectifLines(): string[] {
    if (!this.sujet?.objectifs) {
      return [];
    }

    const lines = this.sujet.objectifs
      .split('\n')
      .map((line) => line.trim())
      .filter(Boolean);

    return lines.length > 0 ? lines : [this.sujet.objectifs];
  }

  getTechColor(index: number): string {
    return this.techColorClasses[index % this.techColorClasses.length];
  }

  formatDate(iso: string | null | undefined): string {
    if (!iso) {
      return '—';
    }
    return iso.substring(0, 10);
  }

  formatScore(score: number | null | undefined): string {
    if (score === null || score === undefined || Number.isNaN(Number(score))) {
      return 'Non calculé';
    }

    return `${Number(score).toFixed(2)} / 100`;
  }

  displayEligibilityStatus(): string {
    const status = this.currentEligibilityStatus();

    switch (status) {
      case 'ELIGIBLE':
        return 'Éligible';

      case 'REVIEW_REQUIRED':
        return 'Revue requise';

      case 'NON_ELIGIBLE':
      case 'NON_ELIGIBLE_EN_L_ETAT':
        return 'Non éligible';

      case 'NOT_EVALUABLE':
        return 'Non évaluable';

      default:
        return 'Non calculé';
    }
  }

  private currentEvaluationSource(): Record<string, unknown> | null {
    if (!this.sujet) {
      return null;
    }

    const sujetAny = this.sujet as unknown as Record<string, unknown>;

    return (
      (sujetAny['latestEvaluation'] as Record<string, unknown> | undefined) ??
      (sujetAny['evaluation'] as Record<string, unknown> | undefined) ??
      (sujetAny['lastEvaluation'] as Record<string, unknown> | undefined) ??
      sujetAny
    );
  }

  private currentScoreFinal(): number | null {
    const source = this.currentEvaluationSource();
    const score = source?.['scoreFinal'] ?? source?.['mlScore'] ?? source?.['scoreFinalEvaluation'];

    return typeof score === 'number' ? score : score != null && !Number.isNaN(Number(score)) ? Number(score) : null;
  }

  private currentEligibilityStatus(): string {
    const source = this.currentEvaluationSource();
    const rawStatus = String(source?.['eligibilityStatus'] ?? '').trim().toUpperCase();

    if (rawStatus) {
      return rawStatus;
    }

    const eligibleIndustrialisation = source?.['eligibleIndustrialisation'];
    const scoreFinal = this.currentScoreFinal();

    const hasBlockingEliminatory =
      source?.['bloqueParEliminatoire'] === true ||
      source?.['hasEliminatoryWarnings'] === true ||
      Number(source?.['eliminatoryWarningsCount'] ?? 0) > 0;

    if (hasBlockingEliminatory) {
      return 'NON_ELIGIBLE';
    }

    if (eligibleIndustrialisation === true) {
      return 'ELIGIBLE';
    }

    // Important: in the ML workflow, eligibleIndustrialisation=false can simply mean
    // REVIEW_REQUIRED when the score is calculated but execution/security evidence is missing.
    if (scoreFinal !== null) {
      return 'REVIEW_REQUIRED';
    }

    return '';
  }

  openEditModal(): void {
    this.editModalOpen = true;
  }

  closeEditModal(): void {
    this.editModalOpen = false;
  }

  onEditSaved(): void {
    this.closeEditModal();
    if (!this.sujet) {
      return;
    }

    this.loadSujet(this.sujet.id);
  }

  openDeleteConfirm(): void {
    this.deleteConfirmOpen = true;
  }

  cancelDelete(): void {
    this.deleteConfirmOpen = false;
    this.deleting = false;
  }

  confirmDelete(): void {
    if (!this.sujet) {
      return;
    }

    this.deleting = true;
    this.adminService.deleteSujet(this.sujet.id).subscribe({
      next: () => {
        this.deleting = false;
        this.deleteConfirmOpen = false;
        this.router.navigate(['/backoffice/subjects']);
      },
      error: () => {
        this.deleting = false;
        this.deleteConfirmOpen = false;
        this.loadError = 'Échec de la suppression.';
      },
    });
  }

  get deleteConfirmMessage(): string {
    return this.sujet
      ? `Voulez-vous vraiment supprimer « ${this.sujet.titre} » ? Cette action est irréversible.`
      : '';
  }
}
