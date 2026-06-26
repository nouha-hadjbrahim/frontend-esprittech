import { CommonModule } from '@angular/common';
import { Component, OnInit, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { QuestionIndustrialisation, QuestionIndustrialisationRequest } from '../../core/models/industrialisation.model';
import { IndustrialisationService } from '../../core/services/industrialisation.service';

@Component({
  selector: 'app-industrialisation-questions',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
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

  readonly typeReponses = ['TEXTE', 'BOOLEAN', 'NUMERIQUE', 'URL', 'FICHIER', 'CHOIX'];
  readonly typeCriteres = ['ELIMINATOIRE', 'NOTE'];

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

  ngOnInit(): void {
    this.load();
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
    this.form.patchValue({
      libelle: question.libelle,
      description: question.description ?? '',
      typeReponse: question.typeReponse,
      obligatoire: question.obligatoire,
      typeCritere: question.typeCritere,
      poids: question.poids ?? 1,
      ordre: question.ordre,
      actif: question.actif,
      conditionEliminatoire: question.conditionEliminatoire ?? false,
    });
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
      poids: raw.poids ?? null,
      ordre: raw.ordre!,
      actif: !!raw.actif,
      conditionEliminatoire: !!raw.conditionEliminatoire,
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
}
