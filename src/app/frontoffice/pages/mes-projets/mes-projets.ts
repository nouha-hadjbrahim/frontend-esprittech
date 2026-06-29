import { Component, OnInit, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { ProjetCard, StatutProjet, TypeProjet } from '../../../core/models/projet-catalogue.model';
import { ProjetCatalogueService } from '../../../core/services/projet-catalogue.service';
import { AjouterProjetModal } from '../../components/projets/ajouter-projet-modal/ajouter-projet-modal';
import {
  STATUT_PROJET_LABELS,
  TYPE_PROJET_LABELS,
  TYPE_PROJET_OPTIONS,
} from '../../constants/projet-catalogue.constants';

/** Page « Mes projets » de l'enseignant : liste de ses projets déposés au catalogue. */
@Component({
  selector: 'app-mes-projets',
  imports: [FormsModule, RouterModule, AjouterProjetModal],
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

  searchQuery = '';
  selectedType = '';
  selectedStatut = '';
  sortOrder = 'recent';

  readonly typeLabels = TYPE_PROJET_LABELS;
  readonly statutLabels = STATUT_PROJET_LABELS;

  readonly typeOptions = [{ value: '', label: 'Tous les types' }, ...TYPE_PROJET_OPTIONS];
  readonly statutOptions = [
    { value: '', label: 'Tous les statuts' },
    ...Object.entries(STATUT_PROJET_LABELS).map(([value, info]) => ({ value, label: info.label })),
  ];
  readonly sortOptions = [
    { value: 'recent', label: 'Plus récents' },
    { value: 'ancien', label: 'Plus anciens' },
  ];

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
    this.successMessage = 'Projet soumis pour validation';
    this.load();
    setTimeout(() => (this.successMessage = ''), 4000);
  }

  onSearchChange(): void {
    this.applyFilters();
  }

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
}
