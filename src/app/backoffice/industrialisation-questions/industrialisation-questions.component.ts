import { CommonModule } from '@angular/common';
import { Component, HostListener, OnInit, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormBuilder, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import {
  QuestionIndustrialisation,
  QuestionIndustrialisationRequest,
  TypeCritere,
  TypeReponseIndustrialisation,
} from '../../core/models/industrialisation.model';
import { IndustrialisationService } from '../../core/services/industrialisation.service';

type DropdownKey = 'typeReponse' | 'typeCritere';
type FilterKey = 'statut' | 'critere';
type StatutFilter = '' | 'actif' | 'inactif';
type CritereFilter = '' | TypeCritere;

interface SelectOption<T extends string> {
  value: T;
  label: string;
  description: string;
}

@Component({
  selector: 'app-industrialisation-questions',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule],
  templateUrl: './industrialisation-questions.component.html',
  styleUrl: './industrialisation-questions.component.css',
})
export class IndustrialisationQuestionsComponent implements OnInit {
  private readonly service = inject(IndustrialisationService);
  private readonly fb = inject(FormBuilder);

  questions = signal<QuestionIndustrialisation[]>([]);
  loading = signal(false);
  saving = signal(false);
  message = signal<string | null>(null);
  error = signal<string | null>(null);
  editingId = signal<number | null>(null);
  openDropdown = signal<DropdownKey | null>(null);
  openFilter = signal<FilterKey | null>(null);
  questionSearch = signal('');
  selectedStatut = signal<StatutFilter>('');
  selectedCritere = signal<CritereFilter>('');

  readonly pageSize = 8;
  currentPage = signal(1);

  readonly statutOptions: { value: StatutFilter; label: string }[] = [
    { value: '', label: 'Tous les statuts' },
    { value: 'actif', label: 'Actif' },
    { value: 'inactif', label: 'Inactif' },
  ];

  readonly critereFilterOptions: { value: CritereFilter; label: string }[] = [
    { value: '', label: 'Tous les critères' },
    { value: 'NOTE', label: 'Note' },
    { value: 'ELIMINATOIRE', label: 'Éliminatoire' },
  ];

  filteredQuestions = computed(() => {
    const query = this.normalize(this.questionSearch());
    const statut = this.selectedStatut();
    const critere = this.selectedCritere();
    return this.questions().filter((question) => {
      const matchStatut = !statut || (statut === 'actif' ? question.actif : !question.actif);
      const matchCritere = !critere || question.typeCritere === critere;
      if (!matchStatut || !matchCritere) return false;
      if (!query) return true;
      return this.normalize([
        question.ordre,
        question.libelle,
        question.description,
        question.typeReponse,
        this.typeReponseLabel(question.typeReponse),
        question.typeCritere,
        this.typeCritereLabel(question.typeCritere),
        question.obligatoire ? 'obligatoire oui' : 'facultatif non',
        question.actif ? 'actif' : 'inactif',
      ].join(' ')).includes(query);
    });
  });

  readonly statsCards = computed(() => {
    const all = this.questions();
    return [
      { label: 'Total questions', value: all.length, icon: 'total' as const },
      { label: 'Actives', value: all.filter((q) => q.actif).length, icon: 'active' as const },
      { label: 'Notées', value: all.filter((q) => q.typeCritere === 'NOTE').length, icon: 'note' as const },
      { label: 'Éliminatoires', value: all.filter((q) => q.typeCritere === 'ELIMINATOIRE').length, icon: 'elim' as const },
    ];
  });

  get totalPages(): number {
    return Math.max(1, Math.ceil(this.filteredQuestions().length / this.pageSize));
  }

  get pageNumbers(): number[] {
    return Array.from({ length: this.totalPages }, (_, i) => i + 1);
  }

  get visibleQuestions(): QuestionIndustrialisation[] {
    const start = (this.currentPage() - 1) * this.pageSize;
    return this.filteredQuestions().slice(start, start + this.pageSize);
  }

  get statutFilterLabel(): string {
    return this.statutOptions.find((o) => o.value === this.selectedStatut())?.label ?? 'Tous les statuts';
  }

  get critereFilterLabel(): string {
    return this.critereFilterOptions.find((o) => o.value === this.selectedCritere())?.label ?? 'Tous les critères';
  }

  readonly typeReponses: SelectOption<TypeReponseIndustrialisation>[] = [
    { value: 'TEXTE', label: 'Texte', description: 'Champ libre pour une reponse detaillee.' },
    { value: 'BOOLEAN', label: 'Oui / Non', description: 'Choix binaire, adapte aux criteres eliminatoires.' },
    { value: 'NUMERIQUE', label: 'Numerique', description: 'Valeur chiffree ou note saisie.' },
    { value: 'URL', label: 'URL', description: 'Lien web, depot Git ou documentation en ligne.' },
    { value: 'FICHIER', label: 'Fichier', description: 'Preuve deposee sous forme de fichier.' },
    { value: 'CHOIX', label: 'Choix', description: 'Option selectionnee dans une liste.' },
  ];
  readonly typeCriteres: SelectOption<TypeCritere>[] = [
    { value: 'NOTE', label: 'Note', description: 'Question notee avec poids obligatoire.' },
    { value: 'ELIMINATOIRE', label: 'Eliminatoire', description: 'Question bloquante sans poids de notation.' },
  ];

  readonly form = this.fb.group({
    libelle: ['', [Validators.required, Validators.minLength(3)]],
    description: [''],
    typeReponse: ['TEXTE', Validators.required],
    obligatoire: [true],
    typeCritere: ['NOTE', Validators.required],
    poids: [1],
    ordre: [1, [Validators.required, Validators.min(1)]],
    actif: [true],
    conditionEliminatoire: [false],
  });

  private syncingCriterionState = false;

  constructor() {
    this.form.controls.typeCritere.valueChanges
      .pipe(takeUntilDestroyed())
      .subscribe((value) => this.applyTypeCritereRules(value as TypeCritere | null));

    this.form.controls.conditionEliminatoire.valueChanges
      .pipe(takeUntilDestroyed())
      .subscribe((checked) => this.applyConditionRules(!!checked));
  }

  ngOnInit(): void {
    this.applyTypeCritereRules(this.form.controls.typeCritere.value as TypeCritere);
    this.load();
  }

  @HostListener('document:click')
  closeOverlays(): void {
    this.openDropdown.set(null);
    this.openFilter.set(null);
  }

  toggleFilter(filter: FilterKey, event: Event): void {
    event.stopPropagation();
    this.openDropdown.set(null);
    this.openFilter.update((current) => (current === filter ? null : filter));
  }

  selectStatutFilter(value: StatutFilter): void {
    this.selectedStatut.set(value);
    this.openFilter.set(null);
    this.currentPage.set(1);
  }

  selectCritereFilter(value: CritereFilter): void {
    this.selectedCritere.set(value);
    this.openFilter.set(null);
    this.currentPage.set(1);
  }

  goToPage(page: number): void {
    this.currentPage.set(Math.min(Math.max(page, 1), this.totalPages));
  }

  load(): void {
    this.loading.set(true);
    this.service.findQuestions().subscribe({
      next: (questions) => {
        this.questions.set([...questions].sort((a, b) => a.ordre - b.ordre));
        this.loading.set(false);
      },
      error: () => {
        this.error.set('Impossible de charger les questions.');
        this.loading.set(false);
      },
    });
  }

  edit(question: QuestionIndustrialisation): void {
    this.editingId.set(question.id);
    const typeCritere = question.conditionEliminatoire ? 'ELIMINATOIRE' : question.typeCritere;
    this.form.patchValue({
      libelle: question.libelle,
      description: question.description ?? '',
      typeReponse: question.typeReponse,
      obligatoire: question.obligatoire,
      typeCritere,
      poids: typeCritere === 'NOTE' ? question.poids ?? 1 : null,
      ordre: question.ordre,
      actif: question.actif,
      conditionEliminatoire: typeCritere === 'ELIMINATOIRE',
    });
    this.applyTypeCritereRules(typeCritere);
  }

  reset(): void {
    this.editingId.set(null);
    this.form.reset({
      libelle: '',
      description: '',
      typeReponse: 'TEXTE',
      obligatoire: true,
      typeCritere: 'NOTE',
      poids: 1,
      ordre: 1,
      actif: true,
      conditionEliminatoire: false,
    });
    this.applyTypeCritereRules('NOTE');
  }

  save(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    this.saving.set(true);
    this.error.set(null);
    const raw = this.form.getRawValue();
    const request: QuestionIndustrialisationRequest = {
      libelle: raw.libelle!,
      description: raw.description || null,
      typeReponse: raw.typeReponse as QuestionIndustrialisationRequest['typeReponse'],
      obligatoire: !!raw.obligatoire,
      typeCritere: raw.typeCritere as QuestionIndustrialisationRequest['typeCritere'],
      poids: raw.typeCritere === 'NOTE' ? raw.poids ?? null : null,
      ordre: raw.ordre!,
      actif: !!raw.actif,
      conditionEliminatoire: raw.typeCritere === 'ELIMINATOIRE' || !!raw.conditionEliminatoire,
    };
    const action = this.editingId()
      ? this.service.updateQuestion(this.editingId()!, request)
      : this.service.createQuestion(request);
    action.subscribe({
      next: () => {
        this.message.set(this.editingId() ? 'Question mise a jour.' : 'Question creee.');
        this.saving.set(false);
        this.reset();
        this.load();
        setTimeout(() => this.message.set(null), 2500);
      },
      error: (err) => {
        this.error.set(err?.error?.detail ?? 'Enregistrement impossible.');
        this.saving.set(false);
      },
    });
  }

  toggle(question: QuestionIndustrialisation): void {
    const action = question.actif
      ? this.service.deactivateQuestion(question.id)
      : this.service.activateQuestion(question.id);
    action.subscribe({
      next: () => this.load(),
      error: () => this.error.set('Changement de statut impossible.'),
    });
  }

  toggleDropdown(dropdown: DropdownKey, event: Event): void {
    event.stopPropagation();
    this.openFilter.set(null);
    this.openDropdown.update((current) => current === dropdown ? null : dropdown);
  }

  onDropdownKeydown(dropdown: DropdownKey, event: KeyboardEvent): void {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      this.toggleDropdown(dropdown, event);
    }
    if (event.key === 'Escape') {
      this.openDropdown.set(null);
    }
    if (event.key === 'ArrowDown') {
      event.preventDefault();
      this.openDropdown.set(dropdown);
    }
  }

  selectTypeReponse(value: TypeReponseIndustrialisation, event: Event): void {
    event.stopPropagation();
    this.form.controls.typeReponse.setValue(value);
    this.form.controls.typeReponse.markAsTouched();
    this.openDropdown.set(null);
  }

  selectTypeCritere(value: TypeCritere, event: Event): void {
    event.stopPropagation();
    this.form.controls.typeCritere.setValue(value);
    this.form.controls.typeCritere.markAsTouched();
    this.openDropdown.set(null);
  }

  selectedTypeReponse(): SelectOption<TypeReponseIndustrialisation> {
    return this.typeReponses.find((option) => option.value === this.form.controls.typeReponse.value) ?? this.typeReponses[0];
  }

  selectedTypeCritere(): SelectOption<TypeCritere> {
    return this.typeCriteres.find((option) => option.value === this.form.controls.typeCritere.value) ?? this.typeCriteres[0];
  }

  isNoteQuestion(): boolean {
    return this.form.controls.typeCritere.value === 'NOTE';
  }

  isEliminatoryQuestion(): boolean {
    return this.form.controls.typeCritere.value === 'ELIMINATOIRE';
  }

  typeReponseLabel(type: TypeReponseIndustrialisation): string {
    return this.typeReponses.find((option) => option.value === type)?.label ?? type;
  }

  typeCritereLabel(type: TypeCritere): string {
    return this.typeCriteres.find((option) => option.value === type)?.label ?? type;
  }

  updateQuestionSearch(value: string): void {
    this.questionSearch.set(value);
    this.currentPage.set(1);
  }

  private applyTypeCritereRules(value: TypeCritere | null): void {
    if (this.syncingCriterionState) {
      return;
    }
    this.syncingCriterionState = true;
    const poids = this.form.controls.poids;
    const condition = this.form.controls.conditionEliminatoire;
    if (value === 'ELIMINATOIRE') {
      condition.setValue(true, { emitEvent: false });
      poids.clearValidators();
      poids.setValue(null, { emitEvent: false });
      poids.disable({ emitEvent: false });
    } else {
      condition.setValue(false, { emitEvent: false });
      poids.enable({ emitEvent: false });
      poids.setValidators([Validators.required, Validators.min(1)]);
      if (poids.value == null || Number(poids.value) < 1) {
        poids.setValue(1, { emitEvent: false });
      }
    }
    poids.updateValueAndValidity({ emitEvent: false });
    this.syncingCriterionState = false;
  }

  private applyConditionRules(checked: boolean): void {
    if (this.syncingCriterionState) {
      return;
    }
    this.form.controls.typeCritere.setValue(checked ? 'ELIMINATOIRE' : 'NOTE');
  }

  private normalize(value: unknown): string {
    return String(value ?? '')
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .trim();
  }
}
