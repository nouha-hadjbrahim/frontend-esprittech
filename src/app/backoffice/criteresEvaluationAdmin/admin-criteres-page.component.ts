import { CommonModule } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
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
  activeNoteLevels = computed(() => this.noteLevels().filter((level) => level.active));
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
  warningMessage = signal<string | null>(null);
  errorMessage = signal<string | null>(null);
  saving = signal(false);
  deleting = signal(false);
  toggling = signal(false);

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

  get defaultActiveNoteValue(): number {
    return this.activeNoteLevels()[0]?.value ?? 1;
  }

  get maxActiveNoteValue(): number {
    return this.activeNoteLevels().reduce((max, level) => Math.max(max, level.value), this.defaultActiveNoteValue);
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
      defaultNoteValue: [3, [Validators.required, Validators.min(1)]],
      actif: [true],
      ruleEnabled: [false],
      modeEvaluation: [null],
      expectedLivrableTypes: [''],
      minLivrableCount: [1],
      expectedKeyword: [''],
      noteMaxAuto: [null],
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
      noteValue: [4, [Validators.required, Validators.min(1)]],
      priority: [1, [Validators.required, Validators.min(1)]],
      active: [true],
    });

    this.noteLevelForm = this.fb.group({
      value: [1, [Validators.required, Validators.min(1)]],
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
      error: (err) => {
        this.errorEliminatoires.set(this.extractErrorMessage(err, 'Impossible de charger les criteres eliminatoires'));
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
      error: (err) => {
        this.errorNotes.set(this.extractErrorMessage(err, 'Impossible de charger les criteres notes'));
        this.loadingNotes.set(false);
      },
    });
  }

  private loadNoteLevels(): void {
    this.noteLevelService.findAll().pipe(takeUntil(this.destroy$)).subscribe({
      next: (levels) => this.noteLevels.set(levels.sort((a, b) => a.order - b.order)),
      error: (err) => this.showOperationError(err, 'Impossible de charger les niveaux de note.'),
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
        error: (err) => this.showOperationError(err, 'Impossible de charger les regles de notation.'),
      });
  }

  openCreateModal(type: 'eliminatoire' | 'note'): void {
    this.modalType = type;
    this.modalMode = 'create';
    this.selectedCritereId = null;
    if (type === 'eliminatoire') {
      this.eliminatoireForm.reset({ reponseAttendue: ReponseEliminatoire.OK, actif: true, ordre: 1, ruleEnabled: false, minLivrableCount: 1 });
    } else {
      this.noteForm.reset({
        actif: true,
        ordre: 1,
        poids: 1,
        defaultNoteValue: this.defaultActiveNoteValue,
        ruleEnabled: false,
        minLivrableCount: 1,
        noteMaxAuto: this.maxActiveNoteValue,
      });
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
        noteMaxAuto: crit.noteMaxAuto ?? this.maxActiveNoteValue,
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
    if (this.saving()) {
      return;
    }
    if (this.eliminatoireForm.invalid) {
      this.eliminatoireForm.markAllAsTouched();
      this.showValidationWarning('Formulaire invalide.');
      return;
    }
    this.saveEntity(
      this.modalMode === 'create'
        ? this.critereEliminatoireService.create(this.eliminatoireForm.value as CritereEliminatoireRequest)
        : this.critereEliminatoireService.update(this.selectedCritereId!, this.eliminatoireForm.value as CritereEliminatoireRequest),
      this.modalMode === 'create' ? 'Critere eliminatoire cree.' : 'Critere eliminatoire mis a jour.',
      () => this.loadEliminatoires(),
    );
  }

  private saveCritereNote(): void {
    if (this.saving()) {
      return;
    }
    if (this.noteForm.invalid) {
      this.noteForm.markAllAsTouched();
      this.showValidationWarning(this.noteFormValidationMessage());
      return;
    }
    const request: CritereNoteRequest = { ...this.noteForm.value, bareme: this.maxActiveNoteValue, seuil: 3 };
    this.saveEntity(
      this.modalMode === 'create'
        ? this.critereNoteService.create(request)
        : this.critereNoteService.update(this.selectedCritereId!, request),
      this.modalMode === 'create' ? 'Critere note cree.' : 'Critere note mis a jour.',
      () => this.loadNotes(),
    );
  }

  private saveEntity<T>(operation: Observable<T>, message: string, reload: () => void): void {
    this.saving.set(true);
    this.errorMessage.set(null);
    operation.pipe(takeUntil(this.destroy$)).subscribe({
      next: () => {
        this.successMessage.set(message);
        this.warningMessage.set(null);
        this.errorMessage.set(null);
        this.saving.set(false);
        this.closeModal();
        reload();
        setTimeout(() => this.successMessage.set(null), 3000);
      },
      error: (err) => {
        this.showOperationError(err, 'Enregistrement impossible.');
        this.saving.set(false);
      },
    });
  }

  toggleActivation(type: 'eliminatoire' | 'note', critere: CritereEliminatoire | CritereNote): void {
    if (this.toggling() || this.saving() || this.deleting()) {
      return;
    }
    const service = type === 'eliminatoire' ? this.critereEliminatoireService : this.critereNoteService;
    this.toggling.set(true);
    const operation = critere.actif ? service.deactivate(critere.id) : service.activate(critere.id);
    operation.pipe(takeUntil(this.destroy$)).subscribe({
      next: () => {
        this.successMessage.set(critere.actif ? 'Critere desactive.' : 'Critere active.');
        this.warningMessage.set(null);
        this.errorMessage.set(null);
        this.toggling.set(false);
        this.loadCriteres();
        setTimeout(() => this.successMessage.set(null), 3000);
      },
      error: (err) => {
        this.showOperationError(err, 'Changement de statut impossible.');
        this.toggling.set(false);
      },
    });
  }

  deleteCritereNote(critere: CritereNote): void {
    if (this.deleting() || this.saving() || this.toggling()) {
      return;
    }
    if (!window.confirm(`Supprimer le critere note "${critere.libelle}" ?`)) {
      return;
    }
    this.deleting.set(true);
    this.critereNoteService.delete(critere.id).pipe(takeUntil(this.destroy$)).subscribe({
      next: () => {
        this.successMessage.set('Critere note supprime.');
        this.warningMessage.set(null);
        this.errorMessage.set(null);
        this.deleting.set(false);
        this.loadNotes();
        setTimeout(() => this.successMessage.set(null), 3000);
      },
      error: (err) => {
        this.showOperationError(err, 'Ce critère est déjà utilisé dans des évaluations. Vous pouvez le désactiver au lieu de le supprimer.');
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
      noteValue: rule?.noteValue ?? this.maxActiveNoteValue,
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
    if (this.saving()) {
      return;
    }
    if (!this.selectedRuleCritere || this.ruleForm.invalid) {
      this.ruleForm.markAllAsTouched();
      this.showValidationWarning('Regle invalide.');
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
        this.warningMessage.set(null);
        this.errorMessage.set(null);
        this.saving.set(false);
        this.closeRuleModal();
        this.loadRulesForNotes(this.criteresNotes());
      },
      error: (err) => {
        this.showOperationError(err, 'Enregistrement de la regle impossible.');
        this.saving.set(false);
      },
    });
  }

  deleteRule(rule: CritereNoteRule): void {
    if (this.deleting()) {
      return;
    }
    this.deleting.set(true);
    this.critereNoteService.deleteRule(rule.id).pipe(takeUntil(this.destroy$)).subscribe({
      next: () => {
        this.successMessage.set('Regle de notation supprimee.');
        this.warningMessage.set(null);
        this.errorMessage.set(null);
        this.deleting.set(false);
        this.loadRulesForNotes(this.criteresNotes());
      },
      error: (err) => {
        this.showOperationError(err, 'Suppression de la regle impossible.');
        this.deleting.set(false);
      },
    });
  }

  toggleRule(rule: CritereNoteRule): void {
    if (this.toggling()) {
      return;
    }
    this.toggling.set(true);
    const operation = rule.active
      ? this.critereNoteService.deactivateRule(rule.id)
      : this.critereNoteService.activateRule(rule.id);
    operation.pipe(takeUntil(this.destroy$)).subscribe({
      next: () => {
        this.successMessage.set(rule.active ? 'Regle desactivee.' : 'Regle activee.');
        this.warningMessage.set(null);
        this.errorMessage.set(null);
        this.toggling.set(false);
        this.loadRulesForNotes(this.criteresNotes());
      },
      error: (err) => {
        this.showOperationError(err, 'Changement de statut de la regle impossible.');
        this.toggling.set(false);
      },
    });
  }

  openNoteLevelModal(level?: NoteLevel): void {
    this.selectedNoteLevelId = level?.id ?? null;
    this.noteLevelModalMode = level ? 'edit' : 'create';
    this.noteLevelForm.reset({
      value: level?.value ?? this.nextNoteLevelValue(),
      label: level?.label ?? '',
      description: level?.description ?? '',
      active: level?.active ?? true,
      order: level?.order ?? this.nextNoteLevelOrder(),
    });
    this.isNoteLevelModalOpen.set(true);
  }

  closeNoteLevelModal(): void {
    this.isNoteLevelModalOpen.set(false);
    this.selectedNoteLevelId = null;
  }

  saveNoteLevel(): void {
    if (this.saving()) {
      return;
    }
    if (this.noteLevelForm.invalid) {
      this.noteLevelForm.markAllAsTouched();
      this.showValidationWarning(this.noteLevelValidationMessage());
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
        this.warningMessage.set(null);
        this.errorMessage.set(null);
        this.saving.set(false);
        this.closeNoteLevelModal();
        this.loadNoteLevels();
      },
      error: (err) => {
        this.showOperationError(err, 'Enregistrement du niveau impossible.');
        this.saving.set(false);
      },
    });
  }

  toggleNoteLevel(level: NoteLevel): void {
    if (this.toggling()) {
      return;
    }
    this.toggling.set(true);
    const operation = level.active ? this.noteLevelService.deactivate(level.id) : this.noteLevelService.activate(level.id);
    operation.pipe(takeUntil(this.destroy$)).subscribe({
      next: () => {
        this.successMessage.set(level.active ? 'Niveau de note desactive.' : 'Niveau de note active.');
        this.warningMessage.set(null);
        this.errorMessage.set(null);
        this.toggling.set(false);
        this.loadNoteLevels();
      },
      error: (err) => {
        this.showOperationError(err, 'Changement de statut du niveau impossible.');
        this.toggling.set(false);
      },
    });
  }

  deleteNoteLevel(level: NoteLevel): void {
    if (this.deleting() || this.saving() || this.toggling()) {
      return;
    }
    if (!window.confirm(`Supprimer le niveau de note "${level.label}" ?`)) {
      return;
    }
    this.deleting.set(true);
    this.noteLevelService.delete(level.id).pipe(takeUntil(this.destroy$)).subscribe({
      next: () => {
        this.successMessage.set('Niveau de note supprime.');
        this.warningMessage.set(null);
        this.errorMessage.set(null);
        this.deleting.set(false);
        this.loadNoteLevels();
      },
      error: (err) => {
        this.showOperationError(err, 'Suppression du niveau impossible.');
        this.deleting.set(false);
      },
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

  operationInProgress(): boolean {
    return this.saving() || this.deleting() || this.toggling();
  }

  private noteFormValidationMessage(): string {
    const controls = this.noteForm.controls;
    if (controls['libelle'].invalid) {
      return 'Le libelle est obligatoire.';
    }
    if (controls['domaine'].invalid) {
      return 'Le domaine est obligatoire.';
    }
    if (controls['ordre'].invalid) {
      return "L'ordre doit etre superieur ou egal a 1.";
    }
    if (controls['poids'].invalid) {
      return 'Le poids doit etre superieur a 0.';
    }
    if (controls['defaultNoteValue'].invalid) {
      return 'La note par defaut doit etre superieure ou egale a 1.';
    }
    return 'Formulaire invalide.';
  }

  private noteLevelValidationMessage(): string {
    const controls = this.noteLevelForm.controls;
    if (controls['value'].invalid) {
      return 'La valeur du niveau doit etre superieure ou egale a 1.';
    }
    if (controls['order'].invalid) {
      return "L'ordre du niveau doit etre superieur ou egal a 1.";
    }
    if (controls['label'].invalid) {
      return 'Le libelle du niveau est obligatoire.';
    }
    return 'Formulaire invalide.';
  }

  private nextNoteLevelValue(): number {
    return this.noteLevels().reduce((max, level) => Math.max(max, level.value), 0) + 1;
  }

  private nextNoteLevelOrder(): number {
    return this.noteLevels().reduce((max, level) => Math.max(max, level.order), 0) + 1;
  }

  private showValidationWarning(message: string): void {
    this.warningMessage.set(message);
    this.errorMessage.set(null);
    this.successMessage.set(null);
  }

  private showOperationError(err: unknown, fallback: string): void {
    const message = this.extractErrorMessage(err, fallback);
    if (this.isBusinessStatus(err)) {
      this.warningMessage.set(message);
      this.errorMessage.set(null);
    } else {
      this.errorMessage.set(message);
      this.warningMessage.set(null);
    }
    this.successMessage.set(null);
  }

  private extractErrorMessage(err: unknown, fallback: string): string {
    const error = err as HttpErrorResponse;
    const payload = error?.error;
    if (typeof payload === 'string' && payload.trim()) {
      return payload.trim();
    }
    if (payload?.message) {
      return String(payload.message);
    }
    if (payload?.detail) {
      return String(payload.detail);
    }
    const firstFieldError = payload?.errors ? Object.values(payload.errors).find(Boolean) : null;
    if (firstFieldError) {
      return String(firstFieldError);
    }
    if (error?.message) {
      return error.message;
    }
    return fallback;
  }

  private isBusinessStatus(err: unknown): boolean {
    const status = (err as HttpErrorResponse)?.status;
    return status === 400 || status === 404 || status === 409;
  }

  private normalize(value: unknown): string {
    return String(value ?? '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim();
  }
}
