import { CommonModule } from '@angular/common';
import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Livrable, LivrableUpdateRequest, TYPE_LIVRABLE_LABELS, TYPE_LIVRABLE_OPTIONS, TypeLivrable } from '../../core/models/livrable.model';
import { LivrableService } from '../../core/services/livrable.service';

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
  selectedType = signal('');
  selectedLivrable = signal<Livrable | null>(null);

  readonly typeOptions = TYPE_LIVRABLE_OPTIONS;
  readonly labels = TYPE_LIVRABLE_LABELS;

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

  ngOnInit(): void {
    this.load();
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
}
