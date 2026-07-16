import { Component, OnInit, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { CategorieSujet, StatutSujet, SujetProjet } from '../../../core/models/sujet-projet.model';
import { SujetProjetService } from '../../../core/services/sujet-projet.service';
import { ValidationSujetListRow } from '../../components/sujets/validation-sujet-list-row/validation-sujet-list-row';
import { FilterDropdown } from '../../components/sujets/filter-dropdown/filter-dropdown';
import { ConfirmDialog } from '../../../shared/components/confirm-dialog/confirm-dialog';
import { FrontofficeEmptyState } from '../../components/frontoffice-empty-state/frontoffice-empty-state';
import { CATEGORIE_OPTIONS, STATUT_LABELS } from '../../constants/sujet-projet.constants';

const VALIDATION_STATUTS: StatutSujet[] = ['SOUMIS_EN_VALIDATION', 'EN_ATTENTE'];

@Component({
  selector: 'app-validation-sujets',
  imports: [FormsModule, ValidationSujetListRow, FilterDropdown, ConfirmDialog, FrontofficeEmptyState],
  templateUrl: './validation-sujets.html',
  styleUrl: './validation-sujets.css',
})
export class ValidationSujets implements OnInit {
  private readonly sujetProjetService = inject(SujetProjetService);

  sujets: SujetProjet[] = [];
  filteredSujets: SujetProjet[] = [];
  isLoading = true;
  loadError = '';
  searchQuery = '';
  selectedCategorie = '';
  selectedStatut = '';
  sortOrder = 'recent';

  validateConfirmOpen = false;
  rejectDialogOpen = false;
  rejectMotif = '';
  rejectError = '';
  actionLoading = false;
  sujetEnCours?: SujetProjet;
  actionAlertOpen = false;
  actionAlertMessage = '';

  readonly categorieOptions = [{ value: '', label: 'Tous les types' }, ...CATEGORIE_OPTIONS];
  readonly statutOptions = [
    { value: '', label: 'Tous les statuts' },
    ...VALIDATION_STATUTS.map((value) => ({
      value,
      label: STATUT_LABELS[value].label,
    })),
  ];
  readonly sortOptions = [
    { value: 'recent', label: 'Plus récents' },
    { value: 'ancien', label: 'Plus anciens' },
  ];

  get summary(): { total: number; enAttente: number; pfe: number; stage: number } {
    return {
      total: this.sujets.length,
      enAttente: this.sujets.filter(
        (s) => s.statut === 'SOUMIS_EN_VALIDATION' || s.statut === 'EN_ATTENTE',
      ).length,
      pfe: this.sujets.filter((s) => s.categorie === 'PFE').length,
      stage: this.sujets.filter((s) => s.categorie === 'STAGE_INGENIEUR').length,
    };
  }

  ngOnInit(): void {
    this.loadSujets();
  }

  loadSujets(): void {
    this.isLoading = true;
    this.loadError = '';
    const categorie = (this.selectedCategorie || undefined) as CategorieSujet | undefined;
    const statut = (this.selectedStatut || undefined) as StatutSujet | undefined;

    this.sujetProjetService.getSujetsAValider(categorie, statut).subscribe({
      next: (sujets) => {
        this.sujets = sujets;
        this.applyFilters();
        this.isLoading = false;
      },
      error: () => {
        this.sujets = [];
        this.filteredSujets = [];
        this.isLoading = false;
        this.loadError = 'Impossible de charger les demandes. Vérifiez que le backend est démarré et que vous êtes connecté en tant que chef d\'équipe.';
      },
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

  openValidateConfirm(sujet: SujetProjet): void {
    this.sujetEnCours = sujet;
    this.validateConfirmOpen = true;
  }

  cancelValidate(): void {
    this.validateConfirmOpen = false;
    this.sujetEnCours = undefined;
    this.actionLoading = false;
  }

  confirmValidate(): void {
    if (!this.sujetEnCours) return;

    this.actionLoading = true;
    this.sujetProjetService.validerSujet(this.sujetEnCours.id).subscribe({
      next: () => {
        this.actionLoading = false;
        this.validateConfirmOpen = false;
        this.sujetEnCours = undefined;
        this.loadSujets();
      },
      error: () => {
        this.actionLoading = false;
        this.validateConfirmOpen = false;
        this.actionAlertMessage = 'Impossible de valider ce sujet. Vérifiez que le backend est démarré.';
        this.actionAlertOpen = true;
        this.sujetEnCours = undefined;
      },
    });
  }

  openRejectDialog(sujet: SujetProjet): void {
    this.sujetEnCours = sujet;
    this.rejectMotif = '';
    this.rejectError = '';
    this.rejectDialogOpen = true;
  }

  cancelReject(): void {
    this.rejectDialogOpen = false;
    this.sujetEnCours = undefined;
    this.rejectMotif = '';
    this.rejectError = '';
    this.actionLoading = false;
  }

  confirmReject(): void {
    if (!this.sujetEnCours) return;

    const motif = this.rejectMotif.trim();
    if (!motif) {
      this.rejectError = 'Veuillez indiquer un motif de refus.';
      return;
    }

    this.actionLoading = true;
    this.rejectError = '';
    this.sujetProjetService.invaliderSujet(this.sujetEnCours.id, motif).subscribe({
      next: () => {
        this.actionLoading = false;
        this.rejectDialogOpen = false;
        this.sujetEnCours = undefined;
        this.rejectMotif = '';
        this.loadSujets();
      },
      error: () => {
        this.actionLoading = false;
        this.rejectDialogOpen = false;
        this.actionAlertMessage = 'Impossible de refuser ce sujet. Vérifiez que le backend est démarré.';
        this.actionAlertOpen = true;
        this.sujetEnCours = undefined;
      },
    });
  }

  closeActionAlert(): void {
    this.actionAlertOpen = false;
    this.actionAlertMessage = '';
  }

  isActionLoading(sujet: SujetProjet): boolean {
    return this.actionLoading && this.sujetEnCours?.id === sujet.id;
  }

  get validateConfirmMessage(): string {
    return this.sujetEnCours
      ? `Voulez-vous valider « ${this.sujetEnCours.titre} » ? Le sujet sera publié dans le catalogue.`
      : '';
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
          (s.encadrantEmail?.toLowerCase().includes(query) ?? false),
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
