import { CommonModule } from '@angular/common';
import { Component, OnDestroy, OnInit, computed, inject, signal } from '@angular/core';
import { FormBuilder, FormGroup, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { forkJoin, Observable, of, Subject, takeUntil } from 'rxjs';
import {
  CritereEliminatoire,
  CritereEliminatoireRequest,
  CritereNote,
  CritereNoteRequest,
  CritereNoteRule,
  CritereNoteRuleRequest,
  MODE_EVALUATION_OPTIONS,
  NoteLevel,
  NoteLevelRequest,
  ReponseEliminatoire,
  RULE_OPERATOR_OPTIONS,
} from '../../core/models/critere.model';
import { CritereEliminatoireService } from '../../core/services/critere-eliminatoire.service';
import { CritereNoteService } from '../../core/services/critere-note.service';
import { NoteLevelService } from '../../core/services/note-level.service';

@Component({
  selector: 'app-admin-criteres-page',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule],
  templateUrl: './admin-criteres-page.component.html',
  styleUrl: './admin-criteres-page.component.scss',
})
export class AdminCriteresPageComponent implements OnInit, OnDestroy {
  private readonly critereEliminatoireService = inject(CritereEliminatoireService);
  private readonly critereNoteService = inject(CritereNoteService);
  private readonly noteLevelService = inject(NoteLevelService);
  private readonly fb = inject(FormBuilder);
  private readonly destroy$ = new Subject<void>();

  criteresEliminatoires = signal<CritereEliminatoire[]>([]);
  criteresNotes = signal<CritereNote[]>([]);
  noteLevels = signal<NoteLevel[]>([]);
  rulesByCritere = signal<Record<number, CritereNoteRule[]>>({});

  loadingEliminatoires = signal(false);
  loadingNotes = signal(false);
  errorEliminatoires = signal<string | null>(null);
  errorNotes = signal<string | null>(null);
  eliminatoiresSearch = signal('');
  notesSearch = signal('');

  readonly pageSize = 8;
  eliminatoiresPage = signal(1);
  notesPage = signal(1);

  isModalOpen = signal(false);
  isRuleModalOpen = signal(false);
  isNoteLevelModalOpen = signal(false);
  modalMode: 'create' | 'edit' = 'create';
  modalType: 'eliminatoire' | 'note' = 'eliminatoire';
  ruleModalMode: 'create' | 'edit' = 'create';
  noteLevelModalMode: 'create' | 'edit' = 'create';
  selectedCritereId: number | null = null;
  selectedRuleCritere: CritereNote | null = null;
  selectedRuleId: number | null = null;
  selectedNoteLevelId: number | null = null;

  eliminatoireForm!: FormGroup;
  noteForm!: FormGroup;
  ruleForm!: FormGroup;
  noteLevelForm!: FormGroup;

  successMessage = signal<string | null>(null);
  errorMessage = signal<string | null>(null);
  saving = signal(false);
  deleting = signal(false);

  readonly ReponseEliminatoire = ReponseEliminatoire;
  readonly modeEvaluationOptions = MODE_EVALUATION_OPTIONS;
  readonly ruleOperatorOptions = RULE_OPERATOR_OPTIONS;

  filteredEliminatoires = computed(() => {
    const query = this.normalize(this.eliminatoiresSearch());
    if (!query) return this.criteresEliminatoires();
    return this.criteresEliminatoires().filter((crit) => this.normalize([
      crit.ordre,
      crit.libelle,
      crit.description,
      crit.domaine,
      crit.reponseAttendue,
      crit.actif ? 'actif' : 'inactif',
      crit.modeEvaluation,
      crit.ruleDescription,
    ].join(' ')).includes(query));
  });

  filteredNotes = computed(() => {
    const query = this.normalize(this.notesSearch());
    if (!query) return this.criteresNotes();
    return this.criteresNotes().filter((crit) => this.normalize([
      crit.ordre,
      crit.libelle,
      crit.description,
      crit.domaine,
      crit.poids,
      crit.defaultNoteValue,
      crit.actif ? 'actif' : 'inactif',
      crit.modeEvaluation,
      crit.ruleDescription,
    ].join(' ')).includes(query));
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

  ngOnInit(): void {
    this.initializeForms();
    this.loadCriteres();
    this.loadNoteLevels();
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
      ruleDescription: [''],
    });

    this.noteForm = this.fb.group({
      libelle: ['', [Validators.required, Validators.minLength(3)]],
      description: [''],
      domaine: ['', Validators.required],
      ordre: [1, [Validators.required, Validators.min(1)]],
      poids: [1, [Validators.required, Validators.min(0.1)]],
      defaultNoteValue: [3, [Validators.required, Validators.min(1), Validators.max(5)]],
      actif: [true],
      ruleEnabled: [false],
      modeEvaluation: [null],
      expectedLivrableTypes: [''],
      minLivrableCount: [1],
      expectedKeyword: [''],
      noteMaxAuto: [5],
      ruleDescription: [''],
    });

    this.ruleForm = this.fb.group({
      ruleName: ['', [Validators.required, Validators.minLength(3)]],
      description: [''],
      metadataKey: ['livrableCount', Validators.required],
      operator: ['GTE', Validators.required],
      expectedValue: [''],
      minValue: [1],
      maxValue: [null],
      noteValue: [4, [Validators.required, Validators.min(1), Validators.max(5)]],
      priority: [1, [Validators.required, Validators.min(1)]],
      active: [true],
    });

    this.noteLevelForm = this.fb.group({
      value: [1, [Validators.required, Validators.min(1), Validators.max(5)]],
      label: ['', Validators.required],
      description: [''],
      active: [true],
      order: [1, [Validators.required, Validators.min(1)]],
    });
  }

  private loadCriteres(): void {
    this.loadEliminatoires();
    this.loadNotes();
  }

  private loadEliminatoires(): void {
    this.loadingEliminatoires.set(true);
    this.errorEliminatoires.set(null);
    this.critereEliminatoireService.findAll().pipe(takeUntil(this.destroy$)).subscribe({
      next: (data) => {
        this.criteresEliminatoires.set(data.sort((a, b) => a.ordre - b.ordre));
        this.eliminatoiresPage.set(1);
        this.loadingEliminatoires.set(false);
      },
      error: () => {
        this.errorEliminatoires.set('Impossible de charger les criteres eliminatoires');
        this.loadingEliminatoires.set(false);
      },
    });
  }

  private loadNotes(): void {
    this.loadingNotes.set(true);
    this.errorNotes.set(null);
    this.critereNoteService.findAll().pipe(takeUntil(this.destroy$)).subscribe({
      next: (data) => {
        const sorted = data.sort((a, b) => a.ordre - b.ordre);
        this.criteresNotes.set(sorted);
        this.notesPage.set(1);
        this.loadingNotes.set(false);
        this.loadRulesForNotes(sorted);
      },
      error: () => {
        this.errorNotes.set('Impossible de charger les criteres notes');
        this.loadingNotes.set(false);
      },
    });
  }

  private loadNoteLevels(): void {
    this.noteLevelService.findAll().pipe(takeUntil(this.destroy$)).subscribe({
      next: (levels) => this.noteLevels.set(levels.sort((a, b) => a.order - b.order)),
      error: () => this.errorMessage.set('Impossible de charger les niveaux de note.'),
    });
  }

  private loadRulesForNotes(notes: CritereNote[]): void {
    if (!notes.length) {
      this.rulesByCritere.set({});
      return;
    }
    forkJoin(notes.map((note) => this.critereNoteService.findRules(note.id)) || [of([] as CritereNoteRule[])])
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (rulesLists) => {
          const byCritere: Record<number, CritereNoteRule[]> = {};
          notes.forEach((note, index) => byCritere[note.id] = rulesLists[index] ?? []);
          this.rulesByCritere.set(byCritere);
        },
        error: () => this.errorMessage.set('Impossible de charger les regles de notation.'),
      });
  }

  openCreateModal(type: 'eliminatoire' | 'note'): void {
    this.modalType = type;
    this.modalMode = 'create';
    this.selectedCritereId = null;
    if (type === 'eliminatoire') {
      this.eliminatoireForm.reset({ reponseAttendue: ReponseEliminatoire.OK, actif: true, ordre: 1, ruleEnabled: false, minLivrableCount: 1 });
    } else {
      this.noteForm.reset({ actif: true, ordre: 1, poids: 1, defaultNoteValue: 3, ruleEnabled: false, minLivrableCount: 1, noteMaxAuto: 5 });
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
        ...crit,
        ruleEnabled: crit.ruleEnabled ?? false,
        modeEvaluation: crit.modeEvaluation ?? null,
        expectedLivrableTypes: crit.expectedLivrableTypes ?? '',
        minLivrableCount: crit.minLivrableCount ?? 1,
        expectedKeyword: crit.expectedKeyword ?? '',
        noteMaxAuto: crit.noteMaxAuto ?? null,
        ruleDescription: crit.ruleDescription ?? '',
      });
    } else {
      const crit = critere as CritereNote;
      this.noteForm.patchValue({
        libelle: crit.libelle,
        description: crit.description,
        domaine: crit.domaine,
        ordre: crit.ordre,
        poids: crit.poids,
        defaultNoteValue: crit.defaultNoteValue ?? 3,
        actif: crit.actif,
        ruleEnabled: crit.ruleEnabled ?? false,
        modeEvaluation: crit.modeEvaluation ?? null,
        expectedLivrableTypes: crit.expectedLivrableTypes ?? '',
        minLivrableCount: crit.minLivrableCount ?? 1,
        expectedKeyword: crit.expectedKeyword ?? '',
        noteMaxAuto: crit.noteMaxAuto ?? 5,
        ruleDescription: crit.ruleDescription ?? '',
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
    if (this.eliminatoireForm.invalid) {
      this.errorMessage.set('Formulaire invalide.');
      return;
    }
    this.saveEntity(
      this.modalMode === 'create'
        ? this.critereEliminatoireService.create(this.eliminatoireForm.value as CritereEliminatoireRequest)
        : this.critereEliminatoireService.update(this.selectedCritereId!, this.eliminatoireForm.value as CritereEliminatoireRequest),
      'Critere eliminatoire enregistre.',
      () => this.loadEliminatoires(),
    );
  }

  private saveCritereNote(): void {
    if (this.noteForm.invalid) {
      this.errorMessage.set('Formulaire invalide.');
      return;
    }
    const request: CritereNoteRequest = { ...this.noteForm.value, bareme: 5, seuil: 3 };
    this.saveEntity(
      this.modalMode === 'create'
        ? this.critereNoteService.create(request)
        : this.critereNoteService.update(this.selectedCritereId!, request),
      'Critere note enregistre.',
      () => this.loadNotes(),
    );
  }

  private saveEntity<T>(operation: Observable<T>, message: string, reload: () => void): void {
    this.saving.set(true);
    this.errorMessage.set(null);
    operation.pipe(takeUntil(this.destroy$)).subscribe({
      next: () => {
        this.successMessage.set(message);
        this.saving.set(false);
        this.closeModal();
        reload();
        setTimeout(() => this.successMessage.set(null), 3000);
      },
      error: () => {
        this.errorMessage.set('Enregistrement impossible.');
        this.saving.set(false);
      },
    });
  }

  toggleActivation(type: 'eliminatoire' | 'note', critere: CritereEliminatoire | CritereNote): void {
    const service = type === 'eliminatoire' ? this.critereEliminatoireService : this.critereNoteService;
    this.deleting.set(true);
    const operation = critere.actif ? service.deactivate(critere.id) : service.activate(critere.id);
    operation.pipe(takeUntil(this.destroy$)).subscribe({
      next: () => {
        this.deleting.set(false);
        this.loadCriteres();
      },
      error: () => {
        this.errorMessage.set('Changement de statut impossible.');
        this.deleting.set(false);
      },
    });
  }

  rulesFor(critereId: number): CritereNoteRule[] {
    return this.rulesByCritere()[critereId] ?? [];
  }

  noteLabel(value: number | null | undefined): string {
    const level = this.noteLevels().find((item) => item.value === value);
    return level ? `${level.value} - ${level.label}` : `${value ?? 3}`;
  }

  openRuleModal(critere: CritereNote, rule?: CritereNoteRule): void {
    this.selectedRuleCritere = critere;
    this.selectedRuleId = rule?.id ?? null;
    this.ruleModalMode = rule ? 'edit' : 'create';
    this.ruleForm.reset({
      ruleName: rule?.ruleName ?? '',
      description: rule?.description ?? '',
      metadataKey: rule?.metadataKey ?? 'livrableCount',
      operator: rule?.operator ?? 'GTE',
      expectedValue: rule?.expectedValue ?? '',
      minValue: rule?.minValue ?? 1,
      maxValue: rule?.maxValue ?? null,
      noteValue: rule?.noteValue ?? 4,
      priority: rule?.priority ?? 1,
      active: rule?.active ?? true,
    });
    this.isRuleModalOpen.set(true);
  }

  closeRuleModal(): void {
    this.isRuleModalOpen.set(false);
    this.selectedRuleCritere = null;
    this.selectedRuleId = null;
  }

  saveRule(): void {
    if (!this.selectedRuleCritere || this.ruleForm.invalid) {
      this.errorMessage.set('Regle invalide.');
      return;
    }
    const request: CritereNoteRuleRequest = this.ruleForm.value;
    this.saving.set(true);
    const operation = this.ruleModalMode === 'create'
      ? this.critereNoteService.createRule(this.selectedRuleCritere.id, request)
      : this.critereNoteService.updateRule(this.selectedRuleId!, request);
    operation.pipe(takeUntil(this.destroy$)).subscribe({
      next: () => {
        this.successMessage.set('Regle de notation enregistree.');
        this.saving.set(false);
        this.closeRuleModal();
        this.loadRulesForNotes(this.criteresNotes());
      },
      error: () => {
        this.errorMessage.set('Enregistrement de la regle impossible.');
        this.saving.set(false);
      },
    });
  }

  deleteRule(rule: CritereNoteRule): void {
    this.critereNoteService.deleteRule(rule.id).pipe(takeUntil(this.destroy$)).subscribe({
      next: () => this.loadRulesForNotes(this.criteresNotes()),
      error: () => this.errorMessage.set('Suppression de la regle impossible.'),
    });
  }

  toggleRule(rule: CritereNoteRule): void {
    const operation = rule.active
      ? this.critereNoteService.deactivateRule(rule.id)
      : this.critereNoteService.activateRule(rule.id);
    operation.pipe(takeUntil(this.destroy$)).subscribe({
      next: () => this.loadRulesForNotes(this.criteresNotes()),
      error: () => this.errorMessage.set('Changement de statut de la regle impossible.'),
    });
  }

  openNoteLevelModal(level?: NoteLevel): void {
    this.selectedNoteLevelId = level?.id ?? null;
    this.noteLevelModalMode = level ? 'edit' : 'create';
    this.noteLevelForm.reset({
      value: level?.value ?? 1,
      label: level?.label ?? '',
      description: level?.description ?? '',
      active: level?.active ?? true,
      order: level?.order ?? level?.value ?? 1,
    });
    this.isNoteLevelModalOpen.set(true);
  }

  closeNoteLevelModal(): void {
    this.isNoteLevelModalOpen.set(false);
    this.selectedNoteLevelId = null;
  }

  saveNoteLevel(): void {
    if (this.noteLevelForm.invalid) {
      this.errorMessage.set('Niveau de note invalide.');
      return;
    }
    this.saving.set(true);
    const request: NoteLevelRequest = this.noteLevelForm.value;
    const operation = this.noteLevelModalMode === 'create'
      ? this.noteLevelService.create(request)
      : this.noteLevelService.update(this.selectedNoteLevelId!, request);
    operation.pipe(takeUntil(this.destroy$)).subscribe({
      next: () => {
        this.successMessage.set('Niveau de note enregistre.');
        this.saving.set(false);
        this.closeNoteLevelModal();
        this.loadNoteLevels();
      },
      error: () => {
        this.errorMessage.set('Enregistrement du niveau impossible.');
        this.saving.set(false);
      },
    });
  }

  toggleNoteLevel(level: NoteLevel): void {
    const operation = level.active ? this.noteLevelService.deactivate(level.id) : this.noteLevelService.activate(level.id);
    operation.pipe(takeUntil(this.destroy$)).subscribe({
      next: () => this.loadNoteLevels(),
      error: () => this.errorMessage.set('Changement de statut du niveau impossible.'),
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
    return String(value ?? '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim();
  }
}
