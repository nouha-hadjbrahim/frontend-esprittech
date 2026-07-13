import { Component, OnInit, inject } from '@angular/core';
import { DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { MatSnackBar } from '@angular/material/snack-bar';
import { Candidature, StatutCandidature } from '../../../core/models/candidature.model';
import { CategorieSujet } from '../../../core/models/sujet-projet.model';
import { CandidatureService } from '../../../core/services/candidature.service';
import { FilterDropdown } from '../../components/sujets/filter-dropdown/filter-dropdown';
import { ConfirmDialog } from '../../../shared/components/confirm-dialog/confirm-dialog';
import {
  CATEGORIE_LABELS,
  CATEGORIE_OPTIONS,
  STATUT_CANDIDATURE_LABELS,
} from '../../constants/sujet-projet.constants';

@Component({
  selector: 'app-mes-candidatures',
  imports: [FormsModule, RouterLink, DatePipe, FilterDropdown, ConfirmDialog],
  templateUrl: './mes-candidatures.html',
  styleUrl: './mes-candidatures.css',
})
export class MesCandidatures implements OnInit {
  private readonly candidatureService = inject(CandidatureService);
  private readonly snack = inject(MatSnackBar);

  candidatures: Candidature[] = [];
  filteredCandidatures: Candidature[] = [];
  isLoading = true;
  loadError = '';
  searchQuery = '';
  selectedStatut = '';
  selectedCategorie = '';
  sortOrder = 'recent';

  deleteConfirmOpen = false;
  deleting = false;
  candidatureToDelete?: Candidature;
  actionAlertOpen = false;
  actionAlertMessage = '';

  readonly statutOptions = [
    { value: '', label: 'Tous les statuts' },
  ...Object.entries(STATUT_CANDIDATURE_LABELS).map(([value, info]) => ({
      value,
      label: info.label,
    })),
  ];

  readonly categorieOptions = [
    { value: '', label: 'Tous les types' },
    ...CATEGORIE_OPTIONS,
  ];

  readonly sortOptions = [
    { value: 'recent', label: 'Plus récentes' },
    { value: 'ancien', label: 'Plus anciennes' },
  ];

  ngOnInit(): void {
    this.loadCandidatures();
  }

  loadCandidatures(): void {
    this.isLoading = true;
    this.loadError = '';

    this.candidatureService.getMesCandidatures().subscribe({
      next: (candidatures) => {
        this.candidatures = candidatures.filter((c) => c.statut !== 'ARCHIVEE');
        this.applyFilters();
        this.isLoading = false;
      },
      error: () => {
        this.candidatures = [];
        this.filteredCandidatures = [];
        this.isLoading = false;
        this.loadError = 'Impossible de charger vos candidatures. Vérifiez que le backend est démarré.';
      },
    });
  }

  onStatutChange(value: string): void {
    this.selectedStatut = value;
    this.applyFilters();
  }

  onCategorieChange(value: string): void {
    this.selectedCategorie = value;
    this.applyFilters();
  }

  onSortChange(value: string): void {
    this.sortOrder = value;
    this.applyFilters();
  }

  onSearchChange(): void {
    this.applyFilters();
  }

  canRetirer(candidature: Candidature): boolean {
    return candidature.statut === 'DEPOSEE';
  }

  openDeleteConfirm(candidature: Candidature): void {
    this.candidatureToDelete = candidature;
    this.deleteConfirmOpen = true;
  }

  cancelDelete(): void {
    this.deleteConfirmOpen = false;
    this.candidatureToDelete = undefined;
    this.deleting = false;
  }

  confirmDelete(): void {
    if (!this.candidatureToDelete) {
      return;
    }

    this.deleting = true;
    this.candidatureService.retirerMaCandidature(this.candidatureToDelete.id).subscribe({
      next: () => {
        this.deleting = false;
        this.deleteConfirmOpen = false;
        this.candidatureToDelete = undefined;
        this.loadCandidatures();
        this.toast('Candidature retirée avec succès', 'succes');
      },
      error: () => {
        this.deleting = false;
        this.deleteConfirmOpen = false;
        this.actionAlertMessage = 'Impossible de retirer cette candidature.';
        this.actionAlertOpen = true;
        this.candidatureToDelete = undefined;
      },
    });
  }

  closeActionAlert(): void {
    this.actionAlertOpen = false;
    this.actionAlertMessage = '';
  }

  getStatutLabel(statut: StatutCandidature): string {
    if (statut === 'ARCHIVEE') {
      return '';
    }
    return STATUT_CANDIDATURE_LABELS[statut as keyof typeof STATUT_CANDIDATURE_LABELS]?.label ?? statut;
  }

  getStatutClass(statut: StatutCandidature): string {
    if (statut === 'ARCHIVEE') {
      return 'badge--neutral';
    }
    return STATUT_CANDIDATURE_LABELS[statut as keyof typeof STATUT_CANDIDATURE_LABELS]?.cssClass ?? 'badge--neutral';
  }

  getCategorieLabel(categorie?: string | null): string {
    if (!categorie) {
      return '—';
    }
    return CATEGORIE_LABELS[categorie as CategorieSujet]?.label ?? categorie;
  }

  getCategorieClass(categorie?: string | null): string {
    if (!categorie) {
      return 'badge--neutral';
    }
    return CATEGORIE_LABELS[categorie as CategorieSujet]?.cssClass ?? 'badge--neutral';
  }

  getSujetTitre(candidature: Candidature): string {
    return candidature.sujetTitre?.trim() || `Sujet #${candidature.sujetId}`;
  }

  get deleteConfirmMessage(): string {
    if (!this.candidatureToDelete) {
      return '';
    }
    return `Voulez-vous retirer votre candidature pour « ${this.getSujetTitre(this.candidatureToDelete)} » ?`;
  }

  private applyFilters(): void {
    let result = [...this.candidatures];

    if (this.searchQuery.trim()) {
      const query = this.searchQuery.toLowerCase();
      result = result.filter((c) => {
        const titre = this.getSujetTitre(c).toLowerCase();
        const encadrant = c.encadrantNom?.toLowerCase() ?? '';
        const message = c.messageEtudiant?.toLowerCase() ?? '';
        return titre.includes(query) || encadrant.includes(query) || message.includes(query);
      });
    }

    if (this.selectedStatut) {
      result = result.filter((c) => c.statut === this.selectedStatut);
    }

    if (this.selectedCategorie) {
      result = result.filter((c) => c.sujetCategorie === this.selectedCategorie);
    }

    result.sort((a, b) => {
      const dateA = new Date(a.dateDepot).getTime();
      const dateB = new Date(b.dateDepot).getTime();
      return this.sortOrder === 'recent' ? dateB - dateA : dateA - dateB;
    });

    this.filteredCandidatures = result;
  }

  private toast(msg: string, type: 'succes' | 'erreur' = 'erreur') {
    this.snack.open(msg, '✕', {
      duration: 3500,
      panelClass: type === 'succes' ? ['snack-success'] : ['snack-error'],
    });
  }
}
