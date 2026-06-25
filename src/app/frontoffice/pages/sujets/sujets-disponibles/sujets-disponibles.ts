import { Component, OnInit, computed, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { CategorieSujet, SujetProjet } from '../../../../core/models/sujet-projet.model';
import { AuthService } from '../../../../core/services/auth.service';
import { SujetProjetService } from '../../../../core/services/sujet-projet.service';
import { DeposerSujetModal } from '../../../components/sujets/deposer-sujet-modal/deposer-sujet-modal';
import { FilterDropdown } from '../../../components/sujets/filter-dropdown/filter-dropdown';
import { SujetCard } from '../../../components/sujets/sujet-card/sujet-card';
import { CATEGORIE_OPTIONS } from '../../../constants/sujet-projet.constants';

@Component({
  selector: 'app-sujets-disponibles',
  imports: [FormsModule, DeposerSujetModal, SujetCard, FilterDropdown],
  templateUrl: './sujets-disponibles.html',
  styleUrl: './sujets-disponibles.css',
})
export class SujetsDisponibles implements OnInit {
  private readonly sujetProjetService = inject(SujetProjetService);
  private readonly authService = inject(AuthService);

  sujets: SujetProjet[] = [];
  filteredSujets: SujetProjet[] = [];
  isLoading = true;
  isModalOpen = false;
  searchQuery = '';
  selectedCategorie = '';
  sortOrder = 'recent';

  readonly isEnseignant = computed(() => this.authService.getRole() === 'ROLE_ENSEIGNANT');

  readonly categorieOptions = [{ value: '', label: 'Tous les types' }, ...CATEGORIE_OPTIONS];
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

    this.sujetProjetService.getSujetsDisponibles(categorie).subscribe({
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
    this.isModalOpen = true;
  }

  closeModal(): void {
    this.isModalOpen = false;
  }

  onSujetSaved(): void {
    this.isModalOpen = false;
    this.loadSujets();
  }

  onCategorieChange(value: string): void {
    this.selectedCategorie = value;
    this.loadSujets();
  }

  onSortChange(value: string): void {
    this.sortOrder = value;
    this.applyFilters();
  }

  onSearchChange(): void {
    this.applyFilters();
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
          (s.encadrantNom?.toLowerCase().includes(query) ?? false),
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
