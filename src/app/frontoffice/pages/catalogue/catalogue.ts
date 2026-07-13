import { Component, OnInit, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { Subject, debounceTime } from 'rxjs';
import { ProjetCard, StatutProjet, TypeProjet } from '../../../core/models/projet-catalogue.model';
import { ProjetCatalogueService } from '../../../core/services/projet-catalogue.service';
import {
  STATUT_CATALOGUE_OPTIONS,
  TYPE_PROJET_LABELS,
  TYPE_PROJET_OPTIONS,
} from '../../constants/projet-catalogue.constants';

/** Page « Catalogue des projets » : projets validés/industrialisés, avec filtres. */
@Component({
  selector: 'app-catalogue',
  imports: [FormsModule, RouterModule],
  templateUrl: './catalogue.html',
  styleUrl: './catalogue.css',
})
export class Catalogue implements OnInit {
  private readonly projetService = inject(ProjetCatalogueService);
  private readonly searchSubject = new Subject<void>();

  readonly typeLabels = TYPE_PROJET_LABELS;
  readonly typeButtons = [{ value: '' as const, label: 'Tous' }, ...TYPE_PROJET_OPTIONS];
  readonly statutOptions = STATUT_CATALOGUE_OPTIONS;
  readonly sortOptions = [
    { value: 'recent', label: 'Plus récents' },
    { value: 'ancien', label: 'Plus anciens' },
    { value: 'score', label: 'Meilleur score' },
  ];

  allProjets: ProjetCard[] = [];
  filtered: ProjetCard[] = [];
  isLoading = true;
  errorMessage = '';

  searchQuery = '';
  selectedType: '' | TypeProjet = '';
  selectedStatut: '' | StatutProjet = '';
  selectedDomaine = '';
  selectedAnnee = '';
  sortOrder = 'recent';

  domaineOptions: string[] = [];
  anneeOptions: number[] = [];

  ngOnInit(): void {
    this.searchSubject.pipe(debounceTime(300)).subscribe(() => this.applyFilters());
    this.load();
  }

  load(): void {
    this.isLoading = true;
    this.errorMessage = '';
    this.projetService.catalogue().subscribe({
      next: (projets) => {
        this.allProjets = projets;
        this.deriveOptions();
        this.applyFilters();
        this.isLoading = false;
      },
      error: () => {
        this.allProjets = [];
        this.filtered = [];
        this.errorMessage = 'Impossible de charger le catalogue. Vérifiez que le backend est démarré.';
        this.isLoading = false;
      },
    });
  }

  private deriveOptions(): void {
    const domaines = new Set<string>();
    const annees = new Set<number>();
    for (const p of this.allProjets) {
      p.domaines.forEach((d) => domaines.add(d));
      if (p.dateDebut) {
        annees.add(new Date(p.dateDebut).getFullYear());
      }
    }
    this.domaineOptions = Array.from(domaines).sort((a, b) => a.localeCompare(b));
    this.anneeOptions = Array.from(annees).sort((a, b) => b - a);
  }

  selectType(type: '' | TypeProjet): void {
    this.selectedType = type;
    this.applyFilters();
  }

  onSearchChange(): void {
    this.searchSubject.next();
  }

  onFilterChange(): void {
    this.applyFilters();
  }

  private applyFilters(): void {
    let result = [...this.allProjets];

    if (this.selectedType) {
      result = result.filter((p) => p.typeProjet === this.selectedType);
    }
    if (this.selectedStatut) {
      result = result.filter((p) => p.statut === this.selectedStatut);
    }
    if (this.selectedDomaine) {
      result = result.filter((p) => p.domaines.includes(this.selectedDomaine));
    }
    if (this.selectedAnnee) {
      const annee = Number(this.selectedAnnee);
      result = result.filter((p) => p.dateDebut && new Date(p.dateDebut).getFullYear() === annee);
    }
    if (this.searchQuery.trim()) {
      const query = this.searchQuery.toLowerCase();
      result = result.filter(
        (p) =>
          p.titre.toLowerCase().includes(query) ||
          p.description.toLowerCase().includes(query) ||
          p.encadrantNom.toLowerCase().includes(query) ||
          p.technologies.some((t) => t.toLowerCase().includes(query)),
      );
    }

    result.sort((a, b) => {
      if (this.sortOrder === 'score') {
        return b.score - a.score;
      }
      const dateA = new Date(a.dateCreation).getTime();
      const dateB = new Date(b.dateCreation).getTime();
      return this.sortOrder === 'recent' ? dateB - dateA : dateA - dateB;
    });

    this.filtered = result;
  }
}
