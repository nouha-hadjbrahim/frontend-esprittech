import { Component, OnInit, inject } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { Subject, debounceTime } from 'rxjs';
import { ProjetCard, StatutProjet, TypeProjet } from '../../core/models/projet-catalogue.model';
import { ProjetCatalogueService } from '../../core/services/projet-catalogue.service';
import { ConfirmDialog } from '../../shared/components/confirm-dialog/confirm-dialog';
import {
  STATUT_PROJET_LABELS,
  TYPE_PROJET_LABELS,
  TYPE_PROJET_OPTIONS,
} from '../../frontoffice/constants/projet-catalogue.constants';

@Component({
  selector: 'app-catalog',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule, ConfirmDialog],
  templateUrl: './catalog.component.html',
  styleUrl: './catalog.component.css',
})
export class CatalogComponent implements OnInit {
  private readonly projetService = inject(ProjetCatalogueService);
  private readonly searchSubject = new Subject<void>();

  readonly typeLabels = TYPE_PROJET_LABELS;
  readonly statutLabels = STATUT_PROJET_LABELS;
  readonly typeButtons = [{ value: '' as const, label: 'Tous' }, ...TYPE_PROJET_OPTIONS];
  readonly statutOptions = [
    { value: '' as const, label: 'Tous les statuts' },
    ...(Object.entries(STATUT_PROJET_LABELS) as [StatutProjet, { label: string; cssClass: string }][]).map(
      ([value, meta]) => ({ value, label: meta.label }),
    ),
  ];
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

  deleteConfirmOpen = false;
  deleting = false;
  deleteError = '';
  projetToDelete: ProjetCard | null = null;

  ngOnInit(): void {
    this.searchSubject.pipe(debounceTime(300)).subscribe(() => this.applyFilters());
    this.load();
  }

  load(): void {
    this.isLoading = true;
    this.errorMessage = '';
    this.projetService.tousLesProjets().subscribe({
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

  askDelete(projet: ProjetCard): void {
    this.projetToDelete = projet;
    this.deleteError = '';
    this.deleteConfirmOpen = true;
  }

  cancelDelete(): void {
    this.deleteConfirmOpen = false;
    this.deleting = false;
    this.projetToDelete = null;
  }

  confirmDelete(): void {
    if (!this.projetToDelete) return;

    this.deleting = true;
    this.projetService.supprimerProjet(this.projetToDelete.id).subscribe({
      next: () => {
        this.deleting = false;
        this.deleteConfirmOpen = false;
        this.projetToDelete = null;
        this.load();
      },
      error: (err: HttpErrorResponse) => {
        this.deleting = false;
        this.deleteError = err.error?.detail ?? 'Échec de la suppression.';
      },
    });
  }

  get deleteConfirmMessage(): string {
    return this.projetToDelete
      ? `Voulez-vous vraiment supprimer « ${this.projetToDelete.titre} » ? Cette action est irréversible.`
      : '';
  }
}
