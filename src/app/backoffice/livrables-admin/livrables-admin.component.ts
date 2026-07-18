import { CommonModule } from '@angular/common';
import { Component, HostListener, OnInit, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Livrable, LivrableUpdateRequest, TYPE_LIVRABLE_LABELS, TYPE_LIVRABLE_OPTIONS, TypeLivrable } from '../../core/models/livrable.model';
import { LivrableService } from '../../core/services/livrable.service';

type FilterKey = 'type';
type TypeFilter = '' | TypeLivrable;

@Component({
  selector: 'app-livrables-admin',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './livrables-admin.component.html',
  styleUrl: './livrables-admin.component.css',
})
export class LivrablesAdminComponent implements OnInit {
  private readonly service = inject(LivrableService);

  livrables = signal<Livrable[]>([]);
  loading = signal(false);
  error = signal<string | null>(null);
  message = signal<string | null>(null);
  query = signal('');
  selectedType = signal<TypeFilter>('');
  openFilter = signal<FilterKey | null>(null);
  selectedLivrable = signal<Livrable | null>(null);

  readonly pageSize = 8;
  currentPage = signal(1);

  readonly typeOptions = TYPE_LIVRABLE_OPTIONS;
  readonly labels = TYPE_LIVRABLE_LABELS;

  readonly typeFilterOptions: { value: TypeFilter; label: string }[] = [
    { value: '', label: 'Tous les types' },
    ...TYPE_LIVRABLE_OPTIONS,
  ];

  editForm = {
    typeLivrable: 'DOCUMENTATION' as TypeLivrable,
    nom: '',
    description: '',
    lienExterne: '',
    actif: true,
  };

  filteredLivrables = computed(() => {
    const q = this.query().trim().toLowerCase();
    const type = this.selectedType();
    return this.livrables().filter((livrable) => {
      const matchesType = !type || livrable.typeLivrable === type;
      const matchesQuery = !q
        || livrable.nom.toLowerCase().includes(q)
        || livrable.projetTitre.toLowerCase().includes(q)
        || livrable.deposantNom.toLowerCase().includes(q);
      return matchesType && matchesQuery;
    });
  });

  readonly statsCards = computed(() => {
    const all = this.livrables();
    return [
      { label: 'Total livrables', value: all.length, icon: 'total' as const },
      { label: 'Actifs', value: all.filter((l) => l.actif).length, icon: 'active' as const },
      { label: 'Fichiers', value: all.filter((l) => !!l.objectName).length, icon: 'file' as const },
      { label: 'Liens externes', value: all.filter((l) => !!l.lienExterne && !l.objectName).length, icon: 'link' as const },
    ];
  });

  get totalPages(): number {
    return Math.max(1, Math.ceil(this.filteredLivrables().length / this.pageSize));
  }

  get pageNumbers(): number[] {
    return Array.from({ length: this.totalPages }, (_, i) => i + 1);
  }

  get visibleLivrables(): Livrable[] {
    const start = (this.currentPage() - 1) * this.pageSize;
    return this.filteredLivrables().slice(start, start + this.pageSize);
  }

  get typeFilterLabel(): string {
    return this.typeFilterOptions.find((o) => o.value === this.selectedType())?.label ?? 'Tous les types';
  }

  ngOnInit(): void {
    this.load();
  }

  @HostListener('document:click')
  closeFiltersOnOutsideClick(): void {
    this.openFilter.set(null);
  }

  toggleFilter(filter: FilterKey, event: Event): void {
    event.stopPropagation();
    this.openFilter.update((current) => (current === filter ? null : filter));
  }

  selectTypeFilter(value: TypeFilter): void {
    this.selectedType.set(value);
    this.openFilter.set(null);
    this.currentPage.set(1);
  }

  updateSearch(value: string): void {
    this.query.set(value);
    this.currentPage.set(1);
  }

  goToPage(page: number): void {
    this.currentPage.set(Math.min(Math.max(page, 1), this.totalPages));
  }

  load(): void {
    this.loading.set(true);
    this.service.findAllAdmin().subscribe({
      next: (livrables) => {
        this.livrables.set(livrables);
        this.loading.set(false);
      },
      error: () => {
        this.error.set('Impossible de charger les livrables.');
        this.loading.set(false);
      },
    });
  }

  openEdit(livrable: Livrable): void {
    this.selectedLivrable.set(livrable);
    this.editForm = {
      typeLivrable: livrable.typeLivrable,
      nom: livrable.nom,
      description: livrable.description ?? '',
      lienExterne: livrable.lienExterne ?? '',
      actif: livrable.actif,
    };
  }

  closeEdit(): void {
    this.selectedLivrable.set(null);
  }

  saveEdit(): void {
    const livrable = this.selectedLivrable();
    if (!livrable || !this.editForm.nom.trim()) {
      this.error.set('Le nom est obligatoire.');
      return;
    }
    const request: LivrableUpdateRequest = {
      typeLivrable: this.editForm.typeLivrable,
      nom: this.editForm.nom.trim(),
      description: this.editForm.description.trim() || null,
      lienExterne: this.editForm.lienExterne.trim() || null,
      actif: this.editForm.actif,
    };
    this.service.updateAdmin(livrable.id, request).subscribe({
      next: () => {
        this.message.set('Livrable mis a jour.');
        this.closeEdit();
        this.load();
        setTimeout(() => this.message.set(null), 2500);
      },
      error: (err) => this.error.set(err?.error?.detail ?? 'Mise a jour impossible.'),
    });
  }

  delete(livrable: Livrable): void {
    this.service.deleteAdmin(livrable.id).subscribe({
      next: () => {
        this.message.set('Livrable desactive.');
        this.load();
        setTimeout(() => this.message.set(null), 2500);
      },
      error: () => this.error.set('Suppression impossible.'),
    });
  }

  download(livrable: Livrable): string {
    return this.service.downloadUrl(livrable.id);
  }

  formatSize(size: number | null): string {
    if (!size) return '-';
    if (size < 1024 * 1024) return `${Math.round(size / 1024)} Ko`;
    return `${(size / (1024 * 1024)).toFixed(1)} Mo`;
  }

  typeBadgeClass(type: TypeLivrable): string {
    switch (type) {
      case 'DOCUMENTATION':
        return 'badge--doc';
      case 'CODE_SOURCE':
        return 'badge--code';
      case 'LIEN_GIT':
        return 'badge--git';
      case 'RAPPORT':
        return 'badge--rapport';
      case 'PRESENTATION':
        return 'badge--presentation';
      case 'IMAGE':
        return 'badge--image';
      case 'FICHIER_TXT':
        return 'badge--txt';
      default:
        return 'badge--autre';
    }
  }

  typeDotClass(type: TypeLivrable): string {
    switch (type) {
      case 'DOCUMENTATION':
        return 'dot-doc';
      case 'CODE_SOURCE':
        return 'dot-code';
      case 'LIEN_GIT':
        return 'dot-git';
      case 'RAPPORT':
        return 'dot-rapport';
      case 'PRESENTATION':
        return 'dot-presentation';
      case 'IMAGE':
        return 'dot-image';
      case 'FICHIER_TXT':
        return 'dot-txt';
      default:
        return 'dot-autre';
    }
  }
}
