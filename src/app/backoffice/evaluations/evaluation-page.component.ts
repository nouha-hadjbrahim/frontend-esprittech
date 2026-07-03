import { CommonModule } from '@angular/common';
import { Component, OnDestroy, OnInit, computed, inject, signal } from '@angular/core';
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
  readonly actionInProgress = signal(false);
  readonly validationComment = signal('');
  readonly overrideScore = signal<number | null>(null);
  readonly overrideReason = signal('');

  private readonly COOLDOWN_SECONDS = 120;
  cooldowns = signal<Record<number, number>>({});
  private cooldownTimers = new Map<number, ReturnType<typeof setInterval>>();

  readonly filteredProjects = computed(() => {
    const query = this.normalize(this.projectSearch());
    if (!query) {
      return this.projects();
    }
    if (query === 'eligible') {
      return this.projects().filter((project) => project.eligibleIndustrialisation === true);
    }
    if (query === 'non eligible' || query === 'noneligible') {
      return this.projects().filter((project) => project.eligibleIndustrialisation === false);
    }
    if (query === 'en attente' || query === 'attente') {
      return this.projects().filter((project) => project.eligibleIndustrialisation == null);
    }
    return this.projects().filter((project) =>
      this.normalize([
        project.id,
        project.titre,
        project.statut,
        project.scoreFinal,
        project.eligibleIndustrialisation == null
          ? 'en attente'
          : project.eligibleIndustrialisation ? 'eligible' : 'non eligible',
      ].join(' ')).includes(query)
    );
  });

  selectedProject: ProjetEvaluable | null = null;

  get evaluatedCount(): number {
    return this.projects().filter((project) => project.scoreFinal != null).length;
  }

  get eligibleCount(): number {
    return this.projects().filter((project) => project.eligibleIndustrialisation === true).length;
  }

  get nonEligibleCount(): number {
    return this.projects().filter((project) => project.eligibleIndustrialisation === false).length;
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
          this.startCooldown(project.id);
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
    return status === 'REALISATION_TERMINEE' ? 'Realisation terminee' : status;
  }

  updateProjectSearch(value: string): void {
    this.projectSearch.set(value);
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
    return evaluation.finalValidatedScore ?? evaluation.scoreFinal ?? null;
  }

  validationStatusLabel(status: string | null | undefined): string {
    switch (status) {
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
    this.projects.update((projects) =>
      projects.map((project) =>
        project.id === evaluation.sujetProjetId
          ? {
              ...project,
              scoreFinal: this.scoreFor(evaluation),
              eligibleIndustrialisation: evaluation.eligibleIndustrialisation,
              bloqueParEliminatoire: evaluation.bloqueParEliminatoire,
            }
          : project
      )
    );
    if (this.selectedProject?.id === evaluation.sujetProjetId) {
      this.selectedProject = {
        ...this.selectedProject,
        scoreFinal: this.scoreFor(evaluation),
        eligibleIndustrialisation: evaluation.eligibleIndustrialisation,
        bloqueParEliminatoire: evaluation.bloqueParEliminatoire,
      };
    }
  }

  private normalize(value: unknown): string {
    return String(value ?? '')
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .trim();
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
