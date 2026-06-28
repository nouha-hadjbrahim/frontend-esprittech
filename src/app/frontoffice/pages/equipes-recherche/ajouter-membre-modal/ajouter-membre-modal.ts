import { Component, EventEmitter, Input, OnChanges, Output, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { debounceTime, distinctUntilChanged, Subject, switchMap } from 'rxjs';
import { EquipeService } from '../../../../core/services/equipe.service';
import { Equipe } from '../../../../core/models/equipe.model';
import { User } from '../../../../core/models/user.model';
import { Page } from '../../../../core/models/page.model';

@Component({
  selector: 'app-ajouter-membre-modal',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './ajouter-membre-modal.html',
  styleUrl: './ajouter-membre-modal.css',
})
export class AjouterMembreModal implements OnChanges {
  private readonly equipeSvc = inject(EquipeService);

  @Input() isOpen = false;
  @Input() equipe!: Equipe;
  @Output() closed = new EventEmitter<void>();
  @Output() saved = new EventEmitter<void>();

  searchQuery = '';
  users: User[] = [];
  selectedIds = new Set<number>();
  loading = false;
  errorMessage = '';

  private readonly search$ = new Subject<string>();

  constructor() {
    this.search$
      .pipe(
        debounceTime(300),
        distinctUntilChanged(),
        switchMap((q) => {
          this.loading = true;
          return this.equipeSvc.chercherUtilisateursEligibles(q, this.equipe?.id ?? null, 'enseignant', 0, 10);
        }),
      )
      .subscribe({
        next: (page: Page<User>) => {
          this.users = page.content ?? [];
          this.loading = false;
        },
        error: () => {
          this.users = [];
          this.loading = false;
          this.errorMessage = 'Erreur lors de la recherche.';
        },
      });
  }

  ngOnChanges(): void {
    if (this.isOpen) {
      this.searchQuery = '';
      this.users = [];
      this.selectedIds.clear();
      this.errorMessage = '';
      this.search$.next('');
    }
  }

  onSearchChange(value: string): void {
    this.searchQuery = value;
    this.search$.next(value);
  }

  toggleUser(id: number): void {
    if (this.selectedIds.has(id)) {
      this.selectedIds.delete(id);
    } else {
      this.selectedIds.add(id);
    }
  }

  close(): void {
    this.errorMessage = '';
    this.closed.emit();
  }

  onOverlayClick(event: MouseEvent): void {
    if ((event.target as HTMLElement).classList.contains('modal-overlay')) {
      this.close();
    }
  }

  ajouter(): void {
    if (this.selectedIds.size === 0) return;

    this.loading = true;
    this.errorMessage = '';

    this.equipeSvc.ajouterMembres(this.equipe.id, Array.from(this.selectedIds)).subscribe({
      next: () => {
        this.loading = false;
        this.saved.emit();
      },
      error: () => {
        this.loading = false;
        this.errorMessage = 'Erreur lors de l\'ajout des membres.';
      },
    });
  }

  initiales(u: User): string {
    return `${u.prenom} ${u.nom}`.trim().split(' ').map((p) => p[0]?.toUpperCase() ?? '').slice(0, 2).join('');
  }

  nomComplet(u: User): string {
    return `${u.prenom} ${u.nom}`;
  }
}
