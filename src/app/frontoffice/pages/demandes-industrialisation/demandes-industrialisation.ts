import { CommonModule } from '@angular/common';
import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import {
  CandidatureIndustrialisation,
  STATUT_INDUSTRIALISATION_LABELS,
  StatutIndustrialisation,
  TYPE_INDUSTRIALISATION_LABELS,
  TypeIndustrialisation,
} from '../../../core/models/industrialisation.model';
import { AuthService } from '../../../core/services/auth.service';
import { IndustrialisationService } from '../../../core/services/industrialisation.service';

type StatutFilterValue = StatutIndustrialisation | '';
type TypeFilterValue = TypeIndustrialisation | '';
type StatusTone = 'draft' | 'pending' | 'info' | 'go' | 'nogo';

interface StatusPresentation {
  label: string;
  cssClass: string;
  icon: string;
  ariaLabel: string;
}

interface SummaryIndicator {
  label: string;
  value: number;
  cssClass: string;
}

@Component({
  selector: 'app-demandes-industrialisation',
  imports: [CommonModule, FormsModule, RouterLink],
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

  private readonly statusPresentations: Record<StatutIndustrialisation, StatusPresentation> = {
    BROUILLON: {
      label: 'Brouillon',
      cssClass: 'status-pill--draft',
      icon: '...',
      ariaLabel: 'Statut brouillon',
    },
    SOUMISE: {
      label: 'Soumise',
      cssClass: 'status-pill--pending',
      icon: '...',
      ariaLabel: 'Demande soumise, en attente de decision CI',
    },
    RECUE_PAR_CI: {
      label: 'Recue par CI',
      cssClass: 'status-pill--pending',
      icon: '...',
      ariaLabel: 'Demande recue par la cellule industrialisation',
    },
    A_COMPLETER: {
      label: 'A completer',
      cssClass: 'status-pill--pending',
      icon: '!',
      ariaLabel: 'Demande a completer avant decision',
    },
    RECEVABLE: {
      label: 'Recevable',
      cssClass: 'status-pill--info',
      icon: 'i',
      ariaLabel: 'Demande recevable en instruction',
    },
    GO: {
      label: 'GO confirme',
      cssClass: 'status-pill--go',
      icon: 'OK',
      ariaLabel: 'Decision GO confirmee',
    },
    NO_GO: {
      label: 'No Go',
      cssClass: 'status-pill--nogo',
      icon: 'NO',
      ariaLabel: 'Decision No Go',
    },
    REFUSEE: {
      label: 'Refusee',
      cssClass: 'status-pill--nogo',
      icon: 'NO',
      ariaLabel: 'Demande refusee',
    },
  };

  readonly filteredDemandes = computed(() => {
    const search = this.normalize(this.searchTermSignal());
    const statut = this.statusFilterSignal();
    const type = this.typeFilterSignal();

    return this.demandes().filter((demande) => {
      const matchesSearch = !search || this.normalize(demande.projetTitre).includes(search);
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
    const indicators: SummaryIndicator[] = [
      { label: 'Total', value: demandes.length, cssClass: 'summary-card--total' },
    ];

    const statusSummaries: { statut: StatutIndustrialisation; label: string }[] = [
      { statut: 'BROUILLON', label: 'Brouillons' },
      { statut: 'SOUMISE', label: 'Soumises' },
      { statut: 'RECUE_PAR_CI', label: 'Recues CI' },
      { statut: 'A_COMPLETER', label: 'A completer' },
      { statut: 'RECEVABLE', label: 'Recevables' },
      { statut: 'GO', label: 'Go' },
      { statut: 'NO_GO', label: 'No Go' },
      { statut: 'REFUSEE', label: 'Refusees' },
    ];

    statusSummaries.forEach(({ statut, label }) => {
      const value = counts[statut] ?? 0;
      if (value > 0) {
        indicators.push({
          label,
          value,
          cssClass: `summary-card--${this.statusTone(statut)}`,
        });
      }
    });

    return indicators;
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

  statusPresentation(statut: StatutIndustrialisation): StatusPresentation {
    return this.statusPresentations[statut] ?? {
      label: this.statutLabels[statut] ?? statut,
      cssClass: 'status-pill--info',
      icon: 'i',
      ariaLabel: `Statut ${this.statutLabels[statut] ?? statut}`,
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

  scoreDisplay(demande: CandidatureIndustrialisation): string {
    const score = demande.latestEvaluation?.finalValidatedScore
      ?? demande.latestEvaluation?.scoreFinal
      ?? demande.scoreEvaluationProjet;
    return score == null ? 'Non calcule' : `${score}/100`;
  }

  eligibilityDisplay(demande: CandidatureIndustrialisation): string {
    switch (demande.latestEvaluation?.eligibilityStatus) {
      case 'ELIGIBLE':
        return 'Eligible';
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

  private statusTone(statut: StatutIndustrialisation): StatusTone {
    if (statut === 'GO') return 'go';
    if (statut === 'NO_GO' || statut === 'REFUSEE') return 'nogo';
    if (statut === 'BROUILLON') return 'draft';
    if (statut === 'RECEVABLE') return 'info';
    return 'pending';
  }

  private normalize(value: string | null | undefined): string {
    return (value ?? '')
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .trim();
  }
}
