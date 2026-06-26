import { DatePipe } from '@angular/common';
import { Component, OnInit, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { ReponseEliminatoire } from '../../../../core/models/critere.model';
import { EvaluationResponse } from '../../../../core/models/evaluation.model';
import {
  CandidatureIndustrialisation,
  IndustrialisationFormResponse,
  QuestionIndustrialisation,
  ReponseIndustrialisationRequest,
  TYPE_INDUSTRIALISATION_LABELS,
  TypeIndustrialisation,
} from '../../../../core/models/industrialisation.model';
import { Livrable, TYPE_LIVRABLE_LABELS, TYPE_LIVRABLE_OPTIONS, TypeLivrable } from '../../../../core/models/livrable.model';
import { SujetProjet } from '../../../../core/models/sujet-projet.model';
import { AuthService } from '../../../../core/services/auth.service';
import { EvaluationService } from '../../../../core/services/evaluation.service';
import { IndustrialisationService } from '../../../../core/services/industrialisation.service';
import { LivrableService } from '../../../../core/services/livrable.service';
import { SujetProjetService } from '../../../../core/services/sujet-projet.service';
import { EvaluationChecklistComponent } from '../../../../shared/components/evaluation-checklist/evaluation-checklist.component';
import { CATEGORIE_LABELS, STATUT_LABELS } from '../../../constants/sujet-projet.constants';

@Component({
  selector: 'app-sujet-detail',
  imports: [RouterLink, DatePipe, FormsModule, EvaluationChecklistComponent],
  templateUrl: './sujet-detail.html',
  styleUrl: './sujet-detail.css',
})
export class SujetDetail implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly sujetProjetService = inject(SujetProjetService);
  private readonly authService = inject(AuthService);
  private readonly evaluationService = inject(EvaluationService);
  private readonly livrableService = inject(LivrableService);
  private readonly industrialisationService = inject(IndustrialisationService);

  sujet: SujetProjet | null = null;
  isLoading = true;
  error = false;
  evaluation: EvaluationResponse | null = null;
  evaluationLoading = false;
  evaluationError = '';
  evaluationMessage = '';
  recalculatingScore = false;
  activeTab = 'Informations';
  livrables: Livrable[] = [];
  livrablesLoading = false;
  livrableError = '';
  livrableMessage = '';
  selectedUploadFile: File | null = null;
  uploadForm = {
    typeLivrable: 'DOCUMENTATION' as TypeLivrable,
    nom: '',
    description: '',
  };
  linkForm = {
    typeLivrable: 'LIEN_GIT' as TypeLivrable,
    nom: '',
    description: '',
    lienExterne: '',
  };
  industrialisationOpen = false;
  industrialisationType: TypeIndustrialisation = 'INTERNE';
  industrialisationCommentaire = '';
  industrialisationForm: IndustrialisationFormResponse | null = null;
  industrialisationSaving = false;
  industrialisationError = '';
  industrialisationMessage = '';
  answers: Record<number, ReponseIndustrialisationRequest> = {};

  readonly tabs = [
    { label: 'Informations', icon: 'info' },
    { label: 'Livrables', icon: 'livrables' },
    { label: 'Industrialisation', icon: 'progression' },
  ];
  readonly typeLivrableOptions = TYPE_LIVRABLE_OPTIONS;
  readonly livrableLabels = TYPE_LIVRABLE_LABELS;
  readonly typeIndustrialisationLabels = TYPE_INDUSTRIALISATION_LABELS;
  readonly ReponseEliminatoire = ReponseEliminatoire;

  private readonly techColorClasses = [
    'tag--green',
    'tag--purple',
    'tag--yellow',
    'tag--teal',
    'tag--green',
    'tag--purple',
    'tag--yellow',
    'tag--teal',
  ];

  ngOnInit(): void {
    this.loadSujet();
  }

  loadSujet(): void {
    const id = Number(this.route.snapshot.paramMap.get('id'));
    this.sujetProjetService.getSujetById(id).subscribe({
      next: (sujet) => {
        this.sujet = sujet;
        this.isLoading = false;
        this.loadLivrables();
        this.loadEvaluation();
      },
      error: () => {
        this.error = true;
        this.isLoading = false;
      },
    });
  }

  get backLink(): string {
    return this.authService.getRole() === 'ROLE_ENSEIGNANT'
      ? '/frontoffice/sujets/mes-sujets'
      : '/frontoffice/sujets/disponibles';
  }

  get backLabel(): string {
    return this.authService.getRole() === 'ROLE_ENSEIGNANT'
      ? 'Retour à mes sujets'
      : 'Retour aux sujets disponibles';
  }

  get categorieLabel(): string {
    if (!this.sujet) return '';
    return CATEGORIE_LABELS[this.sujet.categorie]?.label ?? this.sujet.categorie;
  }

  get statutLabel(): string {
    if (!this.sujet) return '';
    return STATUT_LABELS[this.sujet.statut]?.label ?? this.sujet.statut;
  }

  get statutClass(): string {
    if (!this.sujet) return 'badge--neutral';
    return STATUT_LABELS[this.sujet.statut]?.cssClass ?? 'badge--neutral';
  }

  get techColors(): string[] {
    return this.sujet?.technologies.map((_, i) => this.techColorClasses[i % this.techColorClasses.length]) ?? [];
  }

  get objectifLines(): string[] {
    if (!this.sujet) return [];
    const lines = this.sujet.objectifs.split('\n').map((l) => l.trim()).filter(Boolean);
    return lines.length > 0 ? lines : [this.sujet.objectifs];
  }

  get keywordTags(): string[] {
    return this.sujet?.technologies.slice(0, 4) ?? [];
  }

  get isOwner(): boolean {
    const userId = this.authService.currentUser()?.id;
    return !!this.sujet && userId != null && this.sujet.encadrantId === userId;
  }

  get canManageLivrables(): boolean {
    return this.isOwner && !!this.sujet && ['REALISATION_EN_COURS', 'REALISATION_TERMINEE'].includes(this.sujet.statut);
  }

  get canRequestIndustrialisation(): boolean {
    return this.isOwner && !!this.sujet && this.sujet.statut === 'REALISATION_TERMINEE';
  }

  get canRecalculateScore(): boolean {
    return this.isOwner && !!this.sujet && this.sujet.statut === 'REALISATION_TERMINEE';
  }

  selectTab(label: string): void {
    this.activeTab = label;
  }

  loadLivrables(): void {
    if (!this.sujet || !['ROLE_ENSEIGNANT', 'ROLE_CI', 'ROLE_ADMIN'].includes(this.authService.getRole() ?? '')) {
      return;
    }
    this.livrablesLoading = true;
    this.livrableService.findByProjet(this.sujet.id).subscribe({
      next: (livrables) => {
        this.livrables = livrables;
        this.livrablesLoading = false;
      },
      error: () => {
        this.livrableError = 'Impossible de charger les livrables.';
        this.livrablesLoading = false;
      },
    });
  }

  loadEvaluation(): void {
    if (!this.sujet || !['ROLE_ENSEIGNANT', 'ROLE_CI', 'ROLE_ADMIN'].includes(this.authService.getRole() ?? '')) {
      this.evaluation = null;
      return;
    }
    this.evaluationLoading = true;
    this.evaluationError = '';
    this.evaluationService.getLatestEvaluation(this.sujet.id).subscribe({
      next: (evaluation) => {
        this.evaluation = evaluation;
        this.evaluationLoading = false;
      },
      error: () => {
        this.evaluation = null;
        this.evaluationLoading = false;
      },
    });
  }

  recalculateScore(): void {
    if (!this.sujet || !this.canRecalculateScore) {
      return;
    }
    this.recalculatingScore = true;
    this.evaluationError = '';
    this.evaluationService.calculateScore(this.sujet.id).subscribe({
      next: (evaluation) => {
        this.evaluation = evaluation;
        this.evaluationMessage = 'Score recalculé avec succès.';
        this.recalculatingScore = false;
        this.loadSujet();
      },
      error: (err) => {
        this.evaluationError = err?.error?.detail ?? 'Recalcul impossible.';
        this.recalculatingScore = false;
      },
    });
  }

  onUploadFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    this.selectedUploadFile = input.files?.[0] ?? null;
  }

  uploadLivrable(): void {
    if (!this.sujet || !this.selectedUploadFile || !this.uploadForm.nom.trim()) {
      this.livrableError = 'Fichier et nom obligatoires.';
      return;
    }
    this.livrableService.upload(this.sujet.id, {
      typeLivrable: this.uploadForm.typeLivrable,
      nom: this.uploadForm.nom.trim(),
      description: this.uploadForm.description.trim(),
      file: this.selectedUploadFile,
    }).subscribe({
      next: () => {
        this.livrableMessage = 'Livrable ajouté. Vous pouvez recalculer le score du projet.';
        this.livrableError = '';
        this.uploadForm = { typeLivrable: 'DOCUMENTATION', nom: '', description: '' };
        this.selectedUploadFile = null;
        this.loadLivrables();
        setTimeout(() => this.livrableMessage = '', 2500);
      },
      error: (err) => this.livrableError = err?.error?.detail ?? 'Depot impossible.',
    });
  }

  addLivrableLink(): void {
    if (!this.sujet || !this.linkForm.nom.trim() || !this.linkForm.lienExterne.trim()) {
      this.livrableError = 'Nom et lien obligatoires.';
      return;
    }
    this.livrableService.addLink(this.sujet.id, {
      typeLivrable: this.linkForm.typeLivrable,
      nom: this.linkForm.nom.trim(),
      description: this.linkForm.description.trim(),
      lienExterne: this.linkForm.lienExterne.trim(),
    }).subscribe({
      next: () => {
        this.livrableMessage = 'Livrable ajouté. Vous pouvez recalculer le score du projet.';
        this.livrableError = '';
        this.linkForm = { typeLivrable: 'LIEN_GIT', nom: '', description: '', lienExterne: '' };
        this.loadLivrables();
        setTimeout(() => this.livrableMessage = '', 2500);
      },
      error: (err) => this.livrableError = err?.error?.detail ?? 'Ajout impossible.',
    });
  }

  deleteLivrable(livrable: Livrable): void {
    this.livrableService.delete(livrable.id).subscribe({
      next: () => this.loadLivrables(),
      error: () => this.livrableError = 'Suppression impossible.',
    });
  }

  downloadLivrable(livrable: Livrable): string {
    return this.livrableService.downloadUrl(livrable.id);
  }

  openIndustrialisation(): void {
    this.industrialisationOpen = true;
    this.industrialisationForm = null;
    this.industrialisationError = '';
    this.industrialisationMessage = '';
    this.answers = {};
  }

  closeIndustrialisation(): void {
    this.industrialisationOpen = false;
  }

  createIndustrialisation(): void {
    if (!this.sujet) return;
    this.industrialisationSaving = true;
    this.industrialisationService.create(this.sujet.id, {
      typeIndustrialisation: this.industrialisationType,
      commentaire: this.industrialisationCommentaire.trim(),
    }).subscribe({
      next: (candidature) => this.loadIndustrialisationForm(candidature.id),
      error: (err) => {
        this.industrialisationError = err?.error?.detail ?? 'Creation de la demande impossible.';
        this.industrialisationSaving = false;
      },
    });
  }

  loadIndustrialisationForm(candidatureId: number): void {
    this.industrialisationService.getFormulaire(candidatureId).subscribe({
      next: (form) => {
        this.industrialisationForm = form;
        this.answers = {};
        for (const question of form.questions) {
          const existing = form.reponses.find((r) => r.questionId === question.id);
          this.answers[question.id] = {
            questionId: question.id,
            valeurTexte: existing?.valeurTexte ?? '',
            valeurBoolean: existing?.valeurBoolean ?? null,
            valeurNumerique: existing?.valeurNumerique ?? null,
            valeurUrl: existing?.valeurUrl ?? '',
            reponseEliminatoire: existing?.reponseEliminatoire ?? null,
            noteObtenue: existing?.noteObtenue ?? null,
            justificatif: existing?.justificatif ?? '',
          };
        }
        this.industrialisationSaving = false;
      },
      error: () => {
        this.industrialisationError = 'Chargement du formulaire impossible.';
        this.industrialisationSaving = false;
      },
    });
  }

  saveIndustrialisationAnswers(): void {
    if (!this.industrialisationForm) return;
    this.industrialisationSaving = true;
    this.industrialisationService.saveReponses(this.industrialisationForm.candidature.id, {
      reponses: this.buildIndustrialisationAnswers(),
    }).subscribe({
      next: (candidature) => {
        this.industrialisationMessage = 'Reponses enregistrees.';
        this.industrialisationForm = { ...this.industrialisationForm!, candidature };
        this.industrialisationSaving = false;
      },
      error: (err) => {
        this.industrialisationError = err?.error?.detail ?? 'Enregistrement impossible.';
        this.industrialisationSaving = false;
      },
    });
  }

  uploadProof(question: QuestionIndustrialisation, event: Event): void {
    if (!this.industrialisationForm) return;
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;
    this.industrialisationService.uploadPreuve(this.industrialisationForm.candidature.id, question.id, file).subscribe({
      next: (candidature: CandidatureIndustrialisation) => {
        this.industrialisationForm = { ...this.industrialisationForm!, candidature };
        this.industrialisationMessage = 'Preuve ajoutee.';
      },
      error: (err) => this.industrialisationError = err?.error?.detail ?? 'Upload de preuve impossible.',
    });
  }

  submitIndustrialisation(): void {
    if (!this.industrialisationForm) return;
    this.industrialisationSaving = true;
    this.industrialisationError = '';
    const candidatureId = this.industrialisationForm.candidature.id;
    this.industrialisationService.saveReponses(candidatureId, {
      reponses: this.buildIndustrialisationAnswers(),
    }).subscribe({
      next: (savedCandidature) => {
        this.industrialisationForm = { ...this.industrialisationForm!, candidature: savedCandidature };
        this.industrialisationService.soumettre(candidatureId).subscribe({
          next: (candidature) => {
            this.industrialisationForm = { ...this.industrialisationForm!, candidature };
            this.industrialisationMessage = 'Demande soumise a la CI.';
            this.industrialisationSaving = false;
            this.industrialisationOpen = false;
            this.activeTab = 'Industrialisation';
            this.loadSujet();
          },
          error: (err) => {
            this.industrialisationError = err?.error?.detail ?? 'Soumission impossible.';
            this.industrialisationSaving = false;
          },
        });
      },
      error: (err) => {
        this.industrialisationError = err?.error?.detail ?? 'Enregistrement des reponses impossible.';
        this.industrialisationSaving = false;
      },
    });
  }

  private buildIndustrialisationAnswers(): ReponseIndustrialisationRequest[] {
    if (!this.industrialisationForm) {
      return [];
    }
    return this.industrialisationForm.questions.map((question) => {
      const answer = this.answers[question.id] ?? { questionId: question.id };
      const valeurBoolean = typeof answer.valeurBoolean === 'boolean' ? answer.valeurBoolean : null;
      return {
        questionId: question.id,
        valeurTexte: this.cleanText(answer.valeurTexte),
        valeurBoolean,
        valeurNumerique: answer.valeurNumerique === undefined || answer.valeurNumerique === null
          ? null
          : Number(answer.valeurNumerique),
        valeurUrl: this.cleanText(answer.valeurUrl),
        reponseEliminatoire: answer.reponseEliminatoire ?? null,
        noteObtenue: answer.noteObtenue === undefined || answer.noteObtenue === null
          ? null
          : Number(answer.noteObtenue),
        justificatif: this.cleanText(answer.justificatif),
      };
    });
  }

  private cleanText(value: string | null | undefined): string | null {
    const trimmed = value?.trim();
    return trimmed ? trimmed : null;
  }
}
