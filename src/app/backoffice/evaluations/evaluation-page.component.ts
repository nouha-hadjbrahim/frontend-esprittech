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

  readonly filteredProjects = computed(() => {
    const query = this.normalize(this.projectSearch());
    if (!query) {
      return this.projects();
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
    this.savingProjectId.set(project.id);
    this.evalError.set(null);
    this.evaluationService.calculateScore(project.id)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (evaluation) => {
          this.evalResult.set(evaluation);
          this.selectedProject = project;
          this.projects.update((projects) =>
            projects.map((item) =>
              item.id === project.id
                ? {
                    ...item,
                    scoreFinal: evaluation.scoreFinal,
                    eligibleIndustrialisation: evaluation.eligibleIndustrialisation,
                    bloqueParEliminatoire: evaluation.bloqueParEliminatoire,
                  }
                : item
            )
          );
          this.savingProjectId.set(null);
        },
        error: (err) => {
          this.evalError.set(err?.error?.detail ?? 'Erreur lors du calcul du score.');
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
}
