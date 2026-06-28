import { Component, OnInit, computed, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { CategorieSujet, SujetProjet } from '../../../../core/models/sujet-projet.model';
import { AuthService } from '../../../../core/services/auth.service';
import { CandidatureService } from '../../../../core/services/candidature.service';
import { SujetProjetService } from '../../../../core/services/sujet-projet.service';
import { DeposerSujetModal } from '../../../components/sujets/deposer-sujet-modal/deposer-sujet-modal';
import { FilterDropdown } from '../../../components/sujets/filter-dropdown/filter-dropdown';
import { PostulerModal } from '../../../components/sujets/postuler-modal/postuler-modal';
import { SujetCard } from '../../../components/sujets/sujet-card/sujet-card';
import { CATEGORIE_OPTIONS } from '../../../constants/sujet-projet.constants';

@Component({
  selector: 'app-sujets-disponibles',
  imports: [FormsModule, DeposerSujetModal, SujetCard, FilterDropdown, PostulerModal],
  templateUrl: './sujets-disponibles.html',
  styleUrl: './sujets-disponibles.css',
})
export class SujetsDisponibles implements OnInit {
  private readonly sujetProjetService = inject(SujetProjetService);
  private readonly authService = inject(AuthService);
  private readonly candidatureService = inject(CandidatureService);

  sujets: SujetProjet[] = [];
  filteredSujets: SujetProjet[] = [];
  isLoading = true;
  isModalOpen = false;
  searchQuery = '';
  selectedCategorie = '';
  sortOrder = 'recent';

  // Postuler modal
  showPostulerModal = false;
  selectedSujet: SujetProjet | null = null;
  mesCandidaturesSujetIds: Set<number> = new Set();

  readonly isEnseignant = computed(() => this.authService.getRole() === 'ROLE_ENSEIGNANT');

  readonly categorieOptions = [{ value: '', label: 'Tous les types' }, ...CATEGORIE_OPTIONS];
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
      error: () => {
        this.sujets = [];
        this.filteredSujets = [];
        this.isLoading = false;
      },
    });
  }

  loadMesCandidatures(): void {
    this.candidatureService.getMesCandidatures().subscribe({
      next: (candidatures) => {
        this.mesCandidaturesSujetIds = new Set(
          candidatures.map((c: any) => c.sujetId as number)
        );
      },
      error: () => {} // silent — not critical
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

  ouvrirPostuler(sujet: SujetProjet): void {
    this.selectedSujet = sujet;
    this.showPostulerModal = true;
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
