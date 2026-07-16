import { CommonModule } from '@angular/common';
import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import {
  CandidatureIndustrialisation,
  ORIENTATION_OPTIONS,
  STATUT_INDUSTRIALISATION_LABELS,
  StatutIndustrialisation,
  TYPE_INDUSTRIALISATION_LABELS,
  TypeIndustrialisation,
} from '../../../core/models/industrialisation.model';
import { AuthService } from '../../../core/services/auth.service';
import { IndustrialisationService } from '../../../core/services/industrialisation.service';
import {
  FilterDropdown,
  FilterOption,
} from '../../components/sujets/filter-dropdown/filter-dropdown';

type StatutFilterValue = StatutIndustrialisation | '';
type TypeFilterValue = TypeIndustrialisation | '';
interface StatusPresentation {
  label: string;
  shortLabel: string;
  cssClass: string;
  icon: string;
  ariaLabel: string;
}

interface SummaryIndicator {
  label: string;
  value: number;
  cssClass: string;
  icon: 'total' | 'go' | 'pending' | 'nogo';
}

@Component({
  selector: 'app-demandes-industrialisation',
  imports: [CommonModule, FormsModule, RouterLink, FilterDropdown],
  templateUrl: './demandes-industrialisation.html',
  styleUrl: './demandes-industrialisation.css',
})
export class DemandesIndustrialisation implements OnInit {
  private readonly service = inject(IndustrialisationService);
  private readonly authService = inject(AuthService);

  demandes = signal<CandidatureIndustrialisation[]>([]);
  loading = signal(false);
  error = signal('');
  private readonly searchTermSignal = signal('');
  private readonly statusFilterSignal = signal<StatutFilterValue>('');
  private readonly typeFilterSignal = signal<TypeFilterValue>('');

  readonly statutLabels = STATUT_INDUSTRIALISATION_LABELS;
  readonly typeLabels = TYPE_INDUSTRIALISATION_LABELS;
  readonly statuts: StatutIndustrialisation[] = [
    'BROUILLON',
    'SOUMISE',
    'RECUE_PAR_CI',
    'A_COMPLETER',
    'RECEVABLE',
    'GO',
    'NO_GO',
    'REFUSEE',
  ];
  readonly types: TypeIndustrialisation[] = ['INTERNE', 'EXTERNE'];
  readonly loadingSkeletons = [1, 2, 3];

  readonly statutOptions: FilterOption[] = [
    { value: '', label: 'Tous les statuts' },
    ...this.statuts.map((statut) => ({ value: statut, label: statut })),
  ];

  readonly typeOptions: FilterOption[] = [
    { value: '', label: 'Interne et externe' },
    ...this.types.map((type) => ({ value: type, label: this.typeLabels[type] })),
  ];

  private readonly statusPresentations: Record<StatutIndustrialisation, StatusPresentation> = {
    BROUILLON: {
      label: 'Brouillon',
      shortLabel: 'BR',
      cssClass: 'status-pill--draft',
      icon: 'BR',
      ariaLabel: 'Statut BROUILLON',
    },
    SOUMISE: {
      label: 'Soumise',
      shortLabel: 'SO',
      cssClass: 'status-pill--pending',
      icon: 'SO',
      ariaLabel: 'Statut SOUMISE',
    },
    RECUE_PAR_CI: {
      label: 'Recue par CI',
      shortLabel: 'CI',
      cssClass: 'status-pill--pending',
      icon: 'CI',
      ariaLabel: 'Statut RECUE_PAR_CI',
    },
    A_COMPLETER: {
      label: 'A completer',
      shortLabel: 'AC',
      cssClass: 'status-pill--pending',
      icon: 'AC',
      ariaLabel: 'Statut A_COMPLETER',
    },
    RECEVABLE: {
      label: 'Recevable',
      shortLabel: 'EC',
      cssClass: 'status-pill--info',
      icon: 'EC',
      ariaLabel: 'Statut RECEVABLE',
    },
    GO: {
      label: 'Go',
      shortLabel: 'GO',
      cssClass: 'status-pill--go',
      icon: 'GO',
      ariaLabel: 'Statut GO',
    },
    NO_GO: {
      label: 'No Go',
      shortLabel: 'NO',
      cssClass: 'status-pill--nogo',
      icon: 'NO',
      ariaLabel: 'Statut NO_GO',
    },
    REFUSEE: {
      label: 'Refusee',
      shortLabel: 'RF',
      cssClass: 'status-pill--nogo',
      icon: 'RF',
      ariaLabel: 'Statut REFUSEE',
    },
  };

  readonly filteredDemandes = computed(() => {
    const search = this.normalize(this.searchTermSignal());
    const statut = this.statusFilterSignal();
    const type = this.typeFilterSignal();

    return this.demandes().filter((demande) => {
      const reference = this.normalize(this.requestReference(demande));
      const matchesSearch =
        !search
        || this.normalize(demande.projetTitre).includes(search)
        || reference.includes(search);
      const matchesStatus = !statut || demande.statut === statut;
      const matchesType = !type || demande.typeIndustrialisation === type;
      return matchesSearch && matchesStatus && matchesType;
    });
  });

  readonly hasActiveFilters = computed(() =>
    !!this.searchTermSignal().trim() || !!this.statusFilterSignal() || !!this.typeFilterSignal()
  );

  readonly summaryIndicators = computed<SummaryIndicator[]>(() => {
    const demandes = this.demandes();
    const counts = this.countByStatus(demandes);
    const go = counts['GO'] ?? 0;
    const nogo = (counts['NO_GO'] ?? 0) + (counts['REFUSEE'] ?? 0);
    const enCours = Math.max(0, demandes.length - go - nogo);

    return [
      { label: 'Total', value: demandes.length, cssClass: 'summary-card--total', icon: 'total' },
      { label: 'Go', value: go, cssClass: 'summary-card--go', icon: 'go' },
      { label: 'En cours', value: enCours, cssClass: 'summary-card--pending', icon: 'pending' },
      { label: 'No Go', value: nogo, cssClass: 'summary-card--nogo', icon: 'nogo' },
    ];
  });

  ngOnInit(): void {
    if (this.isCi) {
      return;
    }
    this.loadDemandes();
  }

  loadDemandes(): void {
    this.loading.set(true);
    this.error.set('');
    this.service.mesDemandes().subscribe({
      next: (demandes) => {
        this.demandes.set(demandes);
        this.loading.set(false);
      },
      error: () => {
        this.error.set('Impossible de charger vos demandes.');
        this.loading.set(false);
      },
    });
  }

  get searchTerm(): string {
    return this.searchTermSignal();
  }

  set searchTerm(value: string) {
    this.searchTermSignal.set(value ?? '');
  }

  get statusFilter(): StatutFilterValue {
    return this.statusFilterSignal();
  }

  set statusFilter(value: StatutFilterValue) {
    this.statusFilterSignal.set(value || '');
  }

  get typeFilter(): TypeFilterValue {
    return this.typeFilterSignal();
  }

  set typeFilter(value: TypeFilterValue) {
    this.typeFilterSignal.set(value || '');
  }

  get isCi(): boolean {
    return this.authService.getRole() === 'ROLE_CI';
  }

  resetFilters(): void {
    this.searchTerm = '';
    this.statusFilter = '';
    this.typeFilter = '';
  }

  onStatusFilterChange(value: string): void {
    this.statusFilter = (value || '') as StatutFilterValue;
  }

  onTypeFilterChange(value: string): void {
    this.typeFilter = (value || '') as TypeFilterValue;
  }

  statusPresentation(statut: StatutIndustrialisation): StatusPresentation {
    return this.statusPresentations[statut] ?? {
      label: this.statutLabels[statut] ?? statut,
      shortLabel: statut.slice(0, 2),
      cssClass: 'status-pill--info',
      icon: 'i',
      ariaLabel: `Statut ${statut}`,
    };
  }

  statusLabel(statut: StatutIndustrialisation): string {
    return this.statusPresentation(statut).label;
  }

  statusClass(statut: StatutIndustrialisation): string {
    return this.statusPresentation(statut).cssClass;
  }

  requestReference(demande: CandidatureIndustrialisation): string {
    return `CI-${String(demande.id).padStart(4, '0')}`;
  }

  descriptionText(demande: CandidatureIndustrialisation): string {
    return demande.projetDescription?.trim()
      || demande.commentaire?.trim()
      || 'Aucun descriptif disponible pour cette demande.';
  }

  showSeparateComment(demande: CandidatureIndustrialisation): boolean {
    return !!demande.projetDescription?.trim() && !!demande.commentaire?.trim();
  }

  orientationDisplay(demande: CandidatureIndustrialisation): string {
    if (!demande.orientation) {
      return 'A definir';
    }
    return ORIENTATION_OPTIONS.find((item) => item.value === demande.orientation)?.label
      ?? demande.orientation;
  }

  scoreValue(demande: CandidatureIndustrialisation): number | null {
    const score = demande.latestEvaluation?.finalValidatedScore
      ?? demande.latestEvaluation?.scoreFinal
      ?? demande.scoreEvaluationProjet;
    return score == null ? null : Number(score);
  }

  scoreDisplay(demande: CandidatureIndustrialisation): string {
    const score = this.scoreValue(demande);
    return score == null ? 'Non calcule' : `${score} / 100`;
  }

  scorePercent(demande: CandidatureIndustrialisation): number {
    const score = this.scoreValue(demande);
    if (score == null) {
      return 0;
    }
    return Math.max(0, Math.min(100, score));
  }

  eligibilityTone(demande: CandidatureIndustrialisation): 'ok' | 'warn' | 'ko' | 'neutral' {
    const status = demande.latestEvaluation?.eligibilityStatus;
    if (status === 'ELIGIBLE' || demande.eligibleIndustrialisation === true) return 'ok';
    if (status === 'REVIEW_REQUIRED') return 'warn';
    if (status === 'NON_ELIGIBLE_EN_L_ETAT' || demande.eligibleIndustrialisation === false) return 'ko';
    return 'neutral';
  }

  decisionTone(demande: CandidatureIndustrialisation): 'go' | 'nogo' | 'neutral' {
    if (demande.statut === 'GO' || demande.decisionGoNoGo === true) return 'go';
    if (
      demande.statut === 'NO_GO'
      || demande.statut === 'REFUSEE'
      || demande.decisionGoNoGo === false
    ) {
      return 'nogo';
    }
    return 'neutral';
  }

  eligibilityDisplay(demande: CandidatureIndustrialisation): string {
    switch (demande.latestEvaluation?.eligibilityStatus) {
      case 'ELIGIBLE':
        return 'Eligible industrialisation';
      case 'REVIEW_REQUIRED':
        return 'Revue requise';
      case 'NON_ELIGIBLE_EN_L_ETAT':
        return 'Non eligible en l etat';
      case 'NOT_EVALUABLE':
        return 'Non evaluable';
      default:
        if (demande.eligibleIndustrialisation === true) return 'Eligible industrialisation';
        if (demande.eligibleIndustrialisation === false) return 'Non eligible';
        return 'Non renseignee';
    }
  }

  hasDecision(demande: CandidatureIndustrialisation): boolean {
    return demande.statut === 'GO'
      || demande.statut === 'NO_GO'
      || demande.statut === 'REFUSEE'
      || demande.decisionGoNoGo != null
      || !!demande.dateDecisionCI
      || !!demande.motifDecision?.trim();
  }

  decisionReason(demande: CandidatureIndustrialisation): string {
    return demande.motifDecision?.trim() || 'Decision enregistree sans motif renseigne.';
  }

  trackByDemande(_index: number, demande: CandidatureIndustrialisation): number {
    return demande.id;
  }

  private countByStatus(demandes: CandidatureIndustrialisation[]): Partial<Record<StatutIndustrialisation, number>> {
    return demandes.reduce<Partial<Record<StatutIndustrialisation, number>>>((acc, demande) => {
      acc[demande.statut] = (acc[demande.statut] ?? 0) + 1;
      return acc;
    }, {});
  }

  private normalize(value: string | null | undefined): string {
    return (value ?? '')
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .trim();
  }
}
