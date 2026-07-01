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
import { Affectation, Candidature, StatutCandidature } from '../../../../core/models/candidature.model';
import { SujetProjet } from '../../../../core/models/sujet-projet.model';
import { AuthService } from '../../../../core/services/auth.service';
import { CandidatureService } from '../../../../core/services/candidature.service';
import { EvaluationService } from '../../../../core/services/evaluation.service';
import { IndustrialisationService } from '../../../../core/services/industrialisation.service';
import { LivrableService } from '../../../../core/services/livrable.service';
import { SujetProjetService } from '../../../../core/services/sujet-projet.service';
import { EvaluationChecklistComponent } from '../../../../shared/components/evaluation-checklist/evaluation-checklist.component';
import { ConfirmDialog } from '../../../../shared/components/confirm-dialog/confirm-dialog';
import { CATEGORIE_LABELS, STATUT_LABELS } from '../../../constants/sujet-projet.constants';

@Component({
  selector: 'app-sujet-detail',
  imports: [RouterLink, DatePipe, FormsModule, EvaluationChecklistComponent, ConfirmDialog],
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
  private readonly candidatureService = inject(CandidatureService);

  sujet: SujetProjet | null = null;
  isLoading = true;
  error = false;
  evaluation: EvaluationResponse | null = null;
  evaluationLoading = false;
  evaluationError = '';
  evaluationMessage = '';
  recalculatingScore = false;
  activeTab = 'Informations';
  membres: Affectation[] = [];
  membresLoading = false;
  membresError = '';
  membresMessage = '';
  retraitTargetId: number | null = null;
  retraitMotif = '';
  retraitLoading = false;
  candidatures: Candidature[] = [];
  candidaturesLoading = false;
  candidaturesError = '';
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
  industrialisationUploadingQuestionId: number | null = null;
  industrialisationError = '';
  terminaisonConfirmOpen = false;
  terminaisonLoading = false;
  terminaisonError = '';
  industrialisationMessage = '';
  industrialisationSubmitAttempted = false;
  answers: Record<number, ReponseIndustrialisationRequest> = {};

  readonly typeLivrableOptions = TYPE_LIVRABLE_OPTIONS;
  readonly livrableLabels = TYPE_LIVRABLE_LABELS;
  readonly typeIndustrialisationLabels = TYPE_INDUSTRIALISATION_LABELS;
  readonly ReponseEliminatoire = ReponseEliminatoire;

  get isEtudiant(): boolean {
    return this.authService.getRole() === 'ROLE_ETUDIANT';
  }

  get tabs(): { label: string; icon: string }[] {
    if (this.isEtudiant) {
      return [
        { label: 'Informations', icon: 'info' },
        { label: 'Membres', icon: 'membres' },
      ];
    }

    const items = [
      { label: 'Informations', icon: 'info' },
      { label: 'Membres', icon: 'membres' },
    ];
    if (this.isOwner) {
      items.push({ label: 'Candidatures', icon: 'candidatures' });
    }
    items.push(
      { label: 'Livrables', icon: 'livrables' },
      { label: 'Industrialisation', icon: 'progression' },
    );
    return items;
  }

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
        if (this.isEtudiant && !['Informations', 'Membres'].includes(this.activeTab)) {
          this.activeTab = 'Informations';
        }
        this.loadMembres();
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
    const role = this.authService.getRole();
    if (role === 'ROLE_ENSEIGNANT') return '/frontoffice/sujets/mes-sujets';
    if (role === 'ROLE_CHEF_EQUIPE') return '/frontoffice/validation-sujets';
    return '/frontoffice/sujets/disponibles';
  }

  get backLabel(): string {
    const role = this.authService.getRole();
    if (role === 'ROLE_ENSEIGNANT') return 'Retour à mes sujets';
    if (role === 'ROLE_CHEF_EQUIPE') return 'Retour à la validation';
    return 'Retour aux sujets disponibles';
  }

  get nombreMembres(): number {
    return this.sujet?.nombreMembresActifs ?? this.membres.length;
  }

  get capacitePourcentage(): number {
    if (!this.sujet?.capaciteAccueil) return 0;
    return Math.min(100, Math.round((this.nombreMembres / this.sujet.capaciteAccueil) * 100));
  }

  get placesRestantes(): number {
    if (!this.sujet) return 0;
    return Math.max(0, this.sujet.capaciteAccueil - this.nombreMembres);
  }

  get capaciteEstComplete(): boolean {
    if (!this.sujet) return false;
    return this.nombreMembres >= this.sujet.capaciteAccueil;
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
    if (!this.sujet || userId == null) return false;
    return Number(this.sujet.encadrantId) === Number(userId);
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

  get canRetirerMembre(): boolean {
    if (!this.sujet || this.sujet.statut !== 'REALISATION_EN_COURS') return false;
    const role = this.authService.getRole();
    return this.isOwner || role === 'ROLE_ADMIN' || role === 'ROLE_CHEF_EQUIPE';
  }

  get canDeclarerTerminaison(): boolean {
    if (!this.sujet || !this.isOwner) return false;
    return this.sujet.statut === 'REALISATION_EN_COURS';
  }

  ouvrirTerminaisonConfirm(): void {
    this.terminaisonError = '';
    this.terminaisonConfirmOpen = true;
  }

  annulerTerminaison(): void {
    this.terminaisonConfirmOpen = false;
    this.terminaisonLoading = false;
  }

  confirmerTerminaison(): void {
    if (!this.sujet) return;
    this.terminaisonLoading = true;
    this.terminaisonError = '';
    this.sujetProjetService.declarerTerminaison(this.sujet.id).subscribe({
      next: (updated) => {
        this.terminaisonLoading = false;
        this.terminaisonConfirmOpen = false;
        this.sujet = updated;
        this.loadEvaluation();
      },
      error: (err) => {
        this.terminaisonLoading = false;
        this.terminaisonConfirmOpen = false;
        this.terminaisonError = err?.error?.detail ?? err?.error?.message ?? 'Impossible de déclarer la terminaison.';
      },
    });
  }

  get terminaisonConfirmMessage(): string {
    return this.sujet
      ? `Voulez-vous déclarer le sujet « ${this.sujet.titre} » comme terminé ?`
      : '';
  }

  selectTab(label: string): void {
    this.activeTab = label;
    if (label === 'Candidatures') {
      this.loadCandidatures();
    }
  }

  loadCandidatures(): void {
    if (!this.sujet || !this.isOwner) return;
    this.candidaturesLoading = true;
    this.candidaturesError = '';
    this.candidatureService.getCandidaturesParSujet(this.sujet.id).subscribe({
      next: (candidatures) => {
        this.candidatures = [...candidatures]
          .filter((c) => c.statut === 'DEPOSEE')
          .sort((a, b) => new Date(b.dateDepot).getTime() - new Date(a.dateDepot).getTime());
        this.candidaturesLoading = false;
      },
      error: () => {
        this.candidatures = [];
        this.candidaturesError = 'Impossible de charger les candidatures.';
        this.candidaturesLoading = false;
      },
    });
  }

  candidatureFullName(candidature: Candidature): string {
    return `${candidature.etudiantPrenom} ${candidature.etudiantNom}`.trim();
  }

  candidatureInitials(candidature: Candidature): string {
    const prenom = candidature.etudiantPrenom?.trim().charAt(0) ?? '';
    const nom = candidature.etudiantNom?.trim().charAt(0) ?? '';
    return `${prenom}${nom}`.toUpperCase() || '?';
  }

  candidatureStatutLabel(statut: StatutCandidature): string {
    const labels: Record<StatutCandidature, string> = {
      DEPOSEE: 'En attente',
      ACCEPTEE: 'Acceptée',
      REFUSEE: 'Refusée',
      ARCHIVEE: 'Archivée',
    };
    return labels[statut] ?? statut;
  }

  candidatureStatutClass(statut: StatutCandidature): string {
    const classes: Record<StatutCandidature, string> = {
      DEPOSEE: 'candidature-card__status--pending',
      ACCEPTEE: 'candidature-card__status--accepted',
      REFUSEE: 'candidature-card__status--refused',
      ARCHIVEE: 'candidature-card__status--archived',
    };
    return classes[statut] ?? '';
  }

  loadMembres(): void {
    if (!this.sujet) return;
    this.membresLoading = true;
    this.membresError = '';
    this.candidatureService.getAffectationsParSujet(this.sujet.id).subscribe({
      next: (membres) => {
        this.membres = membres.filter((m) => m.statut === 'ACTIVE');
        this.membresLoading = false;
      },
      error: () => {
        this.membres = [];
        this.membresError = 'Impossible de charger les membres du sujet.';
        this.membresLoading = false;
      },
    });
  }

  memberFullName(membre: Affectation): string {
    return `${membre.etudiantPrenom} ${membre.etudiantNom}`.trim();
  }

  memberInitials(membre: Affectation): string {
    const prenom = membre.etudiantPrenom?.trim().charAt(0) ?? '';
    const nom = membre.etudiantNom?.trim().charAt(0) ?? '';
    return `${prenom}${nom}`.toUpperCase() || '?';
  }

  ouvrirRetraitMembre(membre: Affectation): void {
    this.retraitTargetId = membre.id;
    this.retraitMotif = '';
    this.membresError = '';
    this.membresMessage = '';
  }

  annulerRetraitMembre(): void {
    this.retraitTargetId = null;
    this.retraitMotif = '';
  }

  confirmerRetraitMembre(): void {
    if (!this.retraitTargetId || !this.retraitMotif.trim()) return;
    this.retraitLoading = true;
    this.membresError = '';
    this.candidatureService.retirerEtudiant(this.retraitTargetId, this.retraitMotif.trim()).subscribe({
      next: () => {
        this.retraitLoading = false;
        this.annulerRetraitMembre();
        this.membresMessage = 'Membre retiré du sujet.';
        this.loadMembres();
        this.loadSujet();
        setTimeout(() => this.membresMessage = '', 2500);
      },
      error: (err) => {
        this.retraitLoading = false;
        this.membresError = err?.error?.detail ?? 'Impossible de retirer ce membre.';
      },
    });
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
    this.industrialisationSubmitAttempted = false;
    this.industrialisationUploadingQuestionId = null;
    this.answers = {};
  }

  closeIndustrialisation(): void {
    this.industrialisationOpen = false;
    this.industrialisationSubmitAttempted = false;
    this.industrialisationUploadingQuestionId = null;
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
        this.industrialisationSubmitAttempted = false;
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
    this.industrialisationError = '';
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
    this.industrialisationUploadingQuestionId = question.id;
    this.industrialisationError = '';
    this.industrialisationService.uploadPreuve(this.industrialisationForm.candidature.id, question.id, file).subscribe({
      next: (candidature: CandidatureIndustrialisation) => {
        this.industrialisationForm = { ...this.industrialisationForm!, candidature };
        this.industrialisationMessage = 'Preuve ajoutee.';
        this.industrialisationUploadingQuestionId = null;
        input.value = '';
      },
      error: (err) => {
        this.industrialisationError = err?.error?.detail ?? 'Upload de preuve impossible.';
        this.industrialisationUploadingQuestionId = null;
      },
    });
  }

  submitIndustrialisation(): void {
    if (!this.industrialisationForm) return;
    this.industrialisationSubmitAttempted = true;
    const missingQuestions = this.missingRequiredQuestions();
    if (missingQuestions.length > 0) {
      this.industrialisationError = `Reponse obligatoire manquante : ${missingQuestions.join(', ')}.`;
      return;
    }
    if (this.hasBlockingEliminatoryAnswer()) {
      this.industrialisationError = 'Cette demande contient un critere eliminatoire non conforme.';
      return;
    }
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
      return {
        questionId: question.id,
        valeurTexte: this.textValueForPayload(question, answer),
        valeurBoolean: question.typeReponse === 'BOOLEAN' && typeof answer.valeurBoolean === 'boolean'
          ? answer.valeurBoolean
          : null,
        valeurNumerique: question.typeReponse === 'NUMERIQUE' && answer.valeurNumerique !== undefined && answer.valeurNumerique !== null
          ? Number(answer.valeurNumerique)
          : null,
        valeurUrl: question.typeReponse === 'URL' ? this.cleanText(answer.valeurUrl) : null,
        reponseEliminatoire: question.typeCritere === 'ELIMINATOIRE'
          ? this.automaticEliminatoryResult(question)
          : null,
        noteObtenue: question.typeCritere === 'NOTE' && answer.noteObtenue !== undefined && answer.noteObtenue !== null
          ? Number(answer.noteObtenue)
          : null,
        justificatif: this.cleanText(answer.justificatif),
      };
    });
  }

  setBooleanAnswer(question: QuestionIndustrialisation, value: boolean): void {
    this.ensureAnswer(question).valeurBoolean = value;
    this.ensureAnswer(question).reponseEliminatoire = this.automaticEliminatoryResult(question);
    this.industrialisationMessage = '';
    this.industrialisationError = '';
  }

  onIndustrialisationAnswerChange(): void {
    this.industrialisationMessage = '';
    this.industrialisationError = '';
  }

  automaticEliminatoryResult(question: QuestionIndustrialisation): ReponseEliminatoire | null {
    if (question.typeCritere !== 'ELIMINATOIRE') {
      return null;
    }
    const answer = this.answers[question.id];
    if (!answer) {
      return null;
    }
    if (question.typeReponse === 'BOOLEAN') {
      if (typeof answer.valeurBoolean !== 'boolean') {
        return null;
      }
      return answer.valeurBoolean ? ReponseEliminatoire.OK : ReponseEliminatoire.NOT_OK;
    }
    return this.isQuestionAnswered(question) ? ReponseEliminatoire.OK : null;
  }

  eliminatoryPreviewLabel(question: QuestionIndustrialisation): string {
    const result = this.automaticEliminatoryResult(question);
    if (result === ReponseEliminatoire.OK) {
      return 'Conforme';
    }
    if (result === ReponseEliminatoire.NOT_OK) {
      return 'Bloquant';
    }
    return 'En attente';
  }

  eliminatoryPreviewClass(question: QuestionIndustrialisation): string {
    const result = this.automaticEliminatoryResult(question);
    if (result === ReponseEliminatoire.OK) {
      return 'auto-result--ok';
    }
    if (result === ReponseEliminatoire.NOT_OK) {
      return 'auto-result--ko';
    }
    return 'auto-result--pending';
  }

  hasBlockingEliminatoryAnswer(): boolean {
    return this.industrialisationForm?.questions.some(
      (question) => this.automaticEliminatoryResult(question) === ReponseEliminatoire.NOT_OK
    ) ?? false;
  }

  canSubmitIndustrialisation(): boolean {
    return !!this.industrialisationForm
      && !this.isIndustrialisationBusy()
      && this.missingRequiredQuestions().length === 0
      && !this.hasBlockingEliminatoryAnswer();
  }

  isIndustrialisationBusy(): boolean {
    return this.industrialisationSaving || this.industrialisationUploadingQuestionId !== null;
  }

  isQuestionUploading(question: QuestionIndustrialisation): boolean {
    return this.industrialisationUploadingQuestionId === question.id;
  }

  isRequiredQuestionInvalid(question: QuestionIndustrialisation): boolean {
    return this.industrialisationSubmitAttempted && question.obligatoire && !this.isQuestionAnswered(question);
  }

  isRequiredNoteInvalid(question: QuestionIndustrialisation): boolean {
    return this.industrialisationSubmitAttempted && question.obligatoire && !this.isCriterionPayloadComplete(question);
  }

  questionnaireReadyForSubmission(): boolean {
    return !!this.industrialisationForm
      && this.missingRequiredQuestions().length === 0
      && !this.hasBlockingEliminatoryAnswer();
  }

  isIndustrialisationStepActive(step: 1 | 2 | 3): boolean {
    if (step === 1) {
      return !this.industrialisationForm;
    }
    if (step === 2) {
      return !!this.industrialisationForm && !this.questionnaireReadyForSubmission();
    }
    return !!this.industrialisationForm && this.questionnaireReadyForSubmission();
  }

  isIndustrialisationStepCompleted(step: 1 | 2 | 3): boolean {
    if (step === 1) {
      return !!this.industrialisationForm;
    }
    if (step === 2) {
      return !!this.industrialisationForm && this.questionnaireReadyForSubmission();
    }
    return false;
  }

  isQuestionAnswered(question: QuestionIndustrialisation): boolean {
    const answer = this.answers[question.id];
    if (!answer) {
      return false;
    }
    switch (question.typeReponse) {
      case 'BOOLEAN':
        return typeof answer.valeurBoolean === 'boolean';
      case 'NUMERIQUE':
        return answer.valeurNumerique !== null && answer.valeurNumerique !== undefined && !Number.isNaN(Number(answer.valeurNumerique));
      case 'URL':
        return !!this.cleanText(answer.valeurUrl);
      case 'FICHIER':
        return this.hasUploadedProof(question);
      case 'TEXTE':
      case 'CHOIX':
      default:
        return !!this.cleanText(answer.valeurTexte);
    }
  }

  isNoteAnswered(question: QuestionIndustrialisation): boolean {
    if (question.typeCritere !== 'NOTE') {
      return true;
    }
    const value = this.answers[question.id]?.noteObtenue;
    return value !== null && value !== undefined && !Number.isNaN(Number(value));
  }

  questionTypeLabel(question: QuestionIndustrialisation): string {
    switch (question.typeReponse) {
      case 'BOOLEAN':
        return 'Oui / Non';
      case 'NUMERIQUE':
        return 'Numerique';
      case 'URL':
        return 'URL';
      case 'FICHIER':
        return 'Fichier';
      case 'CHOIX':
        return 'Choix';
      case 'TEXTE':
      default:
        return 'Texte';
    }
  }

  private missingRequiredQuestions(): string[] {
    return this.industrialisationForm?.questions
      .filter((question) => question.obligatoire && (!this.isQuestionAnswered(question) || !this.isCriterionPayloadComplete(question)))
      .map((question) => question.libelle) ?? [];
  }

  private isCriterionPayloadComplete(question: QuestionIndustrialisation): boolean {
    if (question.typeCritere === 'NOTE') {
      return this.isNoteAnswered(question);
    }
    if (question.typeCritere === 'ELIMINATOIRE') {
      return this.automaticEliminatoryResult(question) !== null;
    }
    return true;
  }

  hasUploadedProof(question: QuestionIndustrialisation): boolean {
    const fromForm = this.industrialisationForm?.reponses.find((response) => response.questionId === question.id);
    const fromCandidature = this.industrialisationForm?.candidature.reponses.find((response) => response.questionId === question.id);
    return !!(fromForm?.preuveObjectName || fromForm?.preuveOriginalFileName || fromCandidature?.preuveObjectName || fromCandidature?.preuveOriginalFileName);
  }

  private ensureAnswer(question: QuestionIndustrialisation): ReponseIndustrialisationRequest {
    if (!this.answers[question.id]) {
      this.answers[question.id] = { questionId: question.id };
    }
    return this.answers[question.id];
  }

  private cleanText(value: string | null | undefined): string | null {
    const trimmed = value?.trim();
    return trimmed ? trimmed : null;
  }

  private textValueForPayload(question: QuestionIndustrialisation, answer: ReponseIndustrialisationRequest): string | null {
    return question.typeReponse === 'TEXTE' || question.typeReponse === 'CHOIX'
      ? this.cleanText(answer.valeurTexte)
      : null;
  }
}
