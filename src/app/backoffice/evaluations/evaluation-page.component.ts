import { CommonModule } from '@angular/common';
import { Component, OnDestroy, OnInit, computed, inject, signal } from '@angular/core';
import { Subject, takeUntil } from 'rxjs';
import { EvaluationResponse, ProjetEvaluable } from '../../core/models/evaluation.model';
import { EvaluationService } from '../../core/services/evaluation.service';
import { ProjetEvaluableService } from '../../core/services/projet-evaluable.service';
import { EvaluationChecklistComponent } from '../../shared/components/evaluation-checklist/evaluation-checklist.component';

@Component({
  selector: 'app-evaluation-page',
  standalone: true,
  imports: [CommonModule, EvaluationChecklistComponent],
  templateUrl: './evaluation-page.component.html',
  styleUrl: './evaluation-page.component.scss'
})
export class EvaluationPageComponent implements OnInit, OnDestroy {
  private readonly projetService = inject(ProjetEvaluableService);
  private readonly evaluationService = inject(EvaluationService);
  private readonly destroy$ = new Subject<void>();

  readonly projects = signal<ProjetEvaluable[]>([]);
  readonly loadingProjects = signal(false);
  readonly projectsError = signal<string | null>(null);
  readonly savingProjectId = signal<number | null>(null);
  readonly evalResult = signal<EvaluationResponse | null>(null);
  readonly evalError = signal<string | null>(null);
  readonly projectSearch = signal('');


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
            this.projectsError.set('Aucun projet terminé à évaluer.');
          }
        },
        error: () => {
          this.projectsError.set('Impossible de charger les projets évaluables.');
          this.loadingProjects.set(false);
        }
      });
  }

  selectProject(project: ProjetEvaluable): void {
    this.selectedProject = project;
    this.evalError.set(null);
    this.evaluationService.getLatestEvaluation(project.id)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (evaluation) => this.evalResult.set(evaluation),
        error: () => this.evalResult.set(null),
      });
  }

 calculate(project: ProjetEvaluable): void {
  if (this.isProjectCoolingDown(project.id)) {
    this.evalError.set(
      `Le score vient d’être recalculé. Veuillez patienter ${this.cooldownLabel(project.id)} avant un nouveau recalcul.`
    );
    return;
  }

  this.evalError.set(null);
  this.savingProjectId.set(project.id);

  this.evaluationService.calculateScore(project.id).subscribe({
    next: evaluation => {
      this.evalResult.set(evaluation);
      this.selectedProject = project;

      project.scoreFinal = evaluation.scoreFinal;
      project.eligibleIndustrialisation = evaluation.eligibleIndustrialisation;

      this.startCooldown(project.id);
      this.savingProjectId.set(null);
    },
    error: error => {
      const retryAfterSeconds =
        error?.error?.retryAfterSeconds ??
        error?.headers?.get?.('Retry-After') ??
        this.COOLDOWN_SECONDS;

      if (error.status === 409 || error.status === 429) {
        this.startCooldown(project.id, Number(retryAfterSeconds));

        this.evalError.set(
          `Le score vient d’être recalculé. Veuillez patienter ${this.cooldownLabel(project.id)} avant un nouveau recalcul.`
        );
      } else {
        this.evalError.set(
          error?.error?.detail ||
          error?.error?.message ||
          'Erreur lors du calcul du score.'
        );
      }

      this.savingProjectId.set(null);
    }
  });
}

  statusLabel(status: string): string {
    return status === 'REALISATION_TERMINEE' ? 'Realisation terminee' : status;
  }

  updateProjectSearch(value: string): void {
    this.projectSearch.set(value);
  }

  private normalize(value: unknown): string {
    return String(value ?? '')
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .trim();
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

private startCooldown(projectId: number, seconds = this.COOLDOWN_SECONDS): void {
  this.clearCooldown(projectId);

  this.cooldowns.update(current => ({
    ...current,
    [projectId]: seconds
  }));

  const timer = setInterval(() => {
    const remaining = this.cooldownRemaining(projectId);

    if (remaining <= 1) {
      this.clearCooldown(projectId);
      return;
    }

    this.cooldowns.update(current => ({
      ...current,
      [projectId]: remaining - 1
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

  this.cooldowns.update(current => {
    const copy = { ...current };
    delete copy[projectId];
    return copy;
  });
}







}
