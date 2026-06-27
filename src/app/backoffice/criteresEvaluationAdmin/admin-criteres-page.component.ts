import { CommonModule } from '@angular/common';
import { Component, OnInit, OnDestroy, computed, inject, signal } from '@angular/core';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Subject, takeUntil } from 'rxjs';
import { CritereEliminatoire, CritereNote, CritereEliminatoireRequest, CritereNoteRequest, MODE_EVALUATION_OPTIONS, ReponseEliminatoire } from '../../core/models/critere.model';
import { CritereEliminatoireService } from '../../core/services/critere-eliminatoire.service';
import { CritereNoteService } from '../../core/services/critere-note.service';

@Component({
  selector: 'app-admin-criteres-page',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule],
  templateUrl: './admin-criteres-page.component.html',
  styleUrl: './admin-criteres-page.component.scss'
})
export class AdminCriteresPageComponent implements OnInit, OnDestroy {
  private readonly critereEliminatoireService = inject(CritereEliminatoireService);
  private readonly critereNoteService = inject(CritereNoteService);
  private readonly fb = inject(FormBuilder);
  private readonly destroy$ = new Subject<void>();

  // Critères éliminatoires
  criteresEliminatoires = signal<CritereEliminatoire[]>([]);
  loadingEliminatoires = signal(false);
  errorEliminatoires = signal<string | null>(null);
  eliminatoiresSearch = signal('');

  // Critères notés
  criteresNotes = signal<CritereNote[]>([]);
  loadingNotes = signal(false);
  errorNotes = signal<string | null>(null);
  notesSearch = signal('');

  // Pagination
  readonly pageSize = 8;
  eliminatoiresPage = signal(1);
  notesPage = signal(1);

  filteredEliminatoires = computed(() => {
    const query = this.normalize(this.eliminatoiresSearch());
    if (!query) {
      return this.criteresEliminatoires();
    }
    return this.criteresEliminatoires().filter((crit) =>
      this.normalize([
        crit.ordre,
        crit.libelle,
        crit.description,
        crit.domaine,
        crit.reponseAttendue,
        crit.actif ? 'actif' : 'inactif',
        crit.modeEvaluation,
        crit.ruleDescription,
      ].join(' ')).includes(query)
    );
  });

  filteredNotes = computed(() => {
    const query = this.normalize(this.notesSearch());
    if (!query) {
      return this.criteresNotes();
    }
    return this.criteresNotes().filter((crit) =>
      this.normalize([
        crit.ordre,
        crit.libelle,
        crit.description,
        crit.domaine,
        crit.bareme,
        crit.poids,
        crit.seuil,
        crit.actif ? 'actif' : 'inactif',
        crit.modeEvaluation,
        crit.ruleDescription,
      ].join(' ')).includes(query)
    );
  });

  get eliminatoiresTotalPages(): number {
    return Math.max(1, Math.ceil(this.filteredEliminatoires().length / this.pageSize));
  }

  get notesTotalPages(): number {
    return Math.max(1, Math.ceil(this.filteredNotes().length / this.pageSize));
  }

  get eliminatoiresCount(): number {
    return this.criteresEliminatoires().length;
  }

  get eliminatoiresActiveCount(): number {
    return this.criteresEliminatoires().filter((crit) => crit.actif).length;
  }

  get notesCount(): number {
    return this.criteresNotes().length;
  }

  get notesActiveCount(): number {
    return this.criteresNotes().filter((crit) => crit.actif).length;
  }

  get visibleEliminatoires(): CritereEliminatoire[] {
    const start = (this.eliminatoiresPage() - 1) * this.pageSize;
    return this.filteredEliminatoires().slice(start, start + this.pageSize);
  }

  get visibleNotes(): CritereNote[] {
    const start = (this.notesPage() - 1) * this.pageSize;
    return this.filteredNotes().slice(start, start + this.pageSize);
  }

  // Modales
  isModalOpen = signal(false);
  modalMode: 'create' | 'edit' = 'create';
  modalType: 'eliminatoire' | 'note' = 'eliminatoire';
  selectedCritereId: number | null = null;

  // Formulaires
  eliminatoireForm!: FormGroup;
  noteForm!: FormGroup;

  // Messages de succès/erreur
  successMessage = signal<string | null>(null);
  errorMessage = signal<string | null>(null);
  saving = signal(false);
  deleting = signal(false);

  readonly ReponseEliminatoire = ReponseEliminatoire;
  readonly modeEvaluationOptions = MODE_EVALUATION_OPTIONS;

  ngOnInit(): void {
    this.initializeForms();
    this.loadCriteres();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private initializeForms(): void {
    this.eliminatoireForm = this.fb.group({
      libelle: ['', [Validators.required, Validators.minLength(3)]],
      description: [''],
      domaine: ['', Validators.required],
      ordre: [1, [Validators.required, Validators.min(1)]],
      reponseAttendue: [ReponseEliminatoire.OK, Validators.required],
      actif: [true],
      ruleEnabled: [false],
      modeEvaluation: [null],
      expectedLivrableTypes: [''],
      minLivrableCount: [1],
      expectedKeyword: [''],
      noteMaxAuto: [null],
      ruleDescription: ['']
    });

    this.noteForm = this.fb.group({
      libelle: ['', [Validators.required, Validators.minLength(3)]],
      description: [''],
      domaine: ['', Validators.required],
      ordre: [1, [Validators.required, Validators.min(1)]],
      bareme: [20, [Validators.required, Validators.min(1)]],
      poids: [1, [Validators.required, Validators.min(0.1)]],
      seuil: [10, [Validators.required, Validators.min(0)]],
      actif: [true],
      ruleEnabled: [false],
      modeEvaluation: [null],
      expectedLivrableTypes: [''],
      minLivrableCount: [1],
      expectedKeyword: [''],
      noteMaxAuto: [20],
      ruleDescription: ['']
    });
  }

  private loadCriteres(): void {
    this.loadEliminatoires();
    this.loadNotes();
  }

  private loadEliminatoires(): void {
    this.loadingEliminatoires.set(true);
    this.errorEliminatoires.set(null);
    this.critereEliminatoireService.findAll()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (data) => {
          this.criteresEliminatoires.set(data.sort((a, b) => a.ordre - b.ordre));
          this.eliminatoiresPage.set(1);
          this.loadingEliminatoires.set(false);
        },
        error: (error) => {
          console.error('Erreur lors du chargement des critères éliminatoires:', error);
          this.errorEliminatoires.set('Impossible de charger les critères éliminatoires');
          this.loadingEliminatoires.set(false);
        }
      });
  }

  private loadNotes(): void {
    this.loadingNotes.set(true);
    this.errorNotes.set(null);
    this.critereNoteService.findAll()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (data) => {
          this.criteresNotes.set(data.sort((a, b) => a.ordre - b.ordre));
          this.notesPage.set(1);
          this.loadingNotes.set(false);
        },
        error: (error) => {
          console.error('Erreur lors du chargement des critères notés:', error);
          this.errorNotes.set('Impossible de charger les critères notés');
          this.loadingNotes.set(false);
        }
      });
  }

  openCreateModal(type: 'eliminatoire' | 'note'): void {
    this.modalType = type;
    this.modalMode = 'create';
    this.selectedCritereId = null;
    if (type === 'eliminatoire') {
      this.eliminatoireForm.reset({ reponseAttendue: ReponseEliminatoire.OK, actif: true, ordre: 1, ruleEnabled: false, minLivrableCount: 1 });
    } else {
      this.noteForm.reset({ actif: true, ordre: 1, bareme: 20, poids: 1, seuil: 10, ruleEnabled: false, minLivrableCount: 1, noteMaxAuto: 20 });
    }
    this.isModalOpen.set(true);
  }

  openEditModal(type: 'eliminatoire' | 'note', critere: CritereEliminatoire | CritereNote): void {
    this.modalType = type;
    this.modalMode = 'edit';
    this.selectedCritereId = critere.id;

    if (type === 'eliminatoire') {
      const crit = critere as CritereEliminatoire;
      this.eliminatoireForm.patchValue({
        libelle: crit.libelle,
        description: crit.description,
        domaine: crit.domaine,
        ordre: crit.ordre,
        reponseAttendue: crit.reponseAttendue,
        actif: crit.actif,
        ruleEnabled: crit.ruleEnabled ?? false,
        modeEvaluation: crit.modeEvaluation ?? null,
        expectedLivrableTypes: crit.expectedLivrableTypes ?? '',
        minLivrableCount: crit.minLivrableCount ?? 1,
        expectedKeyword: crit.expectedKeyword ?? '',
        noteMaxAuto: crit.noteMaxAuto ?? null,
        ruleDescription: crit.ruleDescription ?? ''
      });
    } else {
      const crit = critere as CritereNote;
      this.noteForm.patchValue({
        libelle: crit.libelle,
        description: crit.description,
        domaine: crit.domaine,
        ordre: crit.ordre,
        bareme: crit.bareme,
        poids: crit.poids,
        seuil: crit.seuil,
        actif: crit.actif,
        ruleEnabled: crit.ruleEnabled ?? false,
        modeEvaluation: crit.modeEvaluation ?? null,
        expectedLivrableTypes: crit.expectedLivrableTypes ?? '',
        minLivrableCount: crit.minLivrableCount ?? 1,
        expectedKeyword: crit.expectedKeyword ?? '',
        noteMaxAuto: crit.noteMaxAuto ?? crit.bareme,
        ruleDescription: crit.ruleDescription ?? ''
      });
    }
    this.isModalOpen.set(true);
  }

  closeModal(): void {
    this.isModalOpen.set(false);
    this.selectedCritereId = null;
  }

  saveCritere(): void {
    if (this.modalType === 'eliminatoire') {
      this.saveCritereEliminatoire();
    } else {
      this.saveCritereNote();
    }
  }

  private saveCritereEliminatoire(): void {
    if (!this.eliminatoireForm.valid) {
      this.errorMessage.set('Formulaire invalide. Veuillez vérifier les champs.');
      return;
    }

    this.saving.set(true);
    this.errorMessage.set(null);
    this.successMessage.set(null);

    const request: CritereEliminatoireRequest = this.eliminatoireForm.value;
    const operation = this.modalMode === 'create'
      ? this.critereEliminatoireService.create(request)
      : this.critereEliminatoireService.update(this.selectedCritereId!, request);

    operation
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => {
          this.successMessage.set(
            this.modalMode === 'create'
              ? 'Critère éliminatoire créé avec succès'
              : 'Critère éliminatoire mis à jour avec succès'
          );
          this.saving.set(false);
          this.closeModal();
          this.loadEliminatoires();
          setTimeout(() => this.successMessage.set(null), 3000);
        },
        error: (error) => {
          console.error('Erreur lors de la sauvegarde du critère éliminatoire:', error);
          this.errorMessage.set('Erreur lors de la sauvegarde. Veuillez réessayer.');
          this.saving.set(false);
        }
      });
  }

  private saveCritereNote(): void {
    if (!this.noteForm.valid) {
      this.errorMessage.set('Formulaire invalide. Veuillez vérifier les champs.');
      return;
    }

    this.saving.set(true);
    this.errorMessage.set(null);
    this.successMessage.set(null);

    const request: CritereNoteRequest = this.noteForm.value;
    const operation = this.modalMode === 'create'
      ? this.critereNoteService.create(request)
      : this.critereNoteService.update(this.selectedCritereId!, request);

    operation
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => {
          this.successMessage.set(
            this.modalMode === 'create'
              ? 'Critère noté créé avec succès'
              : 'Critère noté mis à jour avec succès'
          );
          this.saving.set(false);
          this.closeModal();
          this.loadNotes();
          setTimeout(() => this.successMessage.set(null), 3000);
        },
        error: (error) => {
          console.error('Erreur lors de la sauvegarde du critère noté:', error);
          this.errorMessage.set('Erreur lors de la sauvegarde. Veuillez réessayer.');
          this.saving.set(false);
        }
      });
  }

  toggleActivation(type: 'eliminatoire' | 'note', critere: CritereEliminatoire | CritereNote): void {
    if (critere.actif) {
      this.deactivateCritere(type, critere.id);
    } else {
      this.activateCritere(type, critere.id);
    }
  }

  private deactivateCritere(type: 'eliminatoire' | 'note', critereId: number): void {
    this.deleting.set(true);
    const service = type === 'eliminatoire' ? this.critereEliminatoireService : this.critereNoteService;

    service.deactivate(critereId)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => {
          this.successMessage.set('Critère désactivé avec succès');
          this.deleting.set(false);
          this.loadCriteres();
          setTimeout(() => this.successMessage.set(null), 3000);
        },
        error: (error) => {
          console.error('Erreur lors de la désactivation:', error);
          this.errorMessage.set('Erreur lors de la désactivation');
          this.deleting.set(false);
        }
      });
  }

  private activateCritere(type: 'eliminatoire' | 'note', critereId: number): void {
    this.deleting.set(true);
    const service = type === 'eliminatoire' ? this.critereEliminatoireService : this.critereNoteService;

    service.activate(critereId)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => {
          this.successMessage.set('Critère activé avec succès');
          this.deleting.set(false);
          this.loadCriteres();
          setTimeout(() => this.successMessage.set(null), 3000);
        },
        error: (error) => {
          console.error('Erreur lors de l\'activation:', error);
          this.errorMessage.set('Erreur lors de l\'activation');
          this.deleting.set(false);
        }
      });
  }

  goToEliminatoiresPage(page: number): void {
    this.eliminatoiresPage.set(Math.min(Math.max(page, 1), this.eliminatoiresTotalPages));
  }

  goToNotesPage(page: number): void {
    this.notesPage.set(Math.min(Math.max(page, 1), this.notesTotalPages));
  }

  updateEliminatoiresSearch(value: string): void {
    this.eliminatoiresSearch.set(value);
    this.eliminatoiresPage.set(1);
  }

  updateNotesSearch(value: string): void {
    this.notesSearch.set(value);
    this.notesPage.set(1);
  }

  private normalize(value: unknown): string {
    return String(value ?? '')
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .trim();
  }
}
