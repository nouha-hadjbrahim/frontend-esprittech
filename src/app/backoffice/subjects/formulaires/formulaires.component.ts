import { CommonModule } from '@angular/common';
import { Component, OnDestroy, OnInit, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Subject, debounceTime, distinctUntilChanged, takeUntil } from 'rxjs';
import { ReferenceItem, ReferenceType } from '../../../core/models/sujet-reference.model';
import { SujetReferenceService } from '../../../core/services/sujet-reference.service';
import { ConfirmDialog } from '../../../shared/components/confirm-dialog/confirm-dialog';

interface TabConfig {
  type: ReferenceType;
  label: string;
  title: string;
  subtitle: string;
  singular: string;
  plural: string;
}

@Component({
  selector: 'app-formulaires',
  standalone: true,
  imports: [CommonModule, FormsModule, ConfirmDialog],
  templateUrl: './formulaires.component.html',
  styleUrl: './formulaires.component.css',
})
export class FormulairesComponent implements OnInit, OnDestroy {
  private readonly referenceService = inject(SujetReferenceService);
  private readonly destroy$ = new Subject<void>();
  private readonly search$ = new Subject<string>();

  readonly tabs: TabConfig[] = [
    {
      type: 'domaines',
      label: 'Domaines',
      title: 'Domaines',
      subtitle: "Domaines d'études et de recherche disponibles pour les sujets.",
      singular: 'domaine',
      plural: 'domaines',
    },
    {
      type: 'prerequis',
      label: 'Prérequis',
      title: 'Prérequis',
      subtitle: 'Compétences et aptitudes requises pour les sujets.',
      singular: 'prérequis',
      plural: 'prérequis',
    },
    {
      type: 'technologies',
      label: 'Technologies',
      title: 'Technologies',
      subtitle: 'Technologies informatiques proposées dans les formulaires.',
      singular: 'technologie',
      plural: 'technologies',
    },
  ];

  activeType: ReferenceType = 'domaines';
  counts = { domaines: 0, prerequis: 0, technologies: 0 };

  items: ReferenceItem[] = [];
  loading = false;
  loadError = '';

  page = 0;
  size = 12;
  totalPages = 0;
  totalElements = 0;
  first = true;
  last = true;
  searchTerm = '';

  isModalOpen = false;
  editingItem: ReferenceItem | null = null;
  modalNom = '';
  saving = false;
  modalError = '';

  deleteConfirmOpen = false;
  deleteAlertOpen = false;
  deleteAlertMessage = '';
  deleting = false;
  itemToDelete: ReferenceItem | null = null;

  get activeTab(): TabConfig {
    return this.tabs.find((t) => t.type === this.activeType) ?? this.tabs[0];
  }

  get countForActiveTab(): number {
    if (this.activeType === 'domaines') return this.counts.domaines;
    if (this.activeType === 'prerequis') return this.counts.prerequis;
    return this.counts.technologies;
  }

  ngOnInit(): void {
    this.search$
      .pipe(debounceTime(300), distinctUntilChanged(), takeUntil(this.destroy$))
      .subscribe((term) => {
        this.searchTerm = term;
        this.page = 0;
        this.loadItems();
      });
    this.loadCounts();
    this.loadItems();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  onSearchInput(value: string): void {
    this.search$.next(value);
  }

  navigateTab(tab: TabConfig): void {
    if (this.activeType === tab.type) {
      return;
    }
    this.activeType = tab.type;
    this.page = 0;
    this.searchTerm = '';
    this.loadItems();
  }

  openCreateModal(): void {
    this.editingItem = null;
    this.modalNom = '';
    this.modalError = '';
    this.isModalOpen = true;
  }

  openEditModal(item: ReferenceItem): void {
    this.editingItem = item;
    this.modalNom = item.nom;
    this.modalError = '';
    this.isModalOpen = true;
  }

  closeModal(): void {
    this.isModalOpen = false;
    this.editingItem = null;
    this.modalNom = '';
    this.modalError = '';
  }

  saveItem(): void {
    const nom = this.modalNom.trim();
    if (!nom) {
      this.modalError = 'Le nom est obligatoire.';
      return;
    }

    this.saving = true;
    this.modalError = '';

    const request = { nom };
    const operation = this.editingItem
      ? this.referenceService.update(this.activeType, this.editingItem.id, request)
      : this.referenceService.create(this.activeType, request);

    operation.subscribe({
      next: () => {
        this.saving = false;
        this.closeModal();
        this.loadCounts();
        this.loadItems();
      },
      error: (err) => {
        this.saving = false;
        this.modalError = err?.error?.detail ?? err?.error?.message ?? 'Erreur lors de l\'enregistrement.';
      },
    });
  }

  deleteItem(item: ReferenceItem): void {
    this.itemToDelete = item;
    this.deleteConfirmOpen = true;
  }

  cancelDelete(): void {
    this.deleteConfirmOpen = false;
    this.itemToDelete = null;
    this.deleting = false;
  }

  confirmDelete(): void {
    if (!this.itemToDelete) {
      return;
    }

    this.deleting = true;
    this.referenceService.delete(this.activeType, this.itemToDelete.id).subscribe({
      next: () => {
        this.deleting = false;
        this.deleteConfirmOpen = false;
        this.itemToDelete = null;
        this.loadCounts();
        if (this.items.length === 1 && this.page > 0) {
          this.page--;
        }
        this.loadItems();
      },
      error: () => {
        this.deleting = false;
        this.deleteConfirmOpen = false;
        this.deleteAlertMessage = 'Impossible de supprimer cet élément.';
        this.deleteAlertOpen = true;
        this.itemToDelete = null;
      },
    });
  }

  closeDeleteAlert(): void {
    this.deleteAlertOpen = false;
    this.deleteAlertMessage = '';
  }

  get deleteConfirmMessage(): string {
    return this.itemToDelete
      ? `Voulez-vous vraiment supprimer « ${this.itemToDelete.nom} » ? Cette action est irréversible.`
      : '';
  }

  goToPage(newPage: number): void {
    if (newPage < 0 || newPage >= this.totalPages) {
      return;
    }
    this.page = newPage;
    this.loadItems();
  }

  getInitial(nom: string): string {
    return nom.charAt(0).toUpperCase();
  }

  private loadCounts(): void {
    this.referenceService.getCounts().subscribe({
      next: (counts) => (this.counts = counts),
      error: () => {},
    });
  }

  private loadItems(): void {
    this.loading = true;
    this.loadError = '';
    this.referenceService.getPage(this.activeType, this.page, this.size, this.searchTerm).subscribe({
      next: (res) => {
        this.items = res.content;
        this.page = res.page;
        this.totalPages = res.totalPages;
        this.totalElements = res.totalElements;
        this.first = res.first;
        this.last = res.last;
        this.loading = false;
      },
      error: () => {
        this.loading = false;
        this.loadError = 'Impossible de charger les données. Vérifiez que le backend est démarré.';
      },
    });
  }
}
