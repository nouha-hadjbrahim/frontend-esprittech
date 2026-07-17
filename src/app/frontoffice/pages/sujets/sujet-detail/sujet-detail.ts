import { DatePipe } from '@angular/common';
import { Component, OnDestroy, OnInit, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { ReponseEliminatoire } from '../../../../core/models/critere.model';
import { EvaluationResponse, ResultatCritereResponse } from '../../../../core/models/evaluation.model';
import {
  CandidatureIndustrialisation,
  EliminatoryWarningsConfirmation,
  IndustrialisationFormResponse,
  QuestionIndustrialisation,
  ReponseIndustrialisationRequest,
  TYPE_INDUSTRIALISATION_LABELS,
  TypeIndustrialisation,
} from '../../../../core/models/industrialisation.model';
import { Livrable, TYPE_LIVRABLE_LABELS, TYPE_LIVRABLE_OPTIONS, TypeLivrable } from '../../../../core/models/livrable.model';
import { Affectation, Candidature, StatutCandidature } from '../../../../core/models/candidature.model';
import { HistoriqueEntry, HistoriqueFilter } from '../../../../core/models/historique.model';
import { SujetProjet } from '../../../../core/models/sujet-projet.model';
import { AuthService } from '../../../../core/services/auth.service';
import { CandidatureService } from '../../../../core/services/candidature.service';
import { EvaluationService } from '../../../../core/services/evaluation.service';
import { HistoriqueService } from '../../../../core/services/historique.service';
import { IndustrialisationService } from '../../../../core/services/industrialisation.service';
import { LivrableService } from '../../../../core/services/livrable.service';
import { SujetProjetService } from '../../../../core/services/sujet-projet.service';
import { EvaluationChecklistComponent } from '../../../../shared/components/evaluation-checklist/evaluation-checklist.component';
import { CATEGORIE_LABELS, STATUT_CANDIDATURE_LABELS, STATUT_LABELS } from '../../../constants/sujet-projet.constants';

@Component({
  selector: 'app-sujet-detail',
  imports: [RouterLink, DatePipe, FormsModule, EvaluationChecklistComponent],
  templateUrl: './sujet-detail.html',
})
export class SujetDetail implements OnInit,OnDestroy  {
  private readonly route = inject(ActivatedRoute);
  private readonly sujetProjetService = inject(SujetProjetService);
  private readonly authService = inject(AuthService);
  private readonly evaluationService = inject(EvaluationService);
  private readonly livrableService = inject(LivrableService);
  private readonly industrialisationService = inject(IndustrialisationService);
  private readonly candidatureService = inject(CandidatureService);
  private readonly historiqueService = inject(HistoriqueService);

  sujet: SujetProjet | null = null;
  isLoading = true;
  error = false;
  evaluation: EvaluationResponse | null = null;
  evaluationLoading = false;
  evaluationError = '';
  evaluationMessage = '';
  recalculatingScore = false;
  private readonly SCORE_COOLDOWN_SECONDS = 120;
scoreCooldownRemaining = 0;
private scoreCooldownTimer: ReturnType<typeof setInterval> | null = null;
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
  historiqueEntries: HistoriqueEntry[] = [];
  historiqueLoading = false;
  historiqueError = '';
  historiqueFilter: HistoriqueFilter = 'TOUT';
  historiqueSearch = '';
  readonly historiqueFilterChips: { value: HistoriqueFilter; label: string; dot?: string }[] = [
    { value: 'TOUT', label: 'Tous' },
    { value: 'SUJET', label: 'Sujets', dot: 'sujet' },
    { value: 'CANDIDATURE', label: 'Candidatures', dot: 'candidature' },
  ];
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
  terminaisonCoverPreview: string | null = null;
  terminaisonCoverBase64: string | null = null;
  terminaisonCoverContentType: string | null = null;
  terminaisonCoverError = '';

  private static readonly COVER_ALLOWED_TYPES = [
    'image/png',
    'image/jpeg',
    'image/jpg',
    'image/pjpeg',
    'image/webp',
  ];
  /** Limite d'entrée avant compression automatique (20 Mo). */
  private static readonly COVER_INPUT_MAX_BYTES = 20 * 1024 * 1024;
  /** Taille cible après compression pour l'envoi API. */
  private static readonly COVER_TARGET_MAX_BYTES = 2 * 1024 * 1024;
  industrialisationMessage = '';
  industrialisationSubmitAttempted = false;
  eliminatoryWarningConfirmation: EliminatoryWarningsConfirmation | null = null;
  pendingIndustrialisationAction: 'create' | 'submit' | null = null;
  answers: Record<number, ReponseIndustrialisationRequest> = {};

  readonly typeLivrableOptions = TYPE_LIVRABLE_OPTIONS;
  readonly livrableLabels = TYPE_LIVRABLE_LABELS;
  readonly typeIndustrialisationLabels = TYPE_INDUSTRIALISATION_LABELS;
  readonly ReponseEliminatoire = ReponseEliminatoire;
  readonly missingLivrablesWarning = 'Aucun livrable nest déposé pour ce projet. La CI verra cette alerte.';

  get isEtudiant(): boolean {
    return this.authService.getRole() === 'ROLE_ETUDIANT';
  }

  get isEnseignant(): boolean {
    return this.authService.getRole() === 'ROLE_ENSEIGNANT';
  }

  get isChefEquipe(): boolean {
    return this.authService.getRole() === 'ROLE_CHEF_EQUIPE';
  }

  get canManageCandidatures(): boolean {
    return this.isOwner && (this.isEnseignant || this.isChefEquipe);
  }

  get canViewHistorique(): boolean {
    const role = this.authService.getRole();
    if (role === 'ROLE_ADMIN' || role === 'ROLE_CI' || role === 'ROLE_CHEF_EQUIPE') {
      return true;
    }
    return this.isEnseignant && this.isOwner;
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
    if (this.canManageCandidatures) {
      items.push({ label: 'Candidatures', icon: 'candidatures' });
    }
    if (this.canViewHistorique) {
      items.push({ label: 'Historique', icon: 'historique' });
    }
    items.push(
      { label: 'Livrables', icon: 'livrables' },
      { label: 'Industrialisation', icon: 'industrialisation' },
    );
    return items;
  }

  get filteredHistorique(): HistoriqueEntry[] {
    const q = this.historiqueSearch.trim().toLowerCase();
    if (!q) return this.historiqueEntries;
    return this.historiqueEntries.filter((entry) => {
      const actor = `${entry.actorPrenom ?? ''} ${entry.actorNom ?? ''}`.toLowerCase();
      const action = this.historiqueActionTitle(entry).toLowerCase();
      const summary = (entry.summary ?? '').toLowerCase();
      const motif = (this.historiqueMotif(entry) ?? '').toLowerCase();
      return actor.includes(q) || action.includes(q) || summary.includes(q) || motif.includes(q);
    });
  }

  get historiqueGroups(): { dateKey: string; dateLabel: string; count: number; entries: HistoriqueEntry[] }[] {
    const groups = new Map<string, HistoriqueEntry[]>();
    for (const entry of this.filteredHistorique) {
      const key = this.historiqueDateKey(entry.createdAt);
      const list = groups.get(key) ?? [];
      list.push(entry);
      groups.set(key, list);
    }
    return Array.from(groups.entries()).map(([dateKey, entries]) => ({
      dateKey,
      dateLabel: this.formatHistoriqueDateLabel(dateKey),
      count: entries.length,
      entries,
    }));
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
        if (this.activeTab === 'Candidatures' && !this.canManageCandidatures) {
          this.activeTab = 'Informations';
        }
        if (this.activeTab === 'Historique' && !this.canViewHistorique) {
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
    if (role === 'ROLE_CHEF_EQUIPE') {
      return this.isOwner ? '/frontoffice/sujets/mes-sujets' : '/frontoffice/validation-sujets';
    }
    return '/frontoffice/sujets/disponibles';
  }

  get backLabel(): string {
    const role = this.authService.getRole();
    if (role === 'ROLE_ENSEIGNANT') return 'Retour à mes sujets';
    if (role === 'ROLE_CHEF_EQUIPE') {
      return this.isOwner ? 'Retour à mes sujets' : 'Retour à la validation';
    }
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

  get encadrantInitials(): string {
    const name = this.sujet?.encadrantNom?.trim() ?? '';
    const parts = name.split(/\s+/).filter(Boolean);
    if (parts.length === 0) return '?';
    if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
    return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
  }

  get periodeLabel(): string {
    if (!this.sujet) return '—';
    const start = this.sujet.dateDebutRealisation || this.sujet.dateSoumission || this.sujet.dateCreation;
    const end = this.sujet.dateTerminaison;
    if (!start) return '—';
    const fmt = (d: string) => d.slice(0, 10);
    return end ? `${fmt(start)} → ${fmt(end)}` : `${fmt(start)} → …`;
  }

  get dureeLabel(): string {
    if (!this.sujet) return '—';
    const start = this.sujet.dateDebutRealisation || this.sujet.dateSoumission;
    const end = this.sujet.dateTerminaison;
    if (!start || !end) return '—';
    const weeks = Math.max(
      1,
      Math.round((new Date(end).getTime() - new Date(start).getTime()) / (7 * 24 * 3600 * 1000))
    );
    return `${weeks} semaine${weeks > 1 ? 's' : ''}`;
  }

  get domaineLabel(): string {
    return this.sujet?.domaines?.filter(Boolean).join(', ') || '—';
  }

  get titleMain(): string {
    const titre = this.sujet?.titre?.trim() ?? '';
    const parts = titre.split(/\s+/);
    if (parts.length <= 1) return titre;
    return parts.slice(0, -1).join(' ');
  }

  get titleAccent(): string {
    const titre = this.sujet?.titre?.trim() ?? '';
    const parts = titre.split(/\s+/);
    if (parts.length <= 1) return '';
    return parts[parts.length - 1];
  }

  get periodeStartLabel(): string {
    if (!this.sujet) return '—';
    const start = this.sujet.dateDebutRealisation || this.sujet.dateSoumission || this.sujet.dateCreation;
    return start ? start.slice(0, 10) : '—';
  }

  get periodeEndLabel(): string {
    if (!this.sujet?.dateTerminaison) return '…';
    return this.sujet.dateTerminaison.slice(0, 10);
  }

  get dureeHeuresLabel(): string {
    if (!this.sujet) return '';
    const start = this.sujet.dateDebutRealisation || this.sujet.dateSoumission;
    const end = this.sujet.dateTerminaison;
    if (!start || !end) return '';
    const hours = Math.max(
      1,
      Math.round((new Date(end).getTime() - new Date(start).getTime()) / (3600 * 1000))
    );
    return `= ${hours} heures`;
  }

  get capaciteHint(): string {
    if (!this.sujet) return '';
    if (this.capaciteEstComplete) return 'Capacité complète.';
    const n = this.placesRestantes;
    return `${n} place${n > 1 ? 's' : ''} encore disponible${n > 1 ? 's' : ''}.`;
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
    this.terminaisonCoverError = '';
    this.terminaisonCoverPreview = null;
    this.terminaisonCoverBase64 = null;
    this.terminaisonCoverContentType = null;
    this.terminaisonConfirmOpen = true;
  }

  annulerTerminaison(): void {
    this.terminaisonConfirmOpen = false;
    this.terminaisonLoading = false;
    this.terminaisonError = '';
    this.terminaisonCoverError = '';
    this.terminaisonCoverPreview = null;
    this.terminaisonCoverBase64 = null;
    this.terminaisonCoverContentType = null;
  }

  onTerminaisonCoverSelected(event: Event): void {
    this.terminaisonCoverError = '';
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) {
      return;
    }

    const normalizedType = (file.type || '').toLowerCase();
    const extensionOk = /\.(png|jpe?g|webp)$/i.test(file.name);
    const typeOk =
      !normalizedType ||
      SujetDetail.COVER_ALLOWED_TYPES.includes(normalizedType) ||
      normalizedType.startsWith('image/');

    if (!typeOk && !extensionOk) {
      this.terminaisonCoverError = 'Format non autorisé. Choisissez une image (PNG, JPG, WEBP).';
      input.value = '';
      return;
    }
    if (file.size > SujetDetail.COVER_INPUT_MAX_BYTES) {
      this.terminaisonCoverError = "L'image est trop volumineuse (max 20 Mo).";
      input.value = '';
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      const dataUri = reader.result as string;
      void this.prepareTerminaisonCover(dataUri, file).catch(() => {
        this.terminaisonCoverError = "Impossible de préparer l'image sélectionnée.";
      });
    };
    reader.onerror = () => {
      this.terminaisonCoverError = "Impossible de lire l'image sélectionnée.";
    };
    reader.readAsDataURL(file);
  }

  private async prepareTerminaisonCover(dataUri: string, file: File): Promise<void> {
    // Toujours recompresser en JPEG pour accepter les grandes images.
    const compressed = await this.compressImageDataUri(dataUri, SujetDetail.COVER_TARGET_MAX_BYTES);
    this.terminaisonCoverPreview = compressed;
    this.terminaisonCoverContentType = 'image/jpeg';
    const commaIndex = compressed.indexOf(',');
    this.terminaisonCoverBase64 = commaIndex >= 0 ? compressed.substring(commaIndex + 1) : compressed;
    this.terminaisonCoverError = '';
  }

  private compressImageDataUri(dataUri: string, maxBytes: number): Promise<string> {
    return new Promise((resolve, reject) => {
      const image = new Image();
      image.onload = () => {
        const maxSide = 1600;
        const scale = Math.min(1, maxSide / Math.max(image.width, image.height));
        const width = Math.max(1, Math.round(image.width * scale));
        const height = Math.max(1, Math.round(image.height * scale));
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          reject(new Error('Canvas unavailable'));
          return;
        }
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, width, height);
        ctx.drawImage(image, 0, 0, width, height);

        let quality = 0.85;
        let result = canvas.toDataURL('image/jpeg', quality);
        while (this.estimateDataUriBytes(result) > maxBytes && quality > 0.35) {
          quality -= 0.1;
          result = canvas.toDataURL('image/jpeg', quality);
        }
        resolve(result);
      };
      image.onerror = () => reject(new Error('Image load failed'));
      image.src = dataUri;
    });
  }

  private estimateDataUriBytes(dataUri: string): number {
    const commaIndex = dataUri.indexOf(',');
    const base64 = commaIndex >= 0 ? dataUri.substring(commaIndex + 1) : dataUri;
    return Math.floor((base64.length * 3) / 4);
  }

  removeTerminaisonCover(): void {
    this.terminaisonCoverPreview = null;
    this.terminaisonCoverBase64 = null;
    this.terminaisonCoverContentType = null;
    this.terminaisonCoverError = '';
  }

  confirmerTerminaison(): void {
    if (!this.sujet) return;
    this.terminaisonLoading = true;
    this.terminaisonError = '';
    this.sujetProjetService
      .declarerTerminaison(
        this.sujet.id,
        this.terminaisonCoverBase64
          ? {
              coverImageBase64: this.terminaisonCoverBase64,
              coverImageContentType: this.terminaisonCoverContentType,
            }
          : {},
      )
      .subscribe({
        next: (updated) => {
          this.terminaisonLoading = false;
          this.annulerTerminaison();
          this.sujet = updated;
          // Même API / logique que le bouton « Recalculer score »
          // (POST /api/projets/{id}/calculer-score) pour enregistrer le score
          // et le synchroniser sur le catalogue.
          this.recalculateScore();
        },
        error: (err) => {
          this.terminaisonLoading = false;
          this.terminaisonError =
            err?.error?.detail ?? err?.error?.message ?? 'Impossible de déclarer la terminaison.';
        },
      });
  }

  get terminaisonConfirmMessage(): string {
    return this.sujet
      ? `Votre sujet « ${this.sujet.titre} » sera publié dans le catalogue. Vous pouvez insérer une image comme cover.`
      : '';
  }

  selectTab(label: string): void {
    this.activeTab = label;
    if (label === 'Candidatures') {
      this.loadCandidatures();
    }
    if (label === 'Historique') {
      this.loadHistorique();
    }
  }

  loadCandidatures(): void {
    if (!this.sujet || !this.canManageCandidatures) return;
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

  loadHistorique(): void {
    if (!this.sujet || !this.canViewHistorique) return;
    this.historiqueLoading = true;
    this.historiqueError = '';
    this.historiqueService.getBySujet(this.sujet.id, this.historiqueFilter).subscribe({
      next: (entries) => {
        this.historiqueEntries = entries ?? [];
        this.historiqueLoading = false;
      },
      error: () => {
        this.historiqueEntries = [];
        this.historiqueError = "Impossible de charger l'historique.";
        this.historiqueLoading = false;
      },
    });
  }

  setHistoriqueFilter(filter: HistoriqueFilter): void {
    if (this.historiqueFilter === filter) return;
    this.historiqueFilter = filter;
    this.loadHistorique();
  }

  historiqueActorName(entry: HistoriqueEntry): string {
    return `${entry.actorPrenom ?? ''} ${entry.actorNom ?? ''}`.trim() || 'Utilisateur';
  }

  historiqueRoleLabel(role: string | null | undefined): string {
    const labels: Record<string, string> = {
      ROLE_ADMIN: 'Administrateur',
      ROLE_CI: 'CI',
      ROLE_CHEF_EQUIPE: "Chef d'équipe",
      ROLE_ENSEIGNANT: 'Encadrant',
      ROLE_ETUDIANT: 'Étudiant',
    };
    return labels[role ?? ''] ?? role ?? '';
  }

  historiqueModule(entry: HistoriqueEntry): 'sujet' | 'candidature' {
    return entry.action === 'ACCEPT' || entry.action === 'REFUSE' ? 'candidature' : 'sujet';
  }

  historiqueModuleLabel(entry: HistoriqueEntry): string {
    return this.historiqueModule(entry) === 'candidature' ? 'CANDIDATURES' : 'SUJETS';
  }

  historiqueActionTitle(entry: HistoriqueEntry): string {
    const titles: Record<string, string> = {
      CREATE: entry.entityType === 'CANDIDATURE' ? 'Dépôt candidature' : 'Création sujet',
      UPDATE: 'Modification sujet',
      DELETE: 'Suppression sujet',
      VALIDATE: 'Validation sujet',
      INVALIDATE: 'Invalidation sujet',
      ACCEPT: 'Acceptation candidature',
      REFUSE: 'Refus candidature',
      RETRAIT: 'Retrait étudiant',
      RETRAIT_ETUDIANT: 'Retrait candidature',
      DECLARER_TERMINAISON: 'Terminaison sujet',
      OUVRIR_CANDIDATURES: 'Ouverture candidatures',
      FERMER_CANDIDATURES: 'Fermeture candidatures',
      SUBMIT: 'Soumission',
    };
    return titles[entry.action] ?? entry.summary ?? entry.action;
  }

  historiqueTransition(entry: HistoriqueEntry): { from: string; to: string } | null {
    const oldValues = this.parseHistoriqueJson(entry.oldValues);
    const newValues = this.parseHistoriqueJson(entry.newValues);
    let fromStatut = this.readStatut(oldValues);
    let toStatut = this.readStatut(newValues);

    if (!fromStatut) {
      fromStatut = this.inferredPreviousStatut(entry);
    }
    if (!toStatut) {
      toStatut = this.inferredNextStatut(entry);
    }

    if (!fromStatut || !toStatut) {
      return null;
    }

    return {
      from: this.displayStatut(fromStatut, entry),
      to: this.displayStatut(toStatut, entry),
    };
  }

  private inferredPreviousStatut(entry: HistoriqueEntry): string | null {
    const byAction: Record<string, string> = {
      CREATE: 'NOUVEAU',
      VALIDATE: 'EN_ATTENTE',
      INVALIDATE: 'EN_ATTENTE',
      OUVRIR_CANDIDATURES: 'VALIDE',
      FERMER_CANDIDATURES: 'CANDIDATURE_OUVERTE',
      DECLARER_TERMINAISON: 'REALISATION_EN_COURS',
      ACCEPT: 'DEPOSEE',
      REFUSE: 'DEPOSEE',
      RETRAIT: 'ACTIVE',
      RETRAIT_ETUDIANT: 'DEPOSEE',
    };
    return byAction[entry.action] ?? null;
  }

  private inferredNextStatut(entry: HistoriqueEntry): string | null {
    const byAction: Record<string, string> = {
      CREATE: entry.entityType === 'CANDIDATURE' ? 'DEPOSEE' : 'SOUMIS_EN_VALIDATION',
      VALIDATE: 'VALIDE',
      INVALIDATE: 'INVALIDE',
      OUVRIR_CANDIDATURES: 'CANDIDATURE_OUVERTE',
      FERMER_CANDIDATURES: 'REALISATION_EN_COURS',
      DECLARER_TERMINAISON: 'REALISATION_TERMINEE',
      ACCEPT: 'ACCEPTEE',
      REFUSE: 'REFUSEE',
      RETRAIT: 'RETIREE_ARCHIVEE',
      RETRAIT_ETUDIANT: 'ARCHIVEE',
    };
    return byAction[entry.action] ?? null;
  }

  historiqueMotif(entry: HistoriqueEntry): string | null {
    const metadata = this.parseHistoriqueJson(entry.metadata);
    if (!metadata) return null;
    const motif =
      (metadata['motif'] as string | undefined) ??
      (metadata['motifRefus'] as string | undefined) ??
      (metadata['motifRetrait'] as string | undefined) ??
      (metadata['commentaire'] as string | undefined);
    return motif?.trim() || null;
  }

  historiqueTime(entry: HistoriqueEntry): string {
    const date = new Date(entry.createdAt);
    if (Number.isNaN(date.getTime())) return '';
    return date.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
  }

  private historiqueDateKey(iso: string): string {
    const date = new Date(iso);
    if (Number.isNaN(date.getTime())) return iso.slice(0, 10);
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }

  private formatHistoriqueDateLabel(dateKey: string): string {
    const date = new Date(`${dateKey}T12:00:00`);
    if (Number.isNaN(date.getTime())) return dateKey;
    return date.toLocaleDateString('fr-FR', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });
  }

  private parseHistoriqueJson(raw: string | null): Record<string, unknown> | null {
    if (!raw) return null;
    try {
      return JSON.parse(raw) as Record<string, unknown>;
    } catch {
      return null;
    }
  }

  private readStatut(values: Record<string, unknown> | null): string | null {
    if (!values) return null;
    const statut = values['statut'];
    if (typeof statut === 'string' && statut.trim()) return statut.trim();
    if (statut != null && typeof statut !== 'object') return String(statut);
    return null;
  }

  private displayStatut(statut: string, entry: HistoriqueEntry): string {
    if (statut === 'NOUVEAU') return 'Nouveau';
    if (entry.entityType === 'CANDIDATURE' || this.historiqueModule(entry) === 'candidature') {
      const candidatureLabel = STATUT_CANDIDATURE_LABELS[statut as keyof typeof STATUT_CANDIDATURE_LABELS];
      if (candidatureLabel) return candidatureLabel.label;
      if (statut === 'ARCHIVEE') return 'Archivée';
    }
    const sujetLabel = STATUT_LABELS[statut as keyof typeof STATUT_LABELS];
    if (sujetLabel) return sujetLabel.label;
    const fallback: Record<string, string> = {
      ACTIVE: 'Active',
      RETIREE: 'Retiré',
      RETIREE_ARCHIVEE: 'Retiré',
      CREATED: 'Créé',
      ARCHIVEE: 'Archivée',
    };
    return fallback[statut] ?? statut;
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
    const labels: Partial<Record<StatutCandidature, string>> = {
      DEPOSEE: 'En attente',
      ACCEPTEE: 'Acceptée',
      REFUSEE: 'Refusée',
    };
    return labels[statut] ?? statut;
  }

  candidatureStatutClass(statut: StatutCandidature): string {
    const classes: Partial<Record<StatutCandidature, string>> = {
      DEPOSEE: 'candidature-card__status--pending',
      ACCEPTEE: 'candidature-card__status--accepted',
      REFUSEE: 'candidature-card__status--refused',
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

ngOnDestroy(): void {
  this.clearScoreCooldown();
}

  recalculateScore(): void {
  if (!this.sujet || !this.canRecalculateScore) {
    return;
  }

  if (this.scoreCooldownActive) {
    this.evaluationMessage = '';
    this.evaluationError = `Le score vient d’être recalculé. Veuillez patienter ${this.scoreCooldownLabel} avant un nouveau recalcul.`;
    return;
  }

  this.recalculatingScore = true;
  this.evaluationError = '';
  this.evaluationMessage = '';

  this.evaluationService.calculateScore(this.sujet.id).subscribe({
    next: (evaluation) => {
      this.evaluation = evaluation;
      this.recalculatingScore = false;

      const isSuccessfulEvaluation = evaluation?.processingStatus !== 'FAILED_PERMANENT'
        && evaluation?.processingStatus !== 'NOT_EVALUABLE'
        && evaluation?.eligibilityStatus !== 'NOT_EVALUABLE';

      if (isSuccessfulEvaluation) {
        this.evaluationMessage = 'Score recalculé avec succès.';
        this.startScoreCooldown();
        this.sujet = {
          ...this.sujet!,
          scoreFinal: evaluation.scoreFinal,
          eligibleIndustrialisation: evaluation.eligibleIndustrialisation,
          hasEliminatoryWarnings: evaluation.hasEliminatoryWarnings,
        };
        this.loadEvaluation();
      } else {
        this.evaluationError = evaluation?.commentaire
          ?? 'Le recalcul n’a pas produit une évaluation exploitable.';
        this.evaluationMessage = '';
      }
    },
    error: (err) => {
      const retryAfterSeconds =
        Number(err?.error?.retryAfterSeconds ?? err?.headers?.get?.('Retry-After') ?? this.SCORE_COOLDOWN_SECONDS);

      if (err?.status === 409 || err?.status === 429) {
        this.startScoreCooldown(Number.isNaN(retryAfterSeconds) ? this.SCORE_COOLDOWN_SECONDS : retryAfterSeconds);
        this.evaluationError = `Le score vient d’être recalculé. Veuillez patienter ${this.scoreCooldownLabel} avant un nouveau recalcul.`;
      } else {
        this.evaluationError = err?.error?.detail ?? err?.error?.message ?? 'Recalcul impossible.';
      }

      this.evaluationMessage = '';
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

  livrableDisplayName(livrable: Livrable): string {
    return livrable.originalFileName?.trim() || livrable.nom;
  }

  livrableDateLabel(livrable: Livrable): string {
    if (!livrable.dateDepot) return '—';
    return new Date(livrable.dateDepot).toLocaleDateString('fr-FR', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    });
  }

  livrableSizeLabel(livrable: Livrable): string | null {
    if (livrable.size == null || livrable.size <= 0) return null;
    const bytes = livrable.size;
    if (bytes < 1024) return `${bytes} o`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} Ko`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  }

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
    if (!this.sujet) return;
    this.industrialisationSaving = true;
    this.industrialisationService.create(this.sujet.id, {
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
            this.activeTab = 'Industrialisation';
            this.loadSujet();
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

  get submissionWarnings(): string[] {
    const warnings = [...(this.industrialisationForm?.candidature.warnings ?? [])];
    if (this.currentIndustrialisationLivrables().length === 0 && !warnings.includes(this.missingLivrablesWarning)) {
      warnings.push(this.missingLivrablesWarning);
    }
    return warnings;
  }

  canSubmitIndustrialisation(): boolean {
    return !!this.industrialisationForm
      && !this.isIndustrialisationBusy()
      && this.missingRequiredQuestions().length === 0;
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

  private currentIndustrialisationLivrables(): Livrable[] {
    return this.industrialisationForm?.candidature.livrables ?? this.livrables;
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
