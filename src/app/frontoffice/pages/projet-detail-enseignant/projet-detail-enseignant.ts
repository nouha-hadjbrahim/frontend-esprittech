import { DatePipe } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { Component, OnDestroy, OnInit, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { ProjetDetails, StatutProjet } from '../../../core/models/projet-catalogue.model';
import { LivrableCatalogue } from '../../../core/models/livrable-catalogue.model';
import {
  TYPE_LIVRABLE_LABELS,
  TYPE_LIVRABLE_OPTIONS,
  TypeLivrable,
} from '../../../core/models/livrable.model';
import { ReponseEliminatoire } from '../../../core/models/critere.model';
import { EvaluationResponse, ResultatCritereResponse } from '../../../core/models/evaluation.model';
import {
  CandidatureIndustrialisation,
  EliminatoryWarningsConfirmation,
  IndustrialisationFormResponse,
  QuestionIndustrialisation,
  ReponseIndustrialisationRequest,
  TYPE_INDUSTRIALISATION_LABELS,
  TypeIndustrialisation,
} from '../../../core/models/industrialisation.model';
import { SujetProjet } from '../../../core/models/sujet-projet.model';
import { Affectation } from '../../../core/models/candidature.model';
import { AuthService } from '../../../core/services/auth.service';
import { CandidatureService } from '../../../core/services/candidature.service';
import { CatalogueLivrableService } from '../../../core/services/catalogue-livrable.service';
import { EvaluationService } from '../../../core/services/evaluation.service';
import { HistoriqueService } from '../../../core/services/historique.service';
import { ACTION_LABEL, HistoriqueResponse } from '../../../core/models/historique.model';
import { IndustrialisationService } from '../../../core/services/industrialisation.service';
import { ProjetCatalogueService } from '../../../core/services/projet-catalogue.service';
import { SujetProjetService } from '../../../core/services/sujet-projet.service';
import { STATUT_PROJET_LABELS, TYPE_PROJET_LABELS, DEFAULT_PROJET_COVER_IMAGE } from '../../constants/projet-catalogue.constants';
import { EvaluationChecklistComponent } from '../../../shared/components/evaluation-checklist/evaluation-checklist.component';

type DetailTab = 'infos' | 'membres' | 'livrables' | 'industrialisation' | 'historique';

/** Statuts pour lesquels un projet est publié au catalogue (dépôt de livrables autorisé). */
const STATUTS_CATALOGUE = new Set<StatutProjet>([
  'VALIDE',
  'CANDIDAT_INDUSTRIALISATION_INTERNE',
  'CANDIDAT_INDUSTRIALISATION_EXTERNE',
  'INDUSTRIALISE_DSI',
  'INDUSTRIALISE_EXTERNE',
]);

/**
 * Page de détail d'un projet, vue enseignant (route mes-projets/:id) ou chef
 * (route validation-projets/:id). Les onglets « Livrables » et « Industrialisation »
 * reprennent les fonctionnalités développées sur les sujets (SujetProjet), reliées
 * ici via l'identifiant du sujet d'origine (projet.sujetId).
 */
@Component({
  selector: 'app-projet-detail-enseignant',
  imports: [RouterModule, FormsModule, DatePipe, EvaluationChecklistComponent],
  templateUrl: './projet-detail-enseignant.html',
  styleUrl: './projet-detail-enseignant.css',
})
export class ProjetDetailEnseignant implements OnInit, OnDestroy {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly projetService = inject(ProjetCatalogueService);
  private readonly authService = inject(AuthService);
  private readonly candidatureService = inject(CandidatureService);
  private readonly livrableService = inject(CatalogueLivrableService);
  private readonly historiqueService = inject(HistoriqueService);
  private readonly sujetProjetService = inject(SujetProjetService);
  private readonly evaluationService = inject(EvaluationService);
  private readonly industrialisationService = inject(IndustrialisationService);

  readonly typeLabels = TYPE_PROJET_LABELS;
  readonly statutLabels = STATUT_PROJET_LABELS;
  readonly defaultCoverImage = DEFAULT_PROJET_COVER_IMAGE;
  readonly typeLivrableOptions = TYPE_LIVRABLE_OPTIONS;
  readonly livrableLabels = TYPE_LIVRABLE_LABELS;
  readonly actionLabels = ACTION_LABEL;
  readonly typeIndustrialisationLabels = TYPE_INDUSTRIALISATION_LABELS;
  readonly ReponseEliminatoire = ReponseEliminatoire;
  readonly missingLivrablesWarning = 'Aucun livrable nest déposé pour ce projet. La CI verra cette alerte.';

  projet?: ProjetDetails;
  isLoading = true;
  errorMessage = '';
  activeTab: DetailTab = 'infos';
  backLink = '/frontoffice/mes-projets';
  backLabel = 'Mes projets';

  historique: HistoriqueResponse[] = [];
  historiqueLoading = false;
  historiqueError = '';
  /** Passe à true si le serveur refuse l'accès (projet dont l'utilisateur n'est pas l'encadrant) : section masquée sans alerte. */
  historiqueForbidden = false;

  membres: Affectation[] = [];
  membresLoading = false;
  membresError = '';

  livrables: LivrableCatalogue[] = [];
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

  /** Sujet d'origine (entité SujetProjet) lorsque ce projet catalogue a été publié après terminaison. */
  sujetProjet: SujetProjet | null = null;
  sujetProjetLoading = false;

  // ── Évaluation du projet ────────────────────────────────────────────
  evaluation: EvaluationResponse | null = null;
  evaluationLoading = false;
  evaluationError = '';
  evaluationMessage = '';
  recalculatingScore = false;
  private readonly SCORE_COOLDOWN_SECONDS = 120;
  scoreCooldownRemaining = 0;
  private scoreCooldownTimer: ReturnType<typeof setInterval> | null = null;

  industrialisationOpen = false;
  industrialisationType: TypeIndustrialisation = 'INTERNE';
  industrialisationCommentaire = '';
  industrialisationForm: IndustrialisationFormResponse | null = null;
  industrialisationSaving = false;
  industrialisationUploadingQuestionId: number | null = null;
  industrialisationError = '';
  industrialisationMessage = '';
  industrialisationSubmitAttempted = false;
  eliminatoryWarningConfirmation: EliminatoryWarningsConfirmation | null = null;
  pendingIndustrialisationAction: 'create' | 'submit' | null = null;
  answers: Record<number, ReponseIndustrialisationRequest> = {};

  get coverImage(): string {
    return this.projet?.coverImage || this.defaultCoverImage;
  }

  get objectifLines(): string[] {
    if (!this.projet?.objectifs) return [];
    const lines = this.projet.objectifs.split('\n').map((l) => l.trim()).filter(Boolean);
    return lines.length > 0 ? lines : [this.projet.objectifs];
  }

  get keywordTags(): string[] {
    if (this.projet?.technologies.length) {
      return this.projet.technologies.slice(0, 4);
    }
    return this.projet?.domaines.slice(0, 4) ?? [];
  }

  ngOnInit(): void {
    if (this.router.url.includes('backoffice/catalog')) {
      this.backLink = '/backoffice/catalog';
      this.backLabel = 'Catalogue';
    } else if (this.router.url.includes('validation-projets')) {
      this.backLink = '/frontoffice/validation-projets';
      this.backLabel = 'Validation projets';
    }
    const id = Number(this.route.snapshot.paramMap.get('id'));
    if (!id) {
      this.errorMessage = 'Projet introuvable.';
      this.isLoading = false;
      return;
    }
    this.load(id);
  }

  ngOnDestroy(): void {
    this.clearScoreCooldown();
  }

  private load(id: number): void {
    this.isLoading = true;
    this.projetService.detailsProjet(id).subscribe({
      next: (projet) => {
        this.projet = projet;
        this.isLoading = false;
        this.loadLivrables();
        this.loadMembres();
        this.loadSujetProjet();
        this.loadEvaluation();
        this.loadHistorique(id);
      },
      error: (err) => {
        this.errorMessage =
          err?.status === 403
            ? "Vous n'avez pas accès à ce projet."
            : 'Projet introuvable.';
        this.isLoading = false;
      },
    });
  }

  setTab(tab: DetailTab): void {
    this.activeTab = tab;
  }

  get isOwner(): boolean {
    const userId = this.authService.currentUser()?.id;
    if (!this.projet || userId == null) return false;
    return Number(this.projet.encadrantId) === Number(userId);
  }

  get canManageLivrables(): boolean {
    return this.isOwner && !!this.projet && STATUTS_CATALOGUE.has(this.projet.statut);
  }

  /** Demande disponible tant que le projet catalogue est validé, qu'il provienne d'un sujet ou d'un dépôt manuel. */
  get canRequestIndustrialisation(): boolean {
    return this.isOwner && !!this.projet && this.projet.statut === 'VALIDE';
  }

  loadHistorique(id: number): void {
    this.historiqueLoading = true;
    this.historiqueService.findByProjet(id).subscribe({
      next: (entries) => {
        // Le backend trie par date décroissante ; on affiche le parcours du projet dans l'ordre chronologique.
        this.historique = [...entries].reverse();
        this.historiqueLoading = false;
      },
      error: (err: HttpErrorResponse) => {
        if (err.status === 403) {
          this.historiqueForbidden = true;
        } else {
          this.historiqueError = "Impossible de charger l'historique de ce projet.";
        }
        this.historiqueLoading = false;
      },
    });
  }

  /** Membres issus du sujet d'origine (affectations actives), si le projet catalogue en provient. */
  loadMembres(): void {
    if (!this.projet?.sujetId) {
      this.membres = [];
      this.membresLoading = false;
      this.membresError = '';
      return;
    }
    this.membresLoading = true;
    this.membresError = '';
    this.candidatureService.getAffectationsParSujet(this.projet.sujetId).subscribe({
      next: (membres) => {
        this.membres = membres.filter((m) => m.statut === 'ACTIVE');
        this.membresLoading = false;
      },
      error: () => {
        this.membres = [];
        this.membresError = 'Impossible de charger les membres du projet.';
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

  /** Charge le sujet d'origine (SujetProjet), si ce projet catalogue en provient, pour enrichir l'affichage score/éligibilité. */
  loadSujetProjet(): void {
    if (!this.projet?.sujetId) {
      this.sujetProjet = null;
      return;
    }
    this.sujetProjetLoading = true;
    this.sujetProjetService.getSujetById(this.projet.sujetId).subscribe({
      next: (sujet) => {
        this.sujetProjet = sujet;
        this.sujetProjetLoading = false;
      },
      error: () => {
        this.sujetProjet = null;
        this.sujetProjetLoading = false;
      },
    });
  }

  // ── Évaluation du projet ─────────────────────────────────────────────

  /**
   * Affichage de l'évaluation persistée : disponible pour tout projet publié au catalogue,
   * indépendamment du passage de VALIDE vers un statut d'industrialisation.
   */
  get canViewEvaluation(): boolean {
    return !!this.projet && STATUTS_CATALOGUE.has(this.projet.statut);
  }

  /** Alias historique : l'affichage n'est plus limité au seul statut VALIDE. */
  get isEvaluable(): boolean {
    return this.canViewEvaluation;
  }

  /** Le recalcul reste réservé à l'encadrant sur un projet encore VALIDE (règle backend). */
  get canRecalculateScore(): boolean {
    return this.isOwner && this.projet?.statut === 'VALIDE';
  }

  /** Charge la dernière évaluation du projet catalogue (indexée par l'identifiant de projet). */
  loadEvaluation(): void {
    if (!this.projet || !this.canViewEvaluation) {
      this.evaluation = null;
      return;
    }
    this.evaluationLoading = true;
    this.evaluationError = '';
    this.evaluationService.getLatestProjetCatalogueEvaluation(this.projet.id).subscribe({
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

  /** Formate l'affichage de la note d'un critère (identique à la page sujet). */
  noteResultDisplay(resultat: ResultatCritereResponse): string {
    if (resultat.mlScore != null && resultat.mlMaxScore != null) {
      const normalized = resultat.normalizedScore != null ? ` - ${Math.round(resultat.normalizedScore * 100)}/100` : '';
      return `${resultat.mlScore}/${resultat.mlMaxScore}${normalized}`;
    }
    const note = resultat.noteValue ?? resultat.noteObtenue ?? 0;
    const scale = resultat.bareme && resultat.bareme > 0 ? resultat.bareme : null;
    if (scale) {
      return resultat.noteLabel ? `${note}/${scale} - ${resultat.noteLabel}` : `${note}/${scale}`;
    }
    return resultat.noteLabel ? resultat.noteLabel : String(note);
  }

  get scoreCooldownActive(): boolean {
    return this.scoreCooldownRemaining > 0;
  }

  get scoreCooldownLabel(): string {
    const minutes = Math.floor(this.scoreCooldownRemaining / 60);
    const seconds = this.scoreCooldownRemaining % 60;
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  }

  private startScoreCooldown(seconds = this.SCORE_COOLDOWN_SECONDS): void {
    this.clearScoreCooldown();
    this.scoreCooldownRemaining = seconds;
    this.scoreCooldownTimer = setInterval(() => {
      if (this.scoreCooldownRemaining <= 1) {
        this.clearScoreCooldown();
        return;
      }
      this.scoreCooldownRemaining -= 1;
    }, 1000);
  }

  private clearScoreCooldown(): void {
    if (this.scoreCooldownTimer) {
      clearInterval(this.scoreCooldownTimer);
      this.scoreCooldownTimer = null;
    }
    this.scoreCooldownRemaining = 0;
  }

  recalculateScore(): void {
    if (!this.projet || !this.canRecalculateScore) {
      return;
    }

    if (this.scoreCooldownActive) {
      this.evaluationMessage = '';
      this.evaluationError = '';
      return;
    }

    this.recalculatingScore = true;
    this.evaluationError = '';
    this.evaluationMessage = '';

    this.evaluationService.calculateProjetCatalogueScore(this.projet.id).subscribe({
      next: (evaluation) => {
        this.evaluation = evaluation;
        this.recalculatingScore = false;

        const isSuccessfulEvaluation = evaluation?.processingStatus !== 'FAILED_PERMANENT'
          && evaluation?.processingStatus !== 'NOT_EVALUABLE'
          && evaluation?.eligibilityStatus !== 'NOT_EVALUABLE';

        if (isSuccessfulEvaluation) {
          this.evaluationMessage = 'Score recalculé avec succès.';
          this.startScoreCooldown();
          if (this.projet && evaluation.scoreFinal != null) {
            // Le backend a déjà synchronisé projet.score ; on reflète la valeur localement.
            this.projet = { ...this.projet, score: Math.round(evaluation.scoreFinal) };
          }
        } else {
          this.evaluationError = evaluation?.commentaire
            ?? 'Le recalcul n’a pas produit une évaluation exploitable.';
          this.evaluationMessage = '';
        }

        this.loadEvaluation();
      },
      error: (err) => {
        this.clearScoreCooldown();
        this.evaluationError = err?.error?.message ?? err?.error?.detail ?? 'Recalcul impossible.';
        this.evaluationMessage = '';
        this.recalculatingScore = false;
      },
    });
  }

  /** Recharge le projet catalogue (statut) et son sujet d'origine après une action qui change leur état. */
  private refreshProjetStatut(): void {
    if (!this.projet) return;
    const id = this.projet.id;
    this.projetService.detailsProjet(id).subscribe({
      next: (projet) => {
        this.projet = projet;
        this.loadSujetProjet();
        this.loadEvaluation();
        this.loadHistorique(id);
      },
    });
  }

  loadLivrables(): void {
    if (!this.projet) return;
    this.livrablesLoading = true;
    this.livrableError = '';
    this.livrableService.findByProjet(this.projet.id).subscribe({
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

  onUploadFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    this.selectedUploadFile = input.files?.[0] ?? null;
  }

  uploadLivrable(): void {
    if (!this.projet || !this.selectedUploadFile || !this.uploadForm.nom.trim()) {
      this.livrableError = 'Fichier et nom obligatoires.';
      return;
    }
    this.livrableService.upload(this.projet.id, {
      typeLivrable: this.uploadForm.typeLivrable,
      nom: this.uploadForm.nom.trim(),
      description: this.uploadForm.description.trim(),
      file: this.selectedUploadFile,
    }).subscribe({
      next: () => {
        this.livrableMessage = 'Livrable ajouté.';
        this.livrableError = '';
        this.uploadForm = { typeLivrable: 'DOCUMENTATION', nom: '', description: '' };
        this.selectedUploadFile = null;
        this.loadLivrables();
        setTimeout(() => (this.livrableMessage = ''), 2500);
      },
      error: (err) => (this.livrableError = err?.error?.detail ?? 'Depot impossible.'),
    });
  }

  addLivrableLink(): void {
    if (!this.projet || !this.linkForm.nom.trim() || !this.linkForm.lienExterne.trim()) {
      this.livrableError = 'Nom et lien obligatoires.';
      return;
    }
    this.livrableService.addLink(this.projet.id, {
      typeLivrable: this.linkForm.typeLivrable,
      nom: this.linkForm.nom.trim(),
      description: this.linkForm.description.trim(),
      lienExterne: this.linkForm.lienExterne.trim(),
    }).subscribe({
      next: () => {
        this.livrableMessage = 'Livrable ajouté.';
        this.livrableError = '';
        this.linkForm = { typeLivrable: 'LIEN_GIT', nom: '', description: '', lienExterne: '' };
        this.loadLivrables();
        setTimeout(() => (this.livrableMessage = ''), 2500);
      },
      error: (err) => (this.livrableError = err?.error?.detail ?? 'Ajout impossible.'),
    });
  }

  deleteLivrable(livrable: LivrableCatalogue): void {
    if (livrable.fromSujet) {
      this.livrableError = 'Ce livrable appartient au sujet d’origine et ne peut pas être supprimé ici.';
      return;
    }
    this.livrableService.delete(livrable.id).subscribe({
      next: () => this.loadLivrables(),
      error: () => (this.livrableError = 'Suppression impossible.'),
    });
  }

  downloadLivrable(livrable: LivrableCatalogue): string {
    if (livrable.fromSujet && this.projet) {
      return this.livrableService.downloadPublishedUrl(this.projet.id, livrable.id, true);
    }
    return this.livrableService.downloadUrl(livrable.id);
  }

  livrableDisplayName(livrable: LivrableCatalogue): string {
    return livrable.originalFileName?.trim() || livrable.nom;
  }

  livrableDateLabel(livrable: LivrableCatalogue): string {
    if (!livrable.dateDepot) return '—';
    return new Date(livrable.dateDepot).toLocaleDateString('fr-FR', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    });
  }

  livrableSizeLabel(livrable: LivrableCatalogue): string | null {
    if (livrable.size == null || livrable.size <= 0) return null;
    const bytes = livrable.size;
    if (bytes < 1024) return `${bytes} o`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} Ko`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  }

  // ── Industrialisation ───────────────────────────────────────────────

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

  createIndustrialisation(confirmEliminatoryWarnings = false): void {
    if (!this.projet) return;
    this.industrialisationSaving = true;
    this.industrialisationService.createForCatalogue(this.projet.id, {
      typeIndustrialisation: this.industrialisationType,
      commentaire: this.industrialisationCommentaire.trim(),
      confirmEliminatoryWarnings,
    }).subscribe({
      next: (candidature) => this.loadIndustrialisationForm(candidature.id),
      error: (err) => {
        if (this.handleEliminatoryConfirmation(err, 'create')) {
          return;
        }
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
    this.submitIndustrialisationWithConfirmation(false);
  }

  submitIndustrialisationWithConfirmation(confirmEliminatoryWarnings: boolean): void {
    if (!this.industrialisationForm) return;
    this.industrialisationSubmitAttempted = true;
    const missingQuestions = this.missingRequiredQuestions();
    if (missingQuestions.length > 0) {
      this.industrialisationError = `Reponse obligatoire manquante : ${missingQuestions.join(', ')}.`;
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
        this.industrialisationService.soumettre(candidatureId, { confirmEliminatoryWarnings }).subscribe({
          next: (candidature) => {
            this.industrialisationForm = { ...this.industrialisationForm!, candidature };
            this.industrialisationMessage = 'Demande soumise a la CI.';
            this.industrialisationSaving = false;
            this.industrialisationOpen = false;
            this.refreshProjetStatut();
          },
          error: (err) => {
            if (this.handleEliminatoryConfirmation(err, 'submit')) {
              return;
            }
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

  confirmEliminatoryWarnings(): void {
    const action = this.pendingIndustrialisationAction;
    this.eliminatoryWarningConfirmation = null;
    this.pendingIndustrialisationAction = null;
    if (action === 'create') {
      this.createIndustrialisation(true);
    } else if (action === 'submit') {
      this.submitIndustrialisationWithConfirmation(true);
    }
  }

  cancelEliminatoryWarnings(): void {
    this.eliminatoryWarningConfirmation = null;
    this.pendingIndustrialisationAction = null;
    this.industrialisationSaving = false;
  }

  private handleEliminatoryConfirmation(err: any, action: 'create' | 'submit'): boolean {
    const payload = err?.error as EliminatoryWarningsConfirmation | undefined;
    if (err?.status === 409 && payload?.requiresConfirmation) {
      this.eliminatoryWarningConfirmation = payload;
      this.pendingIndustrialisationAction = action;
      this.industrialisationSaving = false;
      return true;
    }
    return false;
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
      return 'Alerte';
    }
    return 'En attente';
  }

  hasBlockingEliminatoryAnswer(): boolean {
    return this.industrialisationForm?.questions.some(
      (question) => this.automaticEliminatoryResult(question) === ReponseEliminatoire.NOT_OK
    ) ?? false;
  }

  get submissionWarnings(): string[] {
    const warnings = [...(this.industrialisationForm?.candidature.warnings ?? [])];
    const currentLivrablesCount = this.industrialisationForm?.candidature.livrables.length ?? this.livrables.length;
    if (currentLivrablesCount === 0 && !warnings.includes(this.missingLivrablesWarning)) {
      warnings.push(this.missingLivrablesWarning);
    }
    return warnings;
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
      && this.missingRequiredQuestions().length === 0;
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
