import { Component, OnInit, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
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

type StatusTone = 'attente' | 'acceptee' | 'refusee' | 'neutral';

@Component({
  selector: 'app-mes-candidatures',
  imports: [FormsModule, RouterLink, FilterDropdown, ConfirmDialog],
  templateUrl: './mes-candidatures.html',
  styleUrl: './mes-candidatures.css',
})
export class MesCandidatures implements OnInit {
  private readonly candidatureService = inject(CandidatureService);

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

  get summary(): { total: number; enAttente: number; acceptees: number; refusees: number } {
    const list = this.candidatures;
    return {
      total: list.length,
      enAttente: list.filter((c) => c.statut === 'DEPOSEE').length,
      acceptees: list.filter((c) => c.statut === 'ACCEPTEE').length,
      refusees: list.filter((c) => c.statut === 'REFUSEE').length,
    };
  }

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

  statutTone(statut: StatutCandidature): StatusTone {
    switch (statut) {
      case 'ACCEPTEE':
        return 'acceptee';
      case 'REFUSEE':
        return 'refusee';
      case 'DEPOSEE':
        return 'attente';
      default:
        return 'neutral';
    }
  }

  getCategorieLabel(categorie?: string | null): string {
    if (!categorie) {
      return '—';
    }
    return CATEGORIE_LABELS[categorie as CategorieSujet]?.label ?? categorie;
  }

  getCategorieShortLabel(categorie?: string | null): string {
    const map: Record<string, string> = {
      PFE: 'PFE',
      RDI: 'RDI',
      STAGE_INGENIEUR: 'STAGE',
    };
    if (!categorie) return 'SUJET';
    return map[categorie] ?? categorie;
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

  formatDateLong(date: string | null | undefined): string {
    if (!date) return '—';
    const d = new Date(date);
    if (Number.isNaN(d.getTime())) return '—';
    return d.toLocaleDateString('fr-FR', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });
  }

  initials(name: string): string {
    const parts = name.trim().split(/\s+/).filter(Boolean);
    if (parts.length === 0) return '?';
    if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
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
}
