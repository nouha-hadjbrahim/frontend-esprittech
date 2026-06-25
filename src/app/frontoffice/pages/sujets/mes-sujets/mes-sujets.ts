import { Component, OnInit, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { CategorieSujet, StatutSujet, SujetProjet } from '../../../../core/models/sujet-projet.model';
import { AuthService } from '../../../../core/services/auth.service';
import { SujetProjetService } from '../../../../core/services/sujet-projet.service';
import { DeposerSujetModal } from '../../../components/sujets/deposer-sujet-modal/deposer-sujet-modal';
import { FilterDropdown } from '../../../components/sujets/filter-dropdown/filter-dropdown';
import { SujetCard } from '../../../components/sujets/sujet-card/sujet-card';
import { CATEGORIE_OPTIONS, STATUT_LABELS } from '../../../constants/sujet-projet.constants';

@Component({
  selector: 'app-mes-sujets',
  imports: [FormsModule, DeposerSujetModal, SujetCard, FilterDropdown],
  templateUrl: './mes-sujets.html',
  styleUrl: './mes-sujets.css',
})
export class MesSujets implements OnInit {
  private readonly sujetProjetService = inject(SujetProjetService);
  private readonly authService = inject(AuthService);

  sujets: SujetProjet[] = [];
  filteredSujets: SujetProjet[] = [];
  isLoading = true;
  isModalOpen = false;
  editSujet?: SujetProjet;
  searchQuery = '';
  selectedCategorie = '';
  selectedStatut = '';
  sortOrder = 'recent';

  readonly categorieOptions = [{ value: '', label: 'Tous les types' }, ...CATEGORIE_OPTIONS];
  readonly statutOptions = [
    { value: '', label: 'Tous les statuts' },
    ...Object.entries(STATUT_LABELS).map(([value, info]) => ({
      value,
      label: info.label,
    })),
  ];
  readonly sortOptions = [
    { value: 'recent', label: 'Plus récents' },
    { value: 'ancien', label: 'Plus anciens' },
  ];

  ngOnInit(): void {
    this.loadSujets();
  }

  loadSujets(): void {
    this.isLoading = true;
    const categorie = (this.selectedCategorie || undefined) as CategorieSujet | undefined;
    const statut = (this.selectedStatut || undefined) as StatutSujet | undefined;

    this.sujetProjetService.getMesSujets(categorie, statut).subscribe({
      next: (sujets) => {
        this.sujets = sujets;
        this.applyFilters();
        this.isLoading = false;
      },
      error: () => {
        this.sujets = [];
        this.filteredSujets = [];
        this.isLoading = false;
      },
    });
  }

  openModal(): void {
    this.editSujet = undefined;
    this.isModalOpen = true;
  }

  openEditModal(sujet: SujetProjet): void {
    this.editSujet = sujet;
    this.isModalOpen = true;
  }

  closeModal(): void {
    this.isModalOpen = false;
    this.editSujet = undefined;
  }

  onSujetSaved(): void {
    this.isModalOpen = false;
    this.editSujet = undefined;
    this.loadSujets();
  }

  deleteSujet(sujet: SujetProjet): void {
    if (!confirm(`Supprimer le sujet « ${sujet.titre} » ?`)) {
      return;
    }

    this.sujetProjetService.supprimerSujet(sujet.id).subscribe({
      next: () => this.loadSujets(),
      error: () => alert('Impossible de supprimer ce sujet.'),
    });
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

  isOwner(sujet: SujetProjet): boolean {
    const userId = this.authService.currentUser()?.id;
    return userId != null && sujet.encadrantId === userId;
  }

  private applyFilters(): void {
    let result = [...this.sujets];

    if (this.searchQuery.trim()) {
      const query = this.searchQuery.toLowerCase();
      result = result.filter(
        (s) =>
          s.titre.toLowerCase().includes(query) ||
          s.domaines.some((d) => d.toLowerCase().includes(query)) ||
          s.technologies.some((t) => t.toLowerCase().includes(query)),
      );
    }

    result.sort((a, b) => {
      const dateA = new Date(a.dateCreation).getTime();
      const dateB = new Date(b.dateCreation).getTime();
      return this.sortOrder === 'recent' ? dateB - dateA : dateA - dateB;
    });

    this.filteredSujets = result;
  }
}
