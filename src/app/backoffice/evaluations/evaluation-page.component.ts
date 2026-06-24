import { CommonModule } from '@angular/common';
import { Component, OnDestroy, OnInit, inject, signal } from '@angular/core';
import { FormArray, FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Subject, takeUntil } from 'rxjs';
import { ProjetEvaluable, EvaluationRequest, EvaluationResponse } from '../../core/models/evaluation.model';
import { ProjetEvaluableService } from '../../core/services/projet-evaluable.service';
import { CritereEliminatoire } from '../../core/models/critere.model';
import { CritereEliminatoireService } from '../../core/services/critere-eliminatoire.service';
import { CritereNote } from '../../core/models/critere.model';
import { CritereNoteService } from '../../core/services/critere-note.service';
import { EvaluationService } from '../../core/services/evaluation.service';

@Component({
  selector: 'app-evaluation-page',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './evaluation-page.component.html',
  styleUrl: './evaluation-page.component.scss'
})
export class EvaluationPageComponent implements OnInit, OnDestroy {
  private readonly projetService = inject(ProjetEvaluableService);
  private readonly critElimService = inject(CritereEliminatoireService);
  private readonly critNoteService = inject(CritereNoteService);
  private readonly evalService = inject(EvaluationService);
  private readonly fb = inject(FormBuilder);
  private readonly destroy$ = new Subject<void>();

  readonly projects = signal<ProjetEvaluable[]>([]);
  readonly loadingProjects = signal(false);
  readonly projectsError = signal<string | null>(null);

  selectedProject: ProjetEvaluable | null = null;
  eliminatoires: CritereEliminatoire[] = [];
  notes: CritereNote[] = [];

  evaluationForm!: FormGroup;
  saving = signal(false);
  evalResult = signal<EvaluationResponse | null>(null);
  evalError = signal<string | null>(null);

  ngOnInit(): void {
    this.loadProjects();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private loadProjects(): void {
    this.loadingProjects.set(true);
    this.projectsError.set(null);
    this.projetService.getEvaluables()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (data) => {
          // filter projects by expected status
          const filtered = data.filter(p => p.statut === 'REALISATION_TERMINEE');
          this.projects.set(filtered);
          if (filtered.length === 0) {
            this.projectsError.set('Aucun projet évaluable trouvé.');
          }
          this.loadingProjects.set(false);
        },
        error: (err) => {
          console.error(err);
          this.projectsError.set('Impossible de charger les projets évaluables.');
          this.loadingProjects.set(false);
        }
      });
  }

  selectProject(project: ProjetEvaluable): void {
    this.selectedProject = project;
    this.evalResult.set(null);
    this.evalError.set(null);
    // load active criteria
    this.critElimService.findActive().pipe(takeUntil(this.destroy$)).subscribe({
      next: (elims) => {
        this.eliminatoires = elims;
        this.buildForm();
      },
      error: () => {
        this.evalError.set("Erreur lors du chargement des critères éliminatoires.");
      }
    });

    this.critNoteService.findActive().pipe(takeUntil(this.destroy$)).subscribe({
      next: (notes) => {
        this.notes = notes;
        this.buildForm();
      },
      error: () => {
        this.evalError.set("Erreur lors du chargement des critères notés.");
      }
    });
  }

  private buildForm(): void {
    // build when both lists are present
    const elimsReady = Array.isArray(this.eliminatoires);
    const notesReady = Array.isArray(this.notes);
    if (!elimsReady || !notesReady) return;

    const elimControls = this.eliminatoires.map(e => this.fb.group({
      critereId: [e.id],
      reponse: [null, Validators.required],
      commentaire: ['']
    }));

    const noteControls = this.notes.map(n => this.fb.group({
      critereId: [n.id],
      noteObtenue: [null, [Validators.required, Validators.min(0), Validators.max(n.bareme)]],
      commentaire: ['']
    }));

    this.evaluationForm = this.fb.group({
      eliminatoires: this.fb.array(elimControls),
      notes: this.fb.array(noteControls)
    });
  }

  get eliminatoiresArray(): FormArray {
    return this.evaluationForm.get('eliminatoires') as FormArray;
  }

  get notesArray(): FormArray {
    return this.evaluationForm.get('notes') as FormArray;
  }

  canCalculate(): boolean {
    return this.evaluationForm && this.evaluationForm.valid && !!this.selectedProject;
  }

  calculateEvaluation(): void {
    if (!this.canCalculate() || !this.selectedProject) return;

    this.saving.set(true);
    this.evalError.set(null);

    const payload: EvaluationRequest = {
      eliminatoires: this.eliminatoiresArray.value,
      notes: this.notesArray.value
    };

    this.evalService.calculerEvaluation(this.selectedProject.id, payload)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (res) => {
          this.evalResult.set(res);
          this.saving.set(false);
        },
        error: (err) => {
          console.error(err);
          this.evalError.set('Erreur lors du calcul de l\'évaluation.');
          this.saving.set(false);
        }
      });
  }
}
