import { CommonModule } from '@angular/common';
import { Component, OnDestroy, OnInit, HostListener, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Subject, takeUntil } from 'rxjs';
import { EvaluationResponse, ProjetEvaluable } from '../../core/models/evaluation.model';
import { AuthService } from '../../core/services/auth.service';
import { EvaluationService } from '../../core/services/evaluation.service';
import { ProjetEvaluableService } from '../../core/services/projet-evaluable.service';
import { EvaluationChecklistComponent } from '../../shared/components/evaluation-checklist/evaluation-checklist.component';

@Component({
  selector: 'app-evaluation-page',
  standalone: true,
  imports: [CommonModule, FormsModule, EvaluationChecklistComponent],
  templateUrl: './evaluation-page.component.html',
  styleUrl: './evaluation-page.component.scss',
})
export class EvaluationPageComponent implements OnInit, OnDestroy {
  private readonly projetService = inject(ProjetEvaluableService);
  private readonly evaluationService = inject(EvaluationService);
  private readonly authService = inject(AuthService);
  private readonly destroy$ = new Subject<void>();

  readonly projects = signal<ProjetEvaluable[]>([]);
  readonly loadingProjects = signal(false);
  readonly projectsError = signal<string | null>(null);
  readonly savingProjectId = signal<number | null>(null);
  readonly evalResult = signal<EvaluationResponse | null>(null);
  readonly evalHistory = signal<EvaluationResponse[]>([]);
  readonly loadingHistory = signal(false);
  readonly evalError = signal<string | null>(null);
  readonly projectSearch = signal('');
  readonly selectedEligibilite = signal('');
  readonly openFilter = signal<'eligibilite' | null>(null);
  readonly actionInProgress = signal(false);
  readonly validationComment = signal('');
  readonly overrideScore = signal<number | null>(null);
  readonly overrideReason = signal('');
  page = 0;
  readonly pageSize = 8;

  readonly eligibiliteOptions = [
    { value: '', label: 'Toutes les éligibilités' },
    { value: 'ELIGIBLE', label: 'Éligible' },
    { value: 'NON_ELIGIBLE', label: 'Non éligible' },
    { value: 'PENDING', label: 'En attente' },
    { value: 'REVIEW_REQUIRED', label: 'Revue requise' },
  ];

  private readonly COOLDOWN_SECONDS = 120;
  cooldowns = signal<Record<number, number>>({});
  private cooldownTimers = new Map<number, ReturnType<typeof setInterval>>();

  readonly filteredProjects = computed(() => {
    const query = this.normalize(this.projectSearch());
    const elig = this.selectedEligibilite();
    return this.projects().filter((project) => {
      const status = this.projectEligibilityStatus(project);
      const matchElig =
        !elig ||
        (elig === 'NON_ELIGIBLE'
          ? ['NON_ELIGIBLE', 'NON_ELIGIBLE_EN_L_ETAT', 'NOT_EVALUABLE', 'NOT_EVALUABLE_NO_DELIVERABLE'].includes(status)
          : elig === 'PENDING'
            ? status === 'PENDING' || !status
            : status === elig);
      if (!matchElig) return false;
      if (!query) return true;
      return this.normalize([
        project.id,
        project.titre,
        project.statut,
        project.scoreFinal,
        this.projectEligibilityLabel(project),
      ].join(' ')).includes(query);
    });
  });

  readonly totalElements = computed(() => this.filteredProjects().length);
  readonly totalPages = computed(() => Math.max(1, Math.ceil(this.totalElements() / this.pageSize)));
  readonly first = computed(() => this.page <= 0);
  readonly last = computed(() => this.page >= this.totalPages() - 1);
  readonly pageNumbers = computed(() => Array.from({ length: this.totalPages() }, (_, i) => i + 1));
  readonly pageDisplayCount = computed(() => this.pagedProjects().length);
  readonly pagedProjects = computed(() => {
    const start = this.page * this.pageSize;
    return this.filteredProjects().slice(start, start + this.pageSize);
  });

  readonly statsCards = computed(() => [
    { label: 'Projets terminés', value: this.projects().length, icon: 'total' as const },
    { label: 'Évalués', value: this.evaluatedCount, icon: 'evaluated' as const },
    { label: 'Éligibles', value: this.eligibleCount, icon: 'eligible' as const },
    { label: 'Non éligibles', value: this.nonEligibleCount, icon: 'rejected' as const },
  ]);

  selectedProject: ProjetEvaluable | null = null;

  get eligibiliteFilterLabel(): string {
    return this.eligibiliteOptions.find((o) => o.value === this.selectedEligibilite())?.label ?? 'Toutes les éligibilités';
  }

  get evaluatedCount(): number {
    return this.projects().filter((project) => project.scoreFinal != null).length;
  }

  get eligibleCount(): number {
    return this.projects().filter((project) => this.projectEligibilityStatus(project) === 'ELIGIBLE').length;
  }

  get nonEligibleCount(): number {
    return this.projects().filter((project) =>
      ['NON_ELIGIBLE', 'NON_ELIGIBLE_EN_L_ETAT', 'NOT_EVALUABLE'].includes(this.projectEligibilityStatus(project))
    ).length;
  }

  ngOnInit(): void {
    this.loadProjects();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
    Array.from(this.cooldownTimers.keys()).forEach((projectId) => this.clearCooldown(projectId));
  }

  loadProjects(): void {
    this.loadingProjects.set(true);
    this.projectsError.set(null);
    this.projetService.getEvaluables()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (data) => {
          const filtered = data.filter((p) => p.statut === 'REALISATION_TERMINEE');
          this.projects.set(filtered);
          this.loadingProjects.set(false);
          if (filtered.length === 0) {
            this.projectsError.set('Aucun projet termine a evaluer.');
          }
        },
        error: () => {
          this.projectsError.set('Impossible de charger les projets evaluables.');
          this.loadingProjects.set(false);
        },
      });
  }

  selectProject(project: ProjetEvaluable): void {
    this.selectedProject = project;
    this.evalError.set(null);
    this.evalResult.set(null);
    this.evalHistory.set([]);
    this.evaluationService.getLatestEvaluation(project.id)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (evaluation) => {
          this.setCurrentEvaluation(evaluation);
          this.loadEvaluationHistory(project.id);
        },
        error: () => {
          this.evalResult.set(null);
          this.loadEvaluationHistory(project.id);
        },
      });
  }

  calculate(project: ProjetEvaluable): void {
    if (this.isProjectCoolingDown(project.id)) {
      this.evalError.set(`Le score vient d'etre recalcule. Veuillez patienter ${this.cooldownLabel(project.id)} avant un nouveau recalcul.`);
      return;
    }

    this.evalError.set(null);
    this.savingProjectId.set(project.id);

    this.evaluationService.calculateScore(project.id)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (evaluation) => {
          this.selectedProject = project;
          this.setCurrentEvaluation(evaluation);
          this.loadEvaluationHistory(project.id);
          if (this.isBusinessSuccess(evaluation)) {
            this.startCooldown(project.id);
          } else {
            this.evalError.set(this.businessStatusMessage(evaluation));
          }
          this.savingProjectId.set(null);
        },
        error: (error) => {
          const retryAfterSeconds =
            error?.error?.retryAfterSeconds ??
            error?.headers?.get?.('Retry-After') ??
            this.COOLDOWN_SECONDS;

          if (error.status === 409 || error.status === 429) {
            this.startCooldown(project.id, Number(retryAfterSeconds));
            this.evalError.set(`Le score vient d'etre recalcule. Veuillez patienter ${this.cooldownLabel(project.id)} avant un nouveau recalcul.`);
          } else {
            this.evalError.set(this.extractError(error, 'Erreur lors du calcul du score.'));
          }

          this.savingProjectId.set(null);
        },
      });
  }

  loadEvaluationHistory(projectId: number): void {
    this.loadingHistory.set(true);
    this.evaluationService.getEvaluationHistory(projectId)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (history) => {
          this.evalHistory.set(history);
          this.loadingHistory.set(false);
        },
        error: () => {
          this.evalHistory.set([]);
          this.loadingHistory.set(false);
        },
      });
  }

  validateSelectedEvaluation(): void {
    this.runEvaluationAction((projectId) =>
      this.evaluationService.validateEvaluation(projectId, this.validationComment())
    );
  }

  rejectSelectedEvaluation(): void {
    this.runEvaluationAction((projectId) =>
      this.evaluationService.rejectEvaluation(projectId, this.validationComment())
    );
  }

  overrideSelectedEvaluation(): void {
    const score = this.overrideScore();
    if (score == null || score < 0 || score > 100) {
      this.evalError.set('Le score override doit etre compris entre 0 et 100.');
      return;
    }
    this.runEvaluationAction((projectId) =>
      this.evaluationService.overrideEvaluation(projectId, score, this.overrideReason())
    );
  }

  canValidateEvaluation(): boolean {
    const role = this.authService.getRole();
    return role === 'ROLE_ADMIN' || role === 'ROLE_CI';
  }

  canOverrideEvaluation(): boolean {
    return this.authService.getRole() === 'ROLE_ADMIN';
  }

  statusLabel(status: string): string {
    return status === 'REALISATION_TERMINEE' ? 'Réalisation terminée' : status;
  }

  statusBadgeClass(status: string): string {
    return status === 'REALISATION_TERMINEE' ? 'badge--statut-terminee' : 'badge--neutral';
  }

  analyzeButtonTitle(project: ProjetEvaluable): string {
    if (this.savingProjectId() === project.id) {
      return 'Analyse en cours…';
    }
    if (this.isProjectCoolingDown(project.id)) {
      return `Recalcul disponible dans ${this.cooldownLabel(project.id)}`;
    }
    return project.scoreFinal == null ? 'Analyser le contenu' : 'Réanalyser';
  }

  projectScoreClass(project: ProjetEvaluable): string {
    const score = project.latestEvaluation
      ? this.scoreFor(project.latestEvaluation)
      : project.scoreFinal ?? null;
    if (score == null) {
      return 'badge--score-pending';
    }
    if (score >= 75) {
      return 'badge--score-high';
    }
    if (score >= 50) {
      return 'badge--score-mid';
    }
    return 'badge--score-low';
  }

  updateProjectSearch(value: string): void {
    this.projectSearch.set(value);
    this.page = 0;
  }

  @HostListener('document:click')
  closeFiltersOnOutsideClick(): void {
    this.openFilter.set(null);
  }

  toggleFilter(filter: 'eligibilite', event: Event): void {
    event.stopPropagation();
    this.openFilter.update((current) => (current === filter ? null : filter));
  }

  selectEligibiliteFilter(value: string): void {
    this.selectedEligibilite.set(value);
    this.openFilter.set(null);
    this.page = 0;
  }

  prevPage(): void {
    if (!this.first()) this.page--;
  }

  nextPage(): void {
    if (!this.last()) this.page++;
  }

  goToPage(newPage: number): void {
    if (newPage < 0 || newPage >= this.totalPages() || newPage === this.page) return;
    this.page = newPage;
  }

  getInitial(titre: string): string {
    return (titre?.trim()?.charAt(0) || '?').toUpperCase();
  }

  updateValidationComment(value: string): void {
    this.validationComment.set(value);
  }

  updateOverrideScore(value: unknown): void {
    const parsed = Number(value);
    this.overrideScore.set(Number.isNaN(parsed) ? null : parsed);
  }

  updateOverrideReason(value: string): void {
    this.overrideReason.set(value);
  }

  confidencePercent(value: number | null | undefined): string {
    if (value == null) {
      return '-';
    }
    const percent = value <= 1 ? value * 100 : value;
    return `${Math.round(Math.max(0, Math.min(100, percent)))}%`;
  }

  scoreFor(evaluation: EvaluationResponse | null): number | null {
    if (!evaluation) {
      return null;
    }
    if (evaluation.finalValidatedScore != null) {
      return evaluation.finalValidatedScore;
    }
    if (this.isEvaluationUncalculated(evaluation)) {
      return null;
    }
    return evaluation.scoreFinal ?? null;
  }

  scoreLabelFor(evaluation: EvaluationResponse | null): string {
    return this.formatScore(this.scoreFor(evaluation));
  }

  scoreTitleFor(evaluation: EvaluationResponse | null): string {
    if (!evaluation || this.isEvaluationUncalculated(evaluation)) {
      return 'Score non calculé';
    }
    if (['VALIDATED', 'OVERRIDDEN'].includes(evaluation.validationStatus ?? '') && evaluation.finalValidatedScore != null) {
      return 'Score final validé';
    }
    if (evaluation.mlStatus === 'PARTIAL_ANALYSIS' || evaluation.processingStatus === 'PARTIAL_ANALYSIS') {
      return 'Score provisoire';
    }
    return 'Score officiel provisoire';
  }

  mlScoreLabelFor(evaluation: EvaluationResponse | null): string {
    if (!evaluation || this.isEvaluationUncalculated(evaluation)) {
      return 'Non calculé';
    }
    return this.formatScore(evaluation.mlScore ?? evaluation.scoreFinal ?? null);
  }

  eligibilityLabelFor(evaluation: EvaluationResponse | null): string {
    const status = (evaluation?.eligibilityStatus || '').toUpperCase();

    switch (status) {
      case 'ELIGIBLE':
        return 'Éligible';
      case 'REVIEW_REQUIRED':
        return 'Revue requise';
      case 'NON_ELIGIBLE':
        return 'Non éligible';
      case 'NON_ELIGIBLE_EN_L_ETAT':
        return 'Non éligible en l’état';
      case 'NOT_EVALUABLE':
      case 'NOT_EVALUABLE_NO_DELIVERABLE':
        return 'Non évaluable';
      default:
        if (!evaluation || this.isEvaluationUncalculated(evaluation)) {
          return 'Non calculé';
        }
        if (evaluation.eligibleIndustrialisation === true) {
          return 'Éligible';
        }
        if (evaluation.scoreFinal != null && !evaluation.hasEliminatoryWarnings && (evaluation.eliminatoryWarningsCount ?? 0) === 0) {
          return 'Revue requise';
        }
        return evaluation.eligibleIndustrialisation === false ? 'Non éligible' : 'Non calculé';
    }
  }

  validationStatusLabel(status: string | null | undefined): string {
    switch (status) {
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

  isProjectCoolingDown(projectId: number): boolean {
    return (this.cooldowns()[projectId] ?? 0) > 0;
  }

  cooldownRemaining(projectId: number): number {
    return this.cooldowns()[projectId] ?? 0;
  }

  cooldownLabel(projectId: number): string {
    const seconds = this.cooldownRemaining(projectId);
    const minutes = Math.floor(seconds / 60);
    const rest = seconds % 60;
    return `${minutes}:${rest.toString().padStart(2, '0')}`;
  }

  private runEvaluationAction(operation: (projectId: number) => ReturnType<EvaluationService['validateEvaluation']>): void {
    const projectId = this.selectedProject?.id;
    if (!projectId || this.actionInProgress()) {
      return;
    }
    this.actionInProgress.set(true);
    this.evalError.set(null);
    operation(projectId)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (evaluation) => {
          this.setCurrentEvaluation(evaluation);
          this.loadEvaluationHistory(projectId);
          this.validationComment.set('');
          this.overrideReason.set('');
          this.overrideScore.set(evaluation.finalValidatedScore ?? evaluation.scoreFinal ?? null);
          this.actionInProgress.set(false);
        },
        error: (error) => {
          this.evalError.set(this.extractError(error, 'Action impossible sur cette evaluation.'));
          this.actionInProgress.set(false);
        },
      });
  }

  private setCurrentEvaluation(evaluation: EvaluationResponse): void {
    this.evalResult.set(evaluation);
    this.overrideScore.set(evaluation.finalValidatedScore ?? evaluation.scoreFinal ?? null);
    const evaluationProjectId = evaluation.sujetProjetId;
    if (evaluationProjectId == null) {
      return;
    }
    this.projects.update((projects) =>
      projects.map((project) =>
        project.id === evaluationProjectId
          ? {
              ...project,
              scoreFinal: this.scoreFor(evaluation),
              eligibleIndustrialisation: evaluation.eligibleIndustrialisation,
              bloqueParEliminatoire: evaluation.bloqueParEliminatoire,
              latestEvaluation: evaluation,
            }
          : project
      )
    );
    const selectedProject = this.selectedProject;
    if (selectedProject?.id === evaluationProjectId) {
      this.selectedProject = {
        ...selectedProject,
        scoreFinal: this.scoreFor(evaluation),
        eligibleIndustrialisation: evaluation.eligibleIndustrialisation,
        bloqueParEliminatoire: evaluation.bloqueParEliminatoire,
        latestEvaluation: evaluation,
      };
    }
  }

  projectScoreLabel(project: ProjetEvaluable): string {
    if (project.latestEvaluation) {
      return this.scoreLabelFor(project.latestEvaluation);
    }
    return this.formatScore(project.scoreFinal ?? null);
  }

  projectEligibilityLabel(project: ProjetEvaluable): string {
    if (project.latestEvaluation) {
      return this.eligibilityLabelFor(project.latestEvaluation);
    }

    switch (this.projectEligibilityStatus(project)) {
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
        return 'En attente';
    }
  }

  projectEligibilityClass(project: ProjetEvaluable): string {
    const status = this.projectEligibilityStatus(project);
    switch (status) {
      case 'ELIGIBLE':
        return 'badge--eligible';
      case 'REVIEW_REQUIRED':
        return 'badge--review';
      case 'NON_ELIGIBLE':
      case 'NON_ELIGIBLE_EN_L_ETAT':
        return 'badge--non-eligible';
      case 'NOT_EVALUABLE':
      case 'NOT_EVALUABLE_NO_DELIVERABLE':
        return 'badge--not-evaluable';
      default:
        return 'badge--pending';
    }
  }

  eligibilityDotClass(project: ProjetEvaluable): string {
    const status = this.projectEligibilityStatus(project);
    if (status === 'ELIGIBLE') return 'dot-eligible';
    if (status === 'REVIEW_REQUIRED') return 'dot-review';
    if (['NON_ELIGIBLE', 'NON_ELIGIBLE_EN_L_ETAT'].includes(status)) return 'dot-non-eligible';
    if (['NOT_EVALUABLE', 'NOT_EVALUABLE_NO_DELIVERABLE'].includes(status)) return 'dot-not-evaluable';
    return 'dot-pending';
  }

  private normalize(value: unknown): string {
    return String(value ?? '')
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .trim();
  }

  private formatScore(score: number | null | undefined): string {
    return score == null ? 'Non calculé' : `${Number(score).toFixed(2)} / 100`;
  }

  private evaluationStatus(evaluation: EvaluationResponse | null | undefined): string {
    return (evaluation?.processingStatus || evaluation?.mlStatus || '').toUpperCase();
  }

  private projectEligibilityStatus(project: ProjetEvaluable): string {
    const latestStatus = (project.latestEvaluation?.eligibilityStatus || '').toUpperCase();
    if (latestStatus) {
      return latestStatus;
    }

    if (project.eligibleIndustrialisation === true) {
      return 'ELIGIBLE';
    }

    if (project.eligibleIndustrialisation === false) {
      if (project.bloqueParEliminatoire === true) {
        return 'NON_ELIGIBLE_EN_L_ETAT';
      }
      if (project.scoreFinal != null) {
        return 'REVIEW_REQUIRED';
      }
      return 'NON_ELIGIBLE';
    }

    return 'PENDING';
  }

  private isEvaluationUncalculated(evaluation: EvaluationResponse): boolean {
    return ['FAILED_RETRYABLE', 'FAILED_PERMANENT', 'MODEL_UNAVAILABLE', 'NOT_EVALUABLE_NO_DELIVERABLE', 'NOT_EVALUABLE']
      .includes(this.evaluationStatus(evaluation));
  }

  private isBusinessSuccess(evaluation: EvaluationResponse): boolean {
    return ['COMPLETED', 'COMPLETED_WITH_WARNINGS', 'PARTIAL_ANALYSIS']
      .includes(this.evaluationStatus(evaluation));
  }

  private businessStatusMessage(evaluation: EvaluationResponse): string {
    const status = this.evaluationStatus(evaluation);
    if (status === 'FAILED_PERMANENT' && (evaluation.incompleteCriteriaCount ?? 0) > 0) {
      return 'L’évaluation n’a pas pu être effectuée car la configuration des critères est incomplète.';
    }
    if (status === 'MODEL_UNAVAILABLE') {
      return 'Le modèle ML n’est pas disponible.';
    }
    if (status === 'FAILED_RETRYABLE') {
      return 'L’évaluation est temporairement indisponible. Veuillez réessayer.';
    }
    if (status === 'INSUFFICIENT_EVIDENCE') {
      return 'Analyse terminée, preuves insuffisantes pour calculer un score.';
    }
    if (status === 'NOT_EVALUABLE' || status === 'NOT_EVALUABLE_NO_DELIVERABLE') {
      return 'Le projet n’est pas évaluable avec les livrables disponibles.';
    }
    return 'L’évaluation n’a pas pu être effectuée.';
  }

  private extractError(error: any, fallback: string): string {
    return error?.error?.detail || error?.error?.message || fallback;
  }

  private startCooldown(projectId: number, seconds = this.COOLDOWN_SECONDS): void {
    this.clearCooldown(projectId);

    this.cooldowns.update((current) => ({
      ...current,
      [projectId]: seconds,
    }));

    const timer = setInterval(() => {
      const remaining = this.cooldownRemaining(projectId);
      if (remaining <= 1) {
        this.clearCooldown(projectId);
        return;
      }
      this.cooldowns.update((current) => ({
        ...current,
        [projectId]: remaining - 1,
      }));
    }, 1000);

    this.cooldownTimers.set(projectId, timer);
  }

  private clearCooldown(projectId: number): void {
    const timer = this.cooldownTimers.get(projectId);
    if (timer) {
      clearInterval(timer);
      this.cooldownTimers.delete(projectId);
    }

    this.cooldowns.update((current) => {
      const copy = { ...current };
      delete copy[projectId];
      return copy;
    });
  }
}
