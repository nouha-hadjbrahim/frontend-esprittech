import { Component, HostListener, OnInit, inject, signal } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { Subject, debounceTime } from 'rxjs';
import { ProjetCard, StatutProjet, TypeProjet } from '../../core/models/projet-catalogue.model';
import { ProjetCatalogueService } from '../../core/services/projet-catalogue.service';
import { ConfirmDialog } from '../../shared/components/confirm-dialog/confirm-dialog';
import { AjouterProjetModal } from '../../frontoffice/components/projets/ajouter-projet-modal/ajouter-projet-modal';
import {
  DEFAULT_PROJET_COVER_IMAGE,
  STATUT_PROJET_LABELS,
  TYPE_PROJET_LABELS,
  TYPE_PROJET_OPTIONS,
} from '../../frontoffice/constants/projet-catalogue.constants';

type FilterKey = 'statut' | 'domaine' | 'annee' | 'sort';
type ViewMode = 'grille' | 'liste';

@Component({
  selector: 'app-catalog',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule, ConfirmDialog, AjouterProjetModal],
  templateUrl: './catalog.component.html',
  styleUrl: './catalog.component.css',
})
export class CatalogComponent implements OnInit {
  private readonly projetService = inject(ProjetCatalogueService);
  private readonly searchSubject = new Subject<void>();

  readonly typeLabels = TYPE_PROJET_LABELS;
  readonly statutLabels = STATUT_PROJET_LABELS;
  readonly defaultCoverImage = DEFAULT_PROJET_COVER_IMAGE;
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

  vue: ViewMode = 'grille';
  readonly openFilter = signal<FilterKey | null>(null);

  page = 0;
  readonly size = 9;

  deleteConfirmOpen = false;
  deleting = false;
  deleteError = '';
  projetToDelete: ProjetCard | null = null;
  createModalOpen = false;

  ngOnInit(): void {
    this.searchSubject.pipe(debounceTime(300)).subscribe(() => {
      this.page = 0;
      this.applyFilters();
    });
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
    this.page = 0;
    this.applyFilters();
  }

  onSearchChange(): void {
    this.searchSubject.next();
  }

  @HostListener('document:click')
  closeFilters(): void {
    this.openFilter.set(null);
  }

  toggleFilter(filter: FilterKey, event: Event): void {
    event.stopPropagation();
    this.openFilter.update((current) => (current === filter ? null : filter));
  }

  selectStatutFilter(value: '' | StatutProjet): void {
    this.selectedStatut = value;
    this.openFilter.set(null);
    this.page = 0;
    this.applyFilters();
  }

  selectDomaineFilter(value: string): void {
    this.selectedDomaine = value;
    this.openFilter.set(null);
    this.page = 0;
    this.applyFilters();
  }

  selectAnneeFilter(value: string): void {
    this.selectedAnnee = value;
    this.openFilter.set(null);
    this.page = 0;
    this.applyFilters();
  }

  selectSortFilter(value: string): void {
    this.sortOrder = value;
    this.openFilter.set(null);
    this.page = 0;
    this.applyFilters();
  }

  get statutFilterLabel(): string {
    return this.statutOptions.find((o) => o.value === this.selectedStatut)?.label ?? 'Tous les statuts';
  }

  get domaineFilterLabel(): string {
    return this.selectedDomaine || 'Tous les domaines';
  }

  get anneeFilterLabel(): string {
    return this.selectedAnnee || 'Toutes les années';
  }

  get sortFilterLabel(): string {
    return this.sortOptions.find((o) => o.value === this.sortOrder)?.label ?? 'Plus récents';
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
    const maxPage = Math.max(0, Math.ceil(result.length / this.size) - 1);
    if (this.page > maxPage) {
      this.page = maxPage;
    }
  }

  get pagedProjets(): ProjetCard[] {
    const start = this.page * this.size;
    return this.filtered.slice(start, start + this.size);
  }

  get totalElements(): number {
    return this.filtered.length;
  }

  get totalPages(): number {
    return Math.max(1, Math.ceil(this.filtered.length / this.size));
  }

  get first(): boolean {
    return this.page === 0;
  }

  get last(): boolean {
    return this.page >= this.totalPages - 1;
  }

  get pageDisplayCount(): number {
    return this.pagedProjets.length;
  }

  get pageNumbers(): number[] {
    return Array.from({ length: this.totalPages }, (_, i) => i + 1);
  }

  prevPage(): void {
    if (!this.first) {
      this.page--;
    }
  }

  nextPage(): void {
    if (!this.last) {
      this.page++;
    }
  }

  goToPage(newPage: number): void {
    if (newPage < 0 || newPage >= this.totalPages || newPage === this.page) return;
    this.page = newPage;
  }

  setVue(mode: ViewMode): void {
    this.vue = mode;
  }

  yearOf(projet: ProjetCard): string {
    if (!projet.dateDebut) return '—';
    return String(new Date(projet.dateDebut).getFullYear());
  }

  primaryDomaine(projet: ProjetCard): string {
    return projet.domaines[0] ?? '—';
  }

  askDelete(projet: ProjetCard): void {
    this.projetToDelete = projet;
    this.deleteError = '';
    this.deleteConfirmOpen = true;
  }

  openCreateModal(): void {
    this.createModalOpen = true;
  }

  closeCreateModal(): void {
    this.createModalOpen = false;
  }

  onProjetSaved(): void {
    this.createModalOpen = false;
    this.load();
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
