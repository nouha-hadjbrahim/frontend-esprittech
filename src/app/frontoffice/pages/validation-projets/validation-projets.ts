import { Component, OnInit, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ProjetCard, TypeProjet } from '../../../core/models/projet-catalogue.model';
import { ProjetCatalogueService } from '../../../core/services/projet-catalogue.service';
import { ConfirmDialog } from '../../../shared/components/confirm-dialog/confirm-dialog';
import { FilterDropdown } from '../../components/sujets/filter-dropdown/filter-dropdown';
import { ValidationProjetListRow } from '../../components/projets/validation-projet-list-row/validation-projet-list-row';
import { FrontofficeEmptyState } from '../../components/frontoffice-empty-state/frontoffice-empty-state';
import { TYPE_PROJET_OPTIONS } from '../../constants/projet-catalogue.constants';

/**
 * Validation des projets du catalogue par le chef d'équipe.
 * Liste les projets « Soumis en validation » de son équipe et permet de les
 * Valider (confirmation) ou Refuser (motif obligatoire, ≥ 5 caractères).
 */
@Component({
  selector: 'app-validation-projets',
  imports: [FormsModule, ConfirmDialog, FrontofficeEmptyState, FilterDropdown, ValidationProjetListRow],
  templateUrl: './validation-projets.html',
  styleUrl: './validation-projets.css',
})
export class ValidationProjets implements OnInit {
  private readonly projetService = inject(ProjetCatalogueService);

  projets: ProjetCard[] = [];
  filtered: ProjetCard[] = [];
  isLoading = true;
  errorMessage = '';
  successMessage = '';
  actionLoadingId: number | null = null;

  searchQuery = '';
  selectedType = '';
  sortOrder = 'recent';

  validerTarget: ProjetCard | null = null;

  motifTargetId: number | null = null;
  motifText = '';
  rejectError = '';

  readonly typeFilterOptions = [
    { value: '', label: 'Type' },
    ...TYPE_PROJET_OPTIONS,
  ];
  readonly sortOptions = [
    { value: 'recent', label: 'Plus récents' },
    { value: 'ancien', label: 'Plus anciens' },
  ];

  get summary(): { total: number; enAttente: number; pfe: number; stage: number } {
    return {
      total: this.projets.length,
      enAttente: this.projets.filter((p) => p.statut === 'SOUMIS_EN_VALIDATION').length,
      pfe: this.projets.filter((p) => p.typeProjet === 'PFE').length,
      stage: this.projets.filter((p) => p.typeProjet === 'STAGE_INGENIEUR').length,
    };
  }

  ngOnInit(): void {
    this.load();
  }

  load(): void {
    this.isLoading = true;
    this.errorMessage = '';
    this.projetService.projetsAValider().subscribe({
      next: (projets) => {
        this.projets = projets;
        this.applyFilters();
        this.isLoading = false;
      },
      error: () => {
        this.projets = [];
        this.filtered = [];
        this.errorMessage = 'Impossible de charger les projets en attente de validation.';
        this.isLoading = false;
      },
    });
  }

  onSearchChange(): void {
    this.applyFilters();
  }

  onTypeChange(value: string): void {
    this.selectedType = value;
    this.applyFilters();
  }

  onSortChange(value: string): void {
    this.sortOrder = value;
    this.applyFilters();
  }

  isActionLoading(projet: ProjetCard): boolean {
    return this.actionLoadingId === projet.id;
  }

  // ── Validation ──────────────────────────────────────────────────────
  demanderValidation(projet: ProjetCard): void {
    this.validerTarget = projet;
  }

  annulerValidation(): void {
    this.validerTarget = null;
  }

  confirmerValidation(): void {
    if (!this.validerTarget) {
      return;
    }
    const projet = this.validerTarget;
    this.actionLoadingId = projet.id;
    this.errorMessage = '';
    this.projetService.valider(projet.id).subscribe({
      next: () => {
        this.actionLoadingId = null;
        this.validerTarget = null;
        this.notifier('Projet validé et publié au catalogue.');
        this.load();
      },
      error: (err) => {
        this.actionLoadingId = null;
        this.validerTarget = null;
        this.errorMessage = err?.error?.detail ?? err?.error?.message ?? 'Impossible de valider ce projet.';
      },
    });
  }

  // ── Refus ───────────────────────────────────────────────────────────
  ouvrirMotif(projet: ProjetCard): void {
    this.motifTargetId = projet.id;
    this.motifText = '';
    this.rejectError = '';
  }

  annulerMotif(): void {
    this.motifTargetId = null;
    this.motifText = '';
    this.rejectError = '';
  }

  get motifInvalide(): boolean {
    return this.motifText.trim().length < 5;
  }

  confirmerRefus(): void {
    if (this.motifTargetId === null) {
      return;
    }
    if (this.motifInvalide) {
      this.rejectError = 'Le motif doit contenir au moins 5 caractères.';
      return;
    }
    const id = this.motifTargetId;
    this.actionLoadingId = id;
    this.errorMessage = '';
    this.rejectError = '';
    this.projetService.refuser(id, this.motifText.trim()).subscribe({
      next: () => {
        this.actionLoadingId = null;
        this.annulerMotif();
        this.notifier('Projet refusé.');
        this.load();
      },
      error: (err) => {
        this.actionLoadingId = null;
        this.errorMessage = err?.error?.detail ?? err?.error?.message ?? 'Impossible de refuser ce projet.';
      },
    });
  }

  get projetEnRefus(): ProjetCard | undefined {
    return this.projets.find((p) => p.id === this.motifTargetId);
  }

  private applyFilters(): void {
    let result = [...this.projets];

    if (this.selectedType) {
      result = result.filter((p) => p.typeProjet === (this.selectedType as TypeProjet));
    }

    if (this.searchQuery.trim()) {
      const query = this.searchQuery.toLowerCase();
      result = result.filter(
        (p) =>
          p.titre.toLowerCase().includes(query) ||
          p.description.toLowerCase().includes(query) ||
          p.encadrantNom.toLowerCase().includes(query) ||
          p.domaines.some((d) => d.toLowerCase().includes(query)) ||
          p.technologies.some((t) => t.toLowerCase().includes(query)),
      );
    }

    result.sort((a, b) => {
      const dateA = new Date(a.dateCreation).getTime();
      const dateB = new Date(b.dateCreation).getTime();
      return this.sortOrder === 'recent' ? dateB - dateA : dateA - dateB;
    });

    this.filtered = result;
  }

  private notifier(message: string): void {
    this.successMessage = message;
    setTimeout(() => (this.successMessage = ''), 4000);
  }
}
