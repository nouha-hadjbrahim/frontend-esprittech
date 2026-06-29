import { CommonModule } from '@angular/common';
import { Component, OnInit, inject } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { SujetProjet } from '../../../core/models/sujet-projet.model';
import { AdminService } from '../../../core/services/admin.service';
import { ConfirmDialog } from '../../../shared/components/confirm-dialog/confirm-dialog';
import { DeposerSujetModal } from '../../../frontoffice/components/sujets/deposer-sujet-modal/deposer-sujet-modal';
import { CATEGORIE_LABELS, STATUT_LABELS } from '../../../frontoffice/constants/sujet-projet.constants';

@Component({
  selector: 'app-subject-detail',
  standalone: true,
  imports: [CommonModule, RouterLink, ConfirmDialog, DeposerSujetModal],
  templateUrl: './subject-detail.component.html',
  styleUrl: './subject-detail.component.css',
})
export class SubjectDetailComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly adminService = inject(AdminService);

  sujet: SujetProjet | null = null;
  isLoading = true;
  loadError = '';

  deleteConfirmOpen = false;
  deleting = false;

  editModalOpen = false;

  readonly techColorClasses = ['tag--green', 'tag--purple', 'tag--yellow', 'tag--teal'];

  ngOnInit(): void {
    const id = Number(this.route.snapshot.paramMap.get('id'));
    this.adminService.getSujetById(id).subscribe({
      next: (sujet) => {
        this.sujet = sujet;
        this.isLoading = false;
      },
      error: () => {
        this.loadError = 'Impossible de charger ce sujet.';
        this.isLoading = false;
      },
    });
  }

  get categorieLabel(): string {
    return this.sujet ? (CATEGORIE_LABELS[this.sujet.categorie]?.label ?? this.sujet.categorie) : '';
  }

  get statutLabel(): string {
    return this.sujet ? (STATUT_LABELS[this.sujet.statut]?.label ?? this.sujet.statut) : '';
  }

  getStatutClass(statut: SujetProjet['statut']): string {
    const cssClass = STATUT_LABELS[statut]?.cssClass ?? 'badge--neutral';
    switch (cssClass) {
      case 'badge--success': return 'status-success';
      case 'badge--danger': return 'status-danger';
      case 'badge--warning':
      case 'badge--progress': return 'status-warning';
      case 'badge--info': return 'status-info';
      default: return 'status-neutral';
    }
  }

  getObjectifLines(): string[] {
    if (!this.sujet) return [];
    const lines = this.sujet.objectifs.split('\n').map((l) => l.trim()).filter(Boolean);
    return lines.length > 0 ? lines : [this.sujet.objectifs];
  }

  getTechColor(index: number): string {
    return this.techColorClasses[index % this.techColorClasses.length];
  }

  formatDate(iso: string | null): string {
    if (!iso) return '—';
    return iso.substring(0, 10);
  }

  openEditModal(): void {
    this.editModalOpen = true;
  }

  closeEditModal(): void {
    this.editModalOpen = false;
  }

  onEditSaved(): void {
    this.closeEditModal();
    if (!this.sujet) return;
    this.adminService.getSujetById(this.sujet.id).subscribe({
      next: (sujet) => (this.sujet = sujet),
    });
  }

  openDeleteConfirm(): void {
    this.deleteConfirmOpen = true;
  }

  cancelDelete(): void {
    this.deleteConfirmOpen = false;
    this.deleting = false;
  }

  confirmDelete(): void {
    if (!this.sujet) return;

    this.deleting = true;
    this.adminService.deleteSujet(this.sujet.id).subscribe({
      next: () => {
        this.deleting = false;
        this.deleteConfirmOpen = false;
        this.router.navigate(['/backoffice/subjects']);
      },
      error: () => {
        this.deleting = false;
        this.deleteConfirmOpen = false;
        this.loadError = 'Échec de la suppression.';
      },
    });
  }

  get deleteConfirmMessage(): string {
    return this.sujet
      ? `Voulez-vous vraiment supprimer « ${this.sujet.titre} » ? Cette action est irréversible.`
      : '';
  }
}
