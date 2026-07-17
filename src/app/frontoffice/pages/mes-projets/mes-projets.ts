import { Component, OnInit, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { ProjetCard, StatutProjet, TypeProjet } from '../../../core/models/projet-catalogue.model';
import { ProjetCatalogueService } from '../../../core/services/projet-catalogue.service';
import { AjouterProjetModal } from '../../components/projets/ajouter-projet-modal/ajouter-projet-modal';
import { FrontofficeEmptyState } from '../../components/frontoffice-empty-state/frontoffice-empty-state';
import { FilterDropdown } from '../../components/sujets/filter-dropdown/filter-dropdown';
import { ConfirmDialog } from '../../../shared/components/confirm-dialog/confirm-dialog';
import {
  DEFAULT_PROJET_COVER_IMAGE,
  STATUT_PROJET_LABELS,
  TYPE_PROJET_LABELS,
  TYPE_PROJET_OPTIONS,
} from '../../constants/projet-catalogue.constants';

/** Page « Mes projets » de l'enseignant : liste de ses projets déposés au catalogue. */
@Component({
  selector: 'app-mes-projets',
  imports: [FormsModule, RouterModule, AjouterProjetModal, FrontofficeEmptyState, FilterDropdown, ConfirmDialog],
  templateUrl: './mes-projets.html',
  styleUrl: './mes-projets.css',
})
export class MesProjets implements OnInit {
  private readonly projetService = inject(ProjetCatalogueService);

  projets: ProjetCard[] = [];
  filtered: ProjetCard[] = [];
  isLoading = true;
  errorMessage = '';
  successMessage = '';
  isModalOpen = false;

  /** Popup d'information affiché après la soumission d'un projet (rappel dépôt des livrables). */
  infoDialogOpen = false;
  readonly infoDialogMessage =
    'Votre projet a été soumis pour validation. Pour améliorer la note de votre projet, ' +
    'pensez à déposer vos livrables dans la section Livrables.';

  searchQuery = '';
  selectedType = '';
  selectedStatut = '';
  sortOrder = 'recent';

  readonly typeLabels = TYPE_PROJET_LABELS;
  readonly statutLabels = STATUT_PROJET_LABELS;
  readonly defaultCoverImage = DEFAULT_PROJET_COVER_IMAGE;

  readonly typeFilterOptions = [
    { value: '', label: 'Type' },
    ...TYPE_PROJET_OPTIONS,
  ];
  readonly statutFilterOptions = [
    { value: '', label: 'Statut' },
    ...Object.entries(STATUT_PROJET_LABELS).map(([value, info]) => ({ value, label: info.label })),
  ];
  readonly sortOptions = [
    { value: 'recent', label: 'Plus récents' },
    { value: 'ancien', label: 'Plus anciens' },
  ];

  get emptyMessage(): string {
    return this.projets.length === 0
      ? "Vous n'avez encore soumis aucun projet."
      : 'Aucun projet ne correspond a votre recherche.';
  }

  ngOnInit(): void {
    this.load();
  }

  load(): void {
    this.isLoading = true;
    this.errorMessage = '';
    this.projetService.mesProjets().subscribe({
      next: (projets) => {
        this.projets = projets;
        this.applyFilters();
        this.isLoading = false;
      },
      error: () => {
        this.projets = [];
        this.filtered = [];
        this.errorMessage = 'Impossible de charger vos projets. Vérifiez que le backend est démarré.';
        this.isLoading = false;
      },
    });
  }

  openModal(): void {
    this.isModalOpen = true;
  }

  closeModal(): void {
    this.isModalOpen = false;
  }

  onProjetSaved(): void {
    this.isModalOpen = false;
    this.infoDialogOpen = true;
    this.load();
  }

  closeInfoDialog(): void {
    this.infoDialogOpen = false;
  }

  onSearchChange(): void {
    this.applyFilters();
  }

  onTypeChange(value: string): void {
    this.selectedType = value;
    this.applyFilters();
  }

  onStatutChange(value: string): void {
    this.selectedStatut = value;
    this.applyFilters();
  }

  onSortChange(value: string): void {
    this.sortOrder = value;
    this.applyFilters();
  }

  /** Conservé pour les tests et appels internes. */
  onFilterChange(): void {
    this.applyFilters();
  }

  private applyFilters(): void {
    let result = [...this.projets];

    if (this.searchQuery.trim()) {
      const query = this.searchQuery.toLowerCase();
      result = result.filter(
        (p) =>
          p.titre.toLowerCase().includes(query) ||
          p.description.toLowerCase().includes(query) ||
          p.domaines.some((d) => d.toLowerCase().includes(query)) ||
          p.technologies.some((t) => t.toLowerCase().includes(query)),
      );
    }

    if (this.selectedType) {
      result = result.filter((p) => p.typeProjet === (this.selectedType as TypeProjet));
    }

    if (this.selectedStatut) {
      result = result.filter((p) => p.statut === (this.selectedStatut as StatutProjet));
    }

    result.sort((a, b) => {
      const dateA = new Date(a.dateCreation).getTime();
      const dateB = new Date(b.dateCreation).getTime();
      return this.sortOrder === 'recent' ? dateB - dateA : dateA - dateB;
    });

    this.filtered = result;
  }

  initiales(nom: string): string {
    return nom
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase() ?? '')
      .join('');
  }

  primaryDomaine(projet: ProjetCard): string {
    return projet.domaines[0] ?? 'Non renseigné';
  }

  visibleTechnologies(technologies: string[]): string[] {
    return technologies.slice(0, 3);
  }

  extraTechCount(technologies: string[]): number {
    return Math.max(0, technologies.length - 3);
  }

  formatPeriode(projet: ProjetCard): string {
    const debut = new Date(projet.dateDebut).toLocaleDateString('fr-FR');
    const fin = new Date(projet.dateFin).toLocaleDateString('fr-FR');
    return `${debut} → ${fin}`;
  }
}
