import { CommonModule } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { Component, OnDestroy, OnInit, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { Subject, debounceTime, distinctUntilChanged, takeUntil } from 'rxjs';
import { CategorieSujet, StatutSujet, SujetProjet } from '../../core/models/sujet-projet.model';
import { AdminService } from '../../core/services/admin.service';
import { ConfirmDialog } from '../../shared/components/confirm-dialog/confirm-dialog';
import { DeposerSujetModal } from '../../frontoffice/components/sujets/deposer-sujet-modal/deposer-sujet-modal';
import { CATEGORIE_LABELS, MES_SUJETS_STATUT_STYLES, STATUT_LABELS } from '../../frontoffice/constants/sujet-projet.constants';

type SubjectTab = 'sujets' | 'demandes' | 'disponibles';

interface TabConfig {
  id: SubjectTab;
  label: string;
}

@Component({
  selector: 'app-subjects',
  standalone: true,
  imports: [CommonModule, FormsModule, ConfirmDialog, DeposerSujetModal],
  templateUrl: './subjects.component.html',
  styleUrl: './subjects.component.css',
})
export class SubjectsComponent implements OnInit, OnDestroy {
  private readonly adminService = inject(AdminService);
  private readonly router = inject(Router);
  private readonly destroy$ = new Subject<void>();
  private readonly search$ = new Subject<string>();

  readonly tabs: TabConfig[] = [
    { id: 'sujets', label: 'Sujets' },
    { id: 'demandes', label: 'Demandes' },
    { id: 'disponibles', label: 'Sujets disponibles' },
  ];

  activeTab: SubjectTab = 'sujets';
  sujets: SujetProjet[] = [];
  pendingCount: number | null = null;

  readonly loading = signal(false);
  readonly loadError = signal<string | null>(null);

  page = 0;
  size = 8;
  totalPages = 0;
  totalElements = 0;
  first = true;
  last = true;

  searchTerm = '';
  selectedCategorie = '';
  selectedStatut = '';

  validateConfirmOpen = false;
  rejectDialogOpen = false;
  rejectMotif = '';
  rejectError = '';
  actionLoading = false;
  sujetEnCours?: SujetProjet;
  actionAlertOpen = false;
  actionAlertMessage = '';

  deleteConfirmOpen = false;
  deleting = false;
  sujetToDelete: SujetProjet | null = null;

  editModalOpen = false;
  createModalOpen = false;
  sujetToEdit?: SujetProjet;

  readonly categorieOptions = [
    { value: '', label: 'Tous les types' },
    { value: 'STAGE_INGENIEUR', label: 'Stage' },
    { value: 'PFE', label: 'PFE' },
    { value: 'RDI', label: 'RDI' },
  ];

  readonly statutOptions = [
    { value: '', label: 'Tous les statuts' },
    ...Object.entries(STATUT_LABELS).map(([value, meta]) => ({
      value,
      label: meta.label,
    })),
  ];

  ngOnInit(): void {
    this.search$
      .pipe(debounceTime(300), distinctUntilChanged(), takeUntil(this.destroy$))
      .subscribe((term) => {
        this.searchTerm = term;
        this.page = 0;
        this.loadData();
      });
    this.loadData();
    this.loadPendingCount();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  get showStatutFilter(): boolean {
    return this.activeTab === 'sujets';
  }

  get showEquipeColumn(): boolean {
    return this.activeTab === 'sujets' || this.activeTab === 'disponibles';
  }

  get isDemandesTab(): boolean {
    return this.activeTab === 'demandes';
  }

  get emptyMessage(): string {
    if (this.activeTab === 'demandes') return 'Aucune demande en attente.';
    if (this.activeTab === 'disponibles') return 'Aucun sujet disponible dans le catalogue.';
    return 'Aucun sujet trouvé.';
  }

  get paginationLabel(): string {
    if (this.activeTab === 'demandes') return 'demande(s)';
    if (this.activeTab === 'disponibles') return 'sujet(s) disponible(s)';
    return 'sujet(s)';
  }

  switchTab(tab: SubjectTab): void {
    if (this.activeTab === tab) return;
    this.activeTab = tab;
    this.page = 0;
    this.selectedStatut = '';
    this.loadData();
  }

  onSearchInput(value: string): void {
    this.search$.next(value);
  }

  onCategorieFilter(value: string): void {
    this.selectedCategorie = value;
    this.page = 0;
    this.loadData();
  }

  onStatutFilter(value: string): void {
    this.selectedStatut = value;
    this.page = 0;
    this.loadData();
  }

  prevPage(): void {
    if (!this.first) {
      this.page--;
      this.loadData();
    }
  }

  nextPage(): void {
    if (!this.last) {
      this.page++;
      this.loadData();
    }
  }

  getInitial(titre: string): string {
    return titre.charAt(0).toUpperCase();
  }

  getCategorieLabel(categorie: CategorieSujet): string {
    return CATEGORIE_LABELS[categorie]?.label ?? categorie;
  }

  getCategorieClass(categorie: CategorieSujet): string {
    return CATEGORIE_LABELS[categorie]?.cssClass ?? 'badge--pfe';
  }

  getStatutLabel(statut: StatutSujet): string {
    return STATUT_LABELS[statut]?.label ?? statut;
  }

  getStatutClass(statut: StatutSujet): string {
    return MES_SUJETS_STATUT_STYLES[statut]?.listClass ?? 'badge--neutral';
  }

  viewDetails(sujet: SujetProjet): void {
    this.router.navigate(['/backoffice/subjects', sujet.id]);
  }

  editSujet(sujet: SujetProjet): void {
    this.adminService.getSujetById(sujet.id).subscribe({
      next: (full) => {
        this.sujetToEdit = full;
        this.editModalOpen = true;
      },
      error: () => {
        this.sujetToEdit = sujet;
        this.editModalOpen = true;
      },
    });
  }

  openCreateModal(): void {
    this.createModalOpen = true;
  }

  closeCreateModal(): void {
    this.createModalOpen = false;
  }

  onCreateSaved(): void {
    this.closeCreateModal();
    this.loadData();
    this.loadPendingCount();
  }

  closeEditModal(): void {
    this.editModalOpen = false;
    this.sujetToEdit = undefined;
  }

  onEditSaved(): void {
    this.closeEditModal();
    this.loadData();
  }

  deleteSujet(sujet: SujetProjet): void {
    this.sujetToDelete = sujet;
    this.deleteConfirmOpen = true;
  }

  cancelDelete(): void {
    this.deleteConfirmOpen = false;
    this.sujetToDelete = null;
    this.deleting = false;
  }

  confirmDelete(): void {
    if (!this.sujetToDelete) return;

    this.deleting = true;
    this.adminService.deleteSujet(this.sujetToDelete.id).subscribe({
      next: () => {
        this.deleting = false;
        this.deleteConfirmOpen = false;
        if (this.sujets.length === 1 && this.page > 0) {
          this.page--;
        }
        this.sujetToDelete = null;
        this.loadData();
        this.loadPendingCount();
      },
      error: (err: HttpErrorResponse) => {
        this.deleting = false;
        this.deleteConfirmOpen = false;
        this.actionAlertMessage = err.error?.detail ?? 'Échec de la suppression.';
        this.actionAlertOpen = true;
        this.sujetToDelete = null;
      },
    });
  }

  get deleteConfirmMessage(): string {
    return this.sujetToDelete
      ? `Voulez-vous vraiment supprimer « ${this.sujetToDelete.titre} » ? Cette action est irréversible.`
      : '';
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
    this.adminService.validerSujet(this.sujetEnCours.id).subscribe({
      next: () => {
        this.actionLoading = false;
        this.validateConfirmOpen = false;
        this.sujetEnCours = undefined;
        this.loadData();
        this.loadPendingCount();
      },
      error: (err: HttpErrorResponse) => {
        this.actionLoading = false;
        this.validateConfirmOpen = false;
        this.actionAlertMessage = err.error?.detail ?? 'Impossible d\'accepter cette demande.';
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
    this.adminService.invaliderSujet(this.sujetEnCours.id, motif).subscribe({
      next: () => {
        this.actionLoading = false;
        this.rejectDialogOpen = false;
        this.sujetEnCours = undefined;
        this.rejectMotif = '';
        this.loadData();
        this.loadPendingCount();
      },
      error: (err: HttpErrorResponse) => {
        this.actionLoading = false;
        this.rejectDialogOpen = false;
        this.actionAlertMessage = err.error?.detail ?? 'Impossible de refuser cette demande.';
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
      ? `Voulez-vous accepter « ${this.sujetEnCours.titre} » ? Le sujet sera publié dans le catalogue.`
      : '';
  }

  private loadData(): void {
    this.loading.set(true);
    this.loadError.set(null);

    const categorie = (this.selectedCategorie || undefined) as CategorieSujet | undefined;
    const statut = (this.selectedStatut || undefined) as StatutSujet | undefined;

    const request =
      this.activeTab === 'demandes'
        ? this.adminService.getDemandes(this.page, this.size, this.searchTerm, categorie)
        : this.activeTab === 'disponibles'
          ? this.adminService.getSujetsDisponibles(this.page, this.size, this.searchTerm, categorie)
          : this.adminService.getSujets(this.page, this.size, this.searchTerm, categorie, statut);

    request.subscribe({
      next: (res) => {
        this.sujets = this.filterClientSide(res.content);
        this.totalPages = res.totalPages;
        this.totalElements = res.totalElements;
        this.first = res.first;
        this.last = res.last;
        this.loading.set(false);
      },
      error: (err: HttpErrorResponse) => {
        this.loading.set(false);
        this.sujets = [];
        this.loadError.set(err.error?.detail ?? 'Impossible de charger les sujets.');
      },
    });
  }

  private loadPendingCount(): void {
    this.adminService.getDemandes(0, 1).subscribe({
      next: (res) => (this.pendingCount = res.totalElements),
      error: () => (this.pendingCount = null),
    });
  }

  private filterClientSide(items: SujetProjet[]): SujetProjet[] {
    const query = this.searchTerm.trim().toLowerCase();
    if (!query) return items;
    return items.filter(
      (s) =>
        s.titre.toLowerCase().includes(query) ||
        s.encadrantNom.toLowerCase().includes(query) ||
        (s.encadrantEmail?.toLowerCase().includes(query) ?? false) ||
        s.domaines.some((d) => d.toLowerCase().includes(query)),
    );
  }
}
