import { Component, OnInit, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { CategorieSujet, StatutSujet, SujetProjet } from '../../../../core/models/sujet-projet.model';
import { AuthService } from '../../../../core/services/auth.service';
import { SujetProjetService } from '../../../../core/services/sujet-projet.service';
import { DeposerSujetModal } from '../../../components/sujets/deposer-sujet-modal/deposer-sujet-modal';
import { FilterDropdown } from '../../../components/sujets/filter-dropdown/filter-dropdown';
import { SujetCard } from '../../../components/sujets/sujet-card/sujet-card';
import { SujetListRow } from '../../../components/sujets/sujet-list-row/sujet-list-row';
import { SujetsPagination } from '../../../components/sujets/sujets-pagination/sujets-pagination';
import { ConfirmDialog } from '../../../../shared/components/confirm-dialog/confirm-dialog';
import { GererCandidaturesModal } from '../../../components/sujets/gerer-candidatures-modal/gerer-candidatures-modal';
import { FrontofficeEmptyState } from '../../../components/frontoffice-empty-state/frontoffice-empty-state';
import { CATEGORIE_OPTIONS, STATUT_LABELS } from '../../../constants/sujet-projet.constants';

export type ViewMode = 'cards' | 'list';
export type SujetScope = 'mes' | 'equipe';

const PAGE_SIZE = 9;

/** Sujets déjà publiés au catalogue après terminaison — exclus de « Mes sujets ». */
const STATUTS_HORS_MES_SUJETS = new Set<StatutSujet>([
  'REALISATION_TERMINEE',
  'CANDIDAT_INDUSTRIALISATION_INTERNE',
  'CANDIDAT_INDUSTRIALISATION_EXTERNE',
  'INDUSTRIALISE_DSI',
  'INDUSTRIALISE_EXTERNE',
]);

@Component({
  selector: 'app-mes-sujets',
  imports: [
    FormsModule,
    DeposerSujetModal,
    SujetCard,
    SujetListRow,
    FilterDropdown,
    ConfirmDialog,
    GererCandidaturesModal,
    FrontofficeEmptyState,
    SujetsPagination,
  ],
  templateUrl: './mes-sujets.html',
  styleUrl: './mes-sujets.css',
})
export class MesSujets implements OnInit {
  private readonly sujetProjetService = inject(SujetProjetService);
  private readonly authService = inject(AuthService);

  sujets: SujetProjet[] = [];
  filteredSujets: SujetProjet[] = [];
  pagedSujets: SujetProjet[] = [];
  isLoading = true;
  loadError = '';
  isModalOpen = false;
  editSujet?: SujetProjet;
  searchQuery = '';
  selectedCategorie = '';
  selectedStatut = '';
  sortOrder = 'recent';
  viewMode: ViewMode = 'cards';
  sujetScope: SujetScope = 'mes';
  currentPage = 1;
  readonly pageSize = PAGE_SIZE;

  candidaturesModalOpen = false;
  sujetCandidatures?: SujetProjet;

  deleteConfirmOpen = false;
  deleteAlertOpen = false;
  deleteAlertMessage = '';
  deleting = false;
  sujetToDelete?: SujetProjet;

  readonly categorieOptions = [{ value: '', label: 'Tous les types' }, ...CATEGORIE_OPTIONS];
  /** Statuts du cycle « sujet » uniquement (les sujets terminés vivent dans le catalogue). */
  readonly statutOptions = [
    { value: '', label: 'Tous les statuts' },
    ...Object.entries(STATUT_LABELS)
      .filter(([value]) => !STATUTS_HORS_MES_SUJETS.has(value as StatutSujet))
      .map(([value, info]) => ({
        value,
        label: info.label,
      })),
  ];
  readonly sortOptions = [
    { value: 'recent', label: 'Plus récents' },
    { value: 'ancien', label: 'Plus anciens' },
  ];

  get isChefEquipe(): boolean {
    return this.authService.getRole() === 'ROLE_CHEF_EQUIPE';
  }

  get isEnseignant(): boolean {
    return this.authService.getRole() === 'ROLE_ENSEIGNANT';
  }

  get canDeposerSujet(): boolean {
    return this.isEnseignant || this.isChefEquipe;
  }

  get emptyMessage(): string {
    if (this.isChefEquipe && this.sujetScope === 'equipe') {
      return 'Aucun sujet depose par les membres de votre equipe ne correspond a vos filtres.';
    }
    if (this.canDeposerSujet) {
      return "Vous n'avez pas encore depose de sujet ou aucun resultat ne correspond a vos filtres.";
    }
    return 'Aucun resultat ne correspond a vos filtres.';
  }

  get emptyActionLabel(): string | undefined {
    return this.canDeposerSujet && (!this.isChefEquipe || this.sujetScope === 'mes')
      ? 'Deposer votre premier sujet'
      : undefined;
  }

  get pageTitle(): string {
    if (this.isChefEquipe) {
      return this.sujetScope === 'mes' ? 'Mes sujets' : "Sujets de l'équipe";
    }
    return 'Mes sujets';
  }

  get pageSubtitle(): string {
    if (this.isChefEquipe && this.sujetScope === 'equipe') {
      return 'Sujets déposés par les enseignants de votre équipe (consultation uniquement).';
    }
    if (this.isChefEquipe) {
      return 'Vos sujets déposés, validés automatiquement, avec gestion des candidatures.';
    }
    return 'Sujets déposés, leur statut de validation et leurs candidatures.';
  }

  ngOnInit(): void {
    this.loadSujets();
  }

  setSujetScope(scope: SujetScope): void {
    if (!this.isChefEquipe || this.sujetScope === scope) {
      return;
    }
    this.sujetScope = scope;
    this.searchQuery = '';
    this.loadSujets();
  }

  loadSujets(): void {
    this.isLoading = true;
    this.loadError = '';
    const categorie = (this.selectedCategorie || undefined) as CategorieSujet | undefined;
    const statut = (this.selectedStatut || undefined) as StatutSujet | undefined;

    const request$ =
      this.isChefEquipe && this.sujetScope === 'equipe'
        ? this.sujetProjetService.getSujetsEquipe(categorie, statut)
        : this.sujetProjetService.getMesSujets(categorie, statut);

    request$.subscribe({
      next: (sujets) => {
        this.sujets = this.filterSujetsForScope(sujets);
        this.applyFilters();
        this.isLoading = false;
        if (this.candidaturesModalOpen && this.sujetCandidatures) {
          this.sujetCandidatures = this.sujets.find((s) => s.id === this.sujetCandidatures?.id) ?? this.sujetCandidatures;
        }
      },
      error: () => {
        this.sujets = [];
        this.filteredSujets = [];
        this.pagedSujets = [];
        this.isLoading = false;
        this.loadError =
          this.isChefEquipe && this.sujetScope === 'equipe'
            ? "Impossible de charger les sujets de l'équipe. Vérifiez que le backend est démarré."
            : 'Impossible de charger vos sujets. Vérifiez que le backend est démarré.';
      },
    });
  }

  get totalPages(): number {
    return Math.max(1, Math.ceil(this.filteredSujets.length / this.pageSize));
  }

  goToPage(page: number): void {
    this.currentPage = page;
    this.updatePagedSujets();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  openModal(): void {
    this.editSujet = undefined;
    this.isModalOpen = true;
  }

  openEditModal(sujet: SujetProjet): void {
    this.editSujet = {
      ...sujet,
      domaines: [...sujet.domaines],
      prerequis: [...sujet.prerequis],
      technologies: [...sujet.technologies],
    };
    this.isModalOpen = true;
  }

  closeModal(): void {
    if (!this.isModalOpen) {
      return;
    }
    this.isModalOpen = false;
    this.editSujet = undefined;
  }

  onSujetSaved(): void {
    this.isModalOpen = false;
    this.editSujet = undefined;
    if (this.isChefEquipe) {
      this.sujetScope = 'mes';
    }
    this.loadSujets();
  }

  deleteSujet(sujet: SujetProjet): void {
    this.sujetToDelete = sujet;
    this.deleteConfirmOpen = true;
  }

  cancelDelete(): void {
    this.deleteConfirmOpen = false;
    this.sujetToDelete = undefined;
    this.deleting = false;
  }

  confirmDelete(): void {
    if (!this.sujetToDelete) {
      return;
    }

    this.deleting = true;
    this.sujetProjetService.supprimerSujet(this.sujetToDelete.id).subscribe({
      next: () => {
        this.deleting = false;
        this.deleteConfirmOpen = false;
        this.sujetToDelete = undefined;
        this.loadSujets();
      },
      error: () => {
        this.deleting = false;
        this.deleteConfirmOpen = false;
        this.deleteAlertMessage = 'Impossible de supprimer ce sujet. Vérifiez que le backend est démarré.';
        this.deleteAlertOpen = true;
        this.sujetToDelete = undefined;
      },
    });
  }

  closeDeleteAlert(): void {
    this.deleteAlertOpen = false;
    this.deleteAlertMessage = '';
  }

  get deleteConfirmMessage(): string {
    return this.sujetToDelete
      ? `Voulez-vous vraiment supprimer « ${this.sujetToDelete.titre} » ? Cette action est irréversible.`
      : '';
  }

  onCategorieChange(value: string): void {
    this.selectedCategorie = value;
    this.loadSujets();
  }

  onStatutChange(value: string): void {
    this.selectedStatut = value;
    this.loadSujets();
  }

  onSortChange(value: string): void {
    this.sortOrder = value;
    this.applyFilters();
  }

  onSearchChange(): void {
    this.applyFilters();
  }

  setViewMode(mode: ViewMode): void {
    this.viewMode = mode;
  }

  isOwner(sujet: SujetProjet): boolean {
    if (this.isChefEquipe && this.sujetScope === 'equipe') {
      return false;
    }
    if (!this.canDeposerSujet) {
      return false;
    }
    const userId = this.authService.currentUser()?.id;
    return userId != null && sujet.encadrantId === userId;
  }

  openCandidaturesModal(sujet: SujetProjet): void {
    this.sujetCandidatures = sujet;
    this.candidaturesModalOpen = true;
  }

  closeCandidaturesModal(): void {
    this.candidaturesModalOpen = false;
    this.sujetCandidatures = undefined;
  }

  onCandidaturesChanged(): void {
    this.loadSujets();
  }

  private filterSujetsForScope(sujets: SujetProjet[]): SujetProjet[] {
    const actifs = sujets.filter((s) => !STATUTS_HORS_MES_SUJETS.has(s.statut));

    if (!this.isChefEquipe) {
      return actifs;
    }

    const userId = this.authService.currentUser()?.id;
    if (this.sujetScope === 'mes') {
      return userId != null ? actifs.filter((s) => s.encadrantId === userId) : actifs;
    }

    return userId != null ? actifs.filter((s) => s.encadrantId !== userId) : actifs;
  }

  private applyFilters(): void {
    let result = [...this.sujets];

    if (this.searchQuery.trim()) {
      const query = this.searchQuery.toLowerCase();
      result = result.filter(
        (s) =>
          s.titre.toLowerCase().includes(query) ||
          s.domaines.some((d) => d.toLowerCase().includes(query)) ||
          s.technologies.some((t) => t.toLowerCase().includes(query)) ||
          (s.encadrantNom?.toLowerCase().includes(query) ?? false) ||
          (s.encadrantEmail?.toLowerCase().includes(query) ?? false),
      );
    }

    result.sort((a, b) => {
      const dateA = new Date(a.dateCreation).getTime();
      const dateB = new Date(b.dateCreation).getTime();
      return this.sortOrder === 'recent' ? dateB - dateA : dateA - dateB;
    });

    this.filteredSujets = result;
    this.currentPage = 1;
    this.updatePagedSujets();
  }

  private updatePagedSujets(): void {
    const total = this.totalPages;
    if (this.currentPage > total) {
      this.currentPage = total;
    }
    const start = (this.currentPage - 1) * this.pageSize;
    this.pagedSujets = this.filteredSujets.slice(start, start + this.pageSize);
  }
}
