import { CommonModule } from '@angular/common';
import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { forkJoin } from 'rxjs';
import {
  CandidatureIndustrialisation,
  DecisionRecommandeeIndustrialisation,
  IndustrialisationScore,
  ORIENTATION_OPTIONS,
  OrientationIndustrialisation,
  STATUT_INDUSTRIALISATION_LABELS,
  StatutIndustrialisation,
  TYPE_INDUSTRIALISATION_LABELS,
  TypeIndustrialisation,
} from '../../core/models/industrialisation.model';
import { TYPE_LIVRABLE_LABELS } from '../../core/models/livrable.model';
import { IndustrialisationService } from '../../core/services/industrialisation.service';
import { LivrableService } from '../../core/services/livrable.service';
import { EvaluationChecklistComponent } from '../../shared/components/evaluation-checklist/evaluation-checklist.component';
import { Livrable } from '../../core/models/livrable.model';

@Component({
  selector: 'app-ci-industrialisation',
  standalone: true,
  imports: [CommonModule, FormsModule, EvaluationChecklistComponent],
  templateUrl: './ci-industrialisation.component.html',
  styleUrl: './ci-industrialisation.component.css',
})
export class CiIndustrialisationComponent implements OnInit {
  private readonly service = inject(IndustrialisationService);
  private readonly livrableService = inject(LivrableService);

  demandes = signal<CandidatureIndustrialisation[]>([]);
  selected = signal<CandidatureIndustrialisation | null>(null);
  score = signal<IndustrialisationScore | null>(null);
  loading = signal(false);
  detailLoading = signal(false);
  error = signal<string | null>(null);
  message = signal<string | null>(null);
  private readonly searchTermSignal = signal('');
  private readonly domaineFilterSignal = signal('');
  private readonly sortBySignal = signal<'date-desc' | 'score-desc' | 'score-asc' | 'title-asc'>('date-desc');

  statutFilter = '';
  typeFilter = '';
  decisionMode: 'GO' | 'NO_GO' | null = null;
  livrablesModalOpen = false;
  orientation: OrientationIndustrialisation | '' = '';
  commentaire = '';
  motif = '';

  readonly statutLabels = STATUT_INDUSTRIALISATION_LABELS;
  readonly typeLabels = TYPE_INDUSTRIALISATION_LABELS;
  readonly livrableLabels = TYPE_LIVRABLE_LABELS;
  readonly orientations = ORIENTATION_OPTIONS;
  readonly statuts: StatutIndustrialisation[] = ['SOUMISE', 'RECUE_PAR_CI', 'A_COMPLETER', 'RECEVABLE', 'GO', 'NO_GO', 'REFUSEE'];
  readonly types: TypeIndustrialisation[] = ['INTERNE', 'EXTERNE'];
  readonly missingLivrablesWarning = 'Aucun livrable nest déposé pour ce projet. La CI verra cette alerte.';

  readonly domaines = computed(() => {
    const domaines = this.demandes()
      .map((demande) => demande.projetDomaine?.trim())
      .filter((domaine): domaine is string => !!domaine);
    return Array.from(new Set(domaines)).sort((a, b) => a.localeCompare(b));
  });

  readonly demandesEnInstruction = computed(() =>
    this.demandes().filter((demande) => !['GO', 'NO_GO', 'REFUSEE'].includes(demande.statut)).length
  );

  readonly displayedDemandes = computed(() => {
    const search = this.normalize(this.searchTermSignal());
    const domaine = this.domaineFilterSignal();
    const demandes = this.demandes().filter((demande) => {
      const matchesSearch = !search || this.normalize([
        demande.projetTitre,
        demande.demandeurNom,
        demande.projetDomaine,
        demande.projetCategorie,
        demande.projetTechnologies,
      ].filter(Boolean).join(' ')).includes(search);
      const matchesDomaine = !domaine || demande.projetDomaine === domaine;
      return matchesSearch && matchesDomaine;
    });
    return [...demandes].sort((a, b) => this.compareDemandes(a, b));
  });

  get searchTerm(): string {
    return this.searchTermSignal();
  }

  set searchTerm(value: string) {
    this.searchTermSignal.set(value);
  }

  get domaineFilter(): string {
    return this.domaineFilterSignal();
  }

  set domaineFilter(value: string) {
    this.domaineFilterSignal.set(value);
  }

  get sortBy(): 'date-desc' | 'score-desc' | 'score-asc' | 'title-asc' {
    return this.sortBySignal();
  }

  set sortBy(value: 'date-desc' | 'score-desc' | 'score-asc' | 'title-asc') {
    this.sortBySignal.set(value);
  }

  ngOnInit(): void {
    this.load();
  }

  load(): void {
    this.loading.set(true);
    this.service.findCiRequests({
      statut: this.statutFilter as StatutIndustrialisation || undefined,
      type: this.typeFilter as TypeIndustrialisation || undefined,
    }).subscribe({
      next: (demandes) => {
        this.demandes.set(demandes);
        this.loading.set(false);
        const visible = this.displayedDemandes();
        const selectedStillVisible = visible.some((demande) => demande.id === this.selected()?.id);
        if ((!this.selected() || !selectedStillVisible) && visible.length) {
          this.openDetail(visible[0].id);
        }
      },
      error: () => {
        this.error.set('Impossible de charger les demandes.');
        this.loading.set(false);
      },
    });
  }

  openDetail(id: number): void {
    this.detailLoading.set(true);
    this.score.set(null);
    forkJoin({
      detail: this.service.getCiDetail(id),
      score: this.service.getCiScore(id),
    }).subscribe({
      next: ({ detail, score }) => {
        this.selected.set(detail);
        this.score.set(score);
        this.detailLoading.set(false);
        this.closeDecision();
      },
      error: () => {
        this.error.set('Impossible de charger le detail.');
        this.detailLoading.set(false);
      },
    });
  }

  openDecision(mode: 'GO' | 'NO_GO'): void {
    this.decisionMode = mode;
    this.orientation = '';
    this.commentaire = '';
    this.motif = '';
  }

  closeDecision(): void {
    this.decisionMode = null;
  }

  openLivrablesModal(): void {
    this.livrablesModalOpen = true;
  }

  closeLivrablesModal(): void {
    this.livrablesModalOpen = false;
  }

  decideGo(): void {
    const candidature = this.selected();
    if (!candidature || !this.orientation) {
      this.error.set('Orientation obligatoire.');
      return;
    }
    this.service.decideGo(candidature.id, {
      orientation: this.orientation,
      commentaire: this.commentaire || undefined,
    }).subscribe({
      next: (updated) => this.afterDecision(updated, 'Decision Go enregistree.'),
      error: (err) => this.error.set(err?.error?.detail ?? 'Decision Go impossible.'),
    });
  }

  decideNoGo(): void {
    const candidature = this.selected();
    if (!candidature || !this.motif.trim()) {
      this.error.set('Motif obligatoire.');
      return;
    }
    this.service.decideNoGo(candidature.id, { motif: this.motif.trim() }).subscribe({
      next: (updated) => this.afterDecision(updated, 'Decision No Go enregistree.'),
      error: (err) => this.error.set(err?.error?.detail ?? 'Decision No Go impossible.'),
    });
  }

  afterDecision(updated: CandidatureIndustrialisation, message: string): void {
    this.selected.set(updated);
    this.message.set(message);
    this.closeDecision();
    this.load();
    setTimeout(() => this.message.set(null), 2500);
  }

  canDecide(candidature: CandidatureIndustrialisation | null): boolean {
    return !!candidature && ['SOUMISE', 'RECUE_PAR_CI', 'RECEVABLE'].includes(candidature.statut);
  }

  downloadLivrable(id: number): string {
    return this.livrableService.downloadUrl(id);
  }

  statusLabel(statut: StatutIndustrialisation): string {
    if (statut === 'GO') return 'GO confirme';
    if (statut === 'NO_GO' || statut === 'REFUSEE') return 'NO GO';
    if (['SOUMISE', 'RECUE_PAR_CI', 'A_COMPLETER', 'RECEVABLE'].includes(statut)) return 'En instruction';
    return this.statutLabels[statut] ?? statut;
  }

  statusClass(statut: StatutIndustrialisation): string {
    if (statut === 'GO') return 'status-pill--go';
    if (statut === 'NO_GO' || statut === 'REFUSEE') return 'status-pill--nogo';
    return 'status-pill--instruction';
  }

  scoreValue(candidature: CandidatureIndustrialisation): number | null {
    const score = this.scoreFor(candidature);
    if (score) {
      return score.scoreFinal;
    }
    return candidature.latestEvaluation?.scoreFinal ?? candidature.scoreEvaluationProjet ?? null;
  }

  scoreClass(candidature: CandidatureIndustrialisation): string {
    const backendScore = this.scoreFor(candidature);
    if (backendScore?.decisionRecommandee === 'NO_GO') {
      return 'score-card--danger';
    }
    if (backendScore?.decisionRecommandee === 'GO' && this.eliminatoryWarningCount(candidature) === 0) {
      return 'score-card--success';
    }
    const numericScore = this.scoreValue(candidature) ?? 0;
    return numericScore >= 70 && this.eliminatoryWarningCount(candidature) === 0
      ? 'score-card--success'
      : 'score-card--warning';
  }

  requestReference(candidature: CandidatureIndustrialisation): string {
    return `CI-${String(candidature.id).padStart(4, '0')}`;
  }

  projectYear(candidature: CandidatureIndustrialisation): string {
    const source = candidature.projetDateCreation ?? candidature.dateDemande;
    return source ? String(new Date(source).getFullYear()) : '-';
  }

  technologyTags(candidature: CandidatureIndustrialisation): string[] {
    return (candidature.projetTechnologies ?? '')
      .split(/[,;\n]+/)
      .map((value) => value.trim())
      .filter(Boolean)
      .slice(0, 6);
  }

  initials(candidature: CandidatureIndustrialisation): string {
    return candidature.projetTitre
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part.charAt(0))
      .join('')
      .toUpperCase() || 'CI';
  }

  formatSize(size: number | null): string {
    if (!size) return '-';
    if (size < 1024 * 1024) return `${Math.max(1, Math.round(size / 1024))} Ko`;
    return `${(size / (1024 * 1024)).toFixed(1)} Mo`;
  }

  livrableActionLabel(livrable: Livrable): string {
    return livrable.objectName ? 'Telecharger' : 'Ouvrir';
  }

  answerValue(answer: CandidatureIndustrialisation['reponses'][number]): string {
    if (answer.valeurTexte) return answer.valeurTexte;
    if (answer.valeurUrl) return answer.valeurUrl;
    if (answer.valeurNumerique != null) return String(answer.valeurNumerique);
    if (answer.valeurBoolean != null) return answer.valeurBoolean ? 'Oui' : 'Non';
    if (answer.preuveOriginalFileName) return answer.preuveOriginalFileName;
    if (answer.reponseEliminatoire) return answer.reponseEliminatoire;
    return '-';
  }

  blockingCriteriaCount(candidature: CandidatureIndustrialisation): number {
    return this.eliminatoryWarningCount(candidature);
  }

  submissionWarnings(candidature: CandidatureIndustrialisation | null): string[] {
    if (!candidature) {
      return [];
    }
    const warnings = [...(candidature.warnings ?? [])];
    if (candidature.livrables.length === 0 && !warnings.includes(this.missingLivrablesWarning)) {
      warnings.push(this.missingLivrablesWarning);
    }
    return warnings;
  }

  eliminatoryWarningCount(candidature: CandidatureIndustrialisation): number {
    const score = this.scoreFor(candidature);
    if (score) {
      return score.eliminatoryWarningsCount ?? score.blocagesEliminatoires.length;
    }
    if (candidature.eliminatoryWarningsCount != null) {
      return candidature.eliminatoryWarningsCount;
    }
    return candidature.latestEvaluation?.resultats
      ?.filter((resultat) => resultat.typeCritere === 'ELIMINATOIRE' && resultat.reponseEliminatoire === 'NOT_OK')
      .length ?? (candidature.bloqueParEliminatoire ? 1 : 0);
  }

  recommendation(candidature: CandidatureIndustrialisation): string {
    const score = this.scoreFor(candidature);
    if (score) {
      return score.decisionRecommandee === 'A_INSTRUIRE'
        ? 'A instruire'
        : `${this.decisionLabel(score.decisionRecommandee)} recommande`;
    }
    if (candidature.latestEvaluation?.evaluationComplete === false) {
      return 'Analyse necessaire';
    }
    if (candidature.eligibleIndustrialisation && (candidature.scoreEvaluationProjet ?? 0) >= 70) {
      return 'GO recommande';
    }
    return 'Analyse necessaire';
  }

  recommendationExplanation(candidature: CandidatureIndustrialisation): string {
    const score = this.scoreFor(candidature);
    if (score) {
      return score.message;
    }
    if (this.eliminatoryWarningCount(candidature) > 0) {
      return 'Alerte eliminatoire non bloquante : la CI peut continuer vers GO ou NO GO apres analyse.';
    }
    if (candidature.latestEvaluation?.evaluationComplete === false) {
      return 'Analyse necessaire : certaines regles automatiques ne sont pas configurees.';
    }
    return 'La decision GO / NO GO reste manuelle pour la CI.';
  }

  nonConfiguredCount(candidature: CandidatureIndustrialisation): number {
    return candidature.latestEvaluation?.resultats?.filter((resultat) => resultat.ruleConfigured === false).length ?? 0;
  }

  decisionLabel(decision: DecisionRecommandeeIndustrialisation): string {
    if (decision === 'GO') return 'GO';
    if (decision === 'NO_GO') return 'NO GO';
    return 'A instruire';
  }

  decisionClass(decision: DecisionRecommandeeIndustrialisation): string {
    if (decision === 'GO') return 'status-pill--go';
    if (decision === 'NO_GO') return 'status-pill--nogo';
    return 'status-pill--instruction';
  }

  manualReviewCount(score: IndustrialisationScore | null): number {
    return score?.detailsCalcul.filter((detail) => detail.revueManuelleRequise).length ?? 0;
  }

  componentLabel(component: string): string {
    if (component.startsWith('QUESTIONNAIRE')) return 'Questionnaire';
    if (component === 'LIVRABLES') return 'Livrables';
    if (component === 'CRITERES_NOTES') return 'Criteres notes';
    return component;
  }

  private scoreFor(candidature: CandidatureIndustrialisation): IndustrialisationScore | null {
    const score = this.score();
    return score?.candidatureId === candidature.id ? score : null;
  }

  private compareDemandes(a: CandidatureIndustrialisation, b: CandidatureIndustrialisation): number {
    const sortBy = this.sortBySignal();
    if (sortBy === 'score-desc') {
      return (this.scoreValue(b) ?? -1) - (this.scoreValue(a) ?? -1);
    }
    if (sortBy === 'score-asc') {
      return (this.scoreValue(a) ?? 101) - (this.scoreValue(b) ?? 101);
    }
    if (sortBy === 'title-asc') {
      return a.projetTitre.localeCompare(b.projetTitre);
    }
    return new Date(b.dateSoumission ?? b.dateDemande).getTime() - new Date(a.dateSoumission ?? a.dateDemande).getTime();
  }

  private normalize(value: string | null | undefined): string {
    return (value ?? '')
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '');
  }
}
