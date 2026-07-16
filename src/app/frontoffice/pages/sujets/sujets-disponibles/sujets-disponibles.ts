import { Component, OnInit, computed, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { CategorieSujet, StatutSujet, SujetProjet } from '../../../../core/models/sujet-projet.model';
import { AuthService } from '../../../../core/services/auth.service';
import { CandidatureService } from '../../../../core/services/candidature.service';
import { SujetProjetService } from '../../../../core/services/sujet-projet.service';
import { DeposerSujetModal } from '../../../components/sujets/deposer-sujet-modal/deposer-sujet-modal';
import { FilterDropdown } from '../../../components/sujets/filter-dropdown/filter-dropdown';
import { PostulerModal } from '../../../components/sujets/postuler-modal/postuler-modal';
import { SujetDisponibleCard } from '../../../components/sujets/sujet-disponible-card/sujet-disponible-card';
import { SujetsPagination } from '../../../components/sujets/sujets-pagination/sujets-pagination';
import { ConfirmDialog } from '../../../../shared/components/confirm-dialog/confirm-dialog';
import { FrontofficeEmptyState } from '../../../components/frontoffice-empty-state/frontoffice-empty-state';
import { CATEGORIE_OPTIONS, STATUT_LABELS } from '../../../constants/sujet-projet.constants';

const CATALOGUE_STATUTS: StatutSujet[] = ['VALIDE', 'CANDIDATURE_OUVERTE'];
const PAGE_SIZE = 9;

@Component({
  selector: 'app-sujets-disponibles',
  imports: [
    FormsModule,
    DeposerSujetModal,
    SujetDisponibleCard,
    FilterDropdown,
    PostulerModal,
    ConfirmDialog,
    FrontofficeEmptyState,
    SujetsPagination,
  ],
  templateUrl: './sujets-disponibles.html',
  styleUrl: './sujets-disponibles.css',
})
export class SujetsDisponibles implements OnInit {
  private readonly sujetProjetService = inject(SujetProjetService);
  private readonly authService = inject(AuthService);
  private readonly candidatureService = inject(CandidatureService);

  sujets: SujetProjet[] = [];
  filteredSujets: SujetProjet[] = [];
  pagedSujets: SujetProjet[] = [];
  isLoading = true;
  isModalOpen = false;
  searchQuery = '';
  selectedCategorie = '';
  selectedStatut = '';
  selectedEquipe = '';
  selectedEncadrant = '';
  sortOrder = 'recent';
  currentPage = 1;
  readonly pageSize = PAGE_SIZE;

  showPostulerModal = false;
  showCandidatureFermeeAlert = false;
  selectedSujet: SujetProjet | null = null;
  mesCandidaturesSujetIds: Set<number> = new Set();

  readonly canDeposerSujet = computed(
    () => this.authService.getRole() === 'ROLE_ENSEIGNANT' || this.authService.getRole() === 'ROLE_CHEF_EQUIPE',
  );
  readonly isEtudiant = computed(() => this.authService.getRole() === 'ROLE_ETUDIANT');

  readonly categoriePills = [{ value: '', label: 'Tous' }, ...CATEGORIE_OPTIONS];
  readonly sortOptions = [
    { value: 'recent', label: 'Plus récents' },
    { value: 'ancien', label: 'Plus anciens' },
  ];

  ngOnInit(): void {
    this.loadSujets();
    this.loadMesCandidatures();
  }

  loadSujets(): void {
    this.isLoading = true;
    const categorie = (this.selectedCategorie || undefined) as CategorieSujet | undefined;

    this.sujetProjetService.getSujetsDisponibles(categorie).subscribe({
      next: (sujets) => {
        this.sujets = sujets;
        this.applyFilters();
        this.isLoading = false;
      },
      error: (err) => {
        console.error('Erreur lors du chargement des sujets disponibles:', err);
        this.sujets = [];
        this.filteredSujets = [];
        this.pagedSujets = [];
        this.isLoading = false;
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

  get statutOptions(): { value: string; label: string }[] {
    const statuts = new Set(this.sujets.map((s) => s.statut));
    return [
      { value: '', label: 'Statut' },
      ...CATALOGUE_STATUTS.filter((s) => statuts.has(s)).map((value) => ({
        value,
        label: STATUT_LABELS[value].label,
      })),
    ];
  }

  get equipeOptions(): { value: string; label: string }[] {
    const equipes = [...new Set(this.sujets.map((s) => s.equipeNom).filter(Boolean) as string[])].sort();
    return [{ value: '', label: 'Équipe' }, ...equipes.map((e) => ({ value: e, label: e }))];
  }

  get encadrantOptions(): { value: string; label: string }[] {
    const encadrants = [...new Set(this.sujets.map((s) => s.encadrantNom).filter(Boolean))].sort();
    return [{ value: '', label: 'Encadrant' }, ...encadrants.map((e) => ({ value: e, label: e }))];
  }

  loadMesCandidatures(): void {
    this.candidatureService.getMesCandidatures().subscribe({
      next: (candidatures) => {
        this.mesCandidaturesSujetIds = new Set(
          candidatures
            .filter((c: { statut: string }) => c.statut === 'DEPOSEE' || c.statut === 'ACCEPTEE')
            .map((c: { sujetId: number }) => c.sujetId),
        );
      },
      error: () => {},
    });
  }

  dejaPostule(sujet: SujetProjet): boolean {
    return this.mesCandidaturesSujetIds.has(sujet.id);
  }

  openModal(): void {
    this.isModalOpen = true;
  }

  closeModal(): void {
    this.isModalOpen = false;
  }

  onSujetSaved(): void {
    this.isModalOpen = false;
    this.loadSujets();
  }

  selectCategoriePill(value: string): void {
    this.selectedCategorie = value;
    this.loadSujets();
  }

  onStatutChange(value: string): void {
    this.selectedStatut = value;
    this.applyFilters();
  }

  onEquipeChange(value: string): void {
    this.selectedEquipe = value;
    this.applyFilters();
  }

  onEncadrantChange(value: string): void {
    this.selectedEncadrant = value;
    this.applyFilters();
  }

  onSortChange(value: string): void {
    this.sortOrder = value;
    this.applyFilters();
  }

  onSearchChange(): void {
    this.applyFilters();
  }

  ouvrirPostuler(sujet: SujetProjet): void {
    if (sujet.statut === 'VALIDE') {
      this.showCandidatureFermeeAlert = true;
      return;
    }
    if (sujet.statut !== 'CANDIDATURE_OUVERTE') {
      return;
    }
    this.selectedSujet = sujet;
    this.showPostulerModal = true;
  }

  fermerAlerteCandidature(): void {
    this.showCandidatureFermeeAlert = false;
  }

  fermerPostuler(): void {
    this.showPostulerModal = false;
    this.selectedSujet = null;
  }

  onCandidatureSoumise(): void {
    this.fermerPostuler();
    this.loadMesCandidatures();
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
          (s.equipeNom?.toLowerCase().includes(query) ?? false),
      );
    }

    if (this.selectedStatut) {
      result = result.filter((s) => s.statut === this.selectedStatut);
    }

    if (this.selectedEquipe) {
      result = result.filter((s) => s.equipeNom === this.selectedEquipe);
    }

    if (this.selectedEncadrant) {
      result = result.filter((s) => s.encadrantNom === this.selectedEncadrant);
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
