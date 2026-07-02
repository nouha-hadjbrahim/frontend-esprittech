import { Component, Inject, inject, OnInit, OnDestroy, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatDialogModule, MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { MatSnackBar } from '@angular/material/snack-bar';
import { Subject, debounceTime, distinctUntilChanged, switchMap } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { finalize } from 'rxjs';
import { EquipeService } from '../../../core/services/equipe.service';
import { Equipe } from '../../../core/models/equipe.model';
import { User } from '../../../core/models/user.model';
import { ButtonComponent } from '../../../ui/button/button.component';

@Component({
  selector: 'app-dialogue-assigner-chef',
  standalone: true,
  imports: [CommonModule, FormsModule, MatDialogModule, MatIconModule, ButtonComponent],
  template: `
    <div class="modal">
      <div class="modal-header">
        <div class="modal-header-text">
          <h2 class="modal-title">Assigner un chef</h2>
          <p class="modal-subtitle">{{ eq.nom }}</p>
        </div>
        <button class="close-btn" (click)="ref.close()">
          <mat-icon>close</mat-icon>
        </button>
      </div>

      <div class="search-wrap">
        <mat-icon class="search-icon">search</mat-icon>
        <input
          class="search-input"
          [(ngModel)]="query"
          (ngModelChange)="search$.next($event)"
          placeholder="Chercher un enseignant…"
          autocomplete="off"
        />
        <div *ngIf="chargement" class="search-spinner"></div>
      </div>

      <div class="results" #resultsContainer>
        <div *ngIf="chargement && candidats.length === 0" class="empty-state">
          <div class="search-spinner-lg"></div>
          <p class="empty-text">Chargement des utilisateurs…</p>
        </div>

        <div *ngIf="!chargement && candidats.length === 0" class="empty-state">
          <mat-icon class="empty-icon">search_off</mat-icon>
          <p class="empty-text">{{ query ? 'Aucun résultat pour "' + query + '"' : 'Aucun utilisateur éligible' }}</p>
        </div>

        <div
          *ngFor="let u of candidats; let i = index"
          class="user-card"
          [class.selected]="candidat.length && candidat[0].id === u.id"
          [style.animation-delay]="i * 40 + 'ms'"
          (click)="selectionner(u)"
        >
          <div class="card-left">
            <span class="card-avatar" [style.background]="couleurAvatar(u)">{{ initiales(u) }}</span>
          </div>
          <div class="card-body">
            <span class="card-name">{{ u.prenom }} {{ u.nom }}</span>
            <span class="card-email">{{ u.email }}</span>
          </div>
          <span class="card-badge">{{ u.role === 'ROLE_CHEF_EQUIPE' ? 'Chef' : 'Enseignant' }}</span>
          <div *ngIf="candidat.length && candidat[0].id === u.id" class="check-badge">
            <mat-icon>check</mat-icon>
          </div>
        </div>
      </div>

      <div class="modal-footer">
        <button app-button variant="outline" (click)="ref.close()">Annuler</button>
        <button
          app-button variant="default"
          (click)="confirmer()"
          [disabled]="!candidat.length || chargement"
        >
          <mat-icon class="btn-icon">check</mat-icon> Confirmer
        </button>
      </div>
    </div>
  `,
  styles: [`
    :host { display: block; }
    .modal {
      display: flex;
      flex-direction: column;
      height: 80vh;
      max-height: 640px;
      padding: 0;
      overflow: hidden;
    }

    /* ── Header ── */
    .modal-header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      padding: 1.5rem 1.5rem 0;
      flex-shrink: 0;
    }
    .modal-header-text { min-width: 0; }
    .modal-title {
      margin: 0;
      font-size: 1.25rem;
      font-weight: 700;
      color: var(--foreground, #111827);
      line-height: 1.3;
    }
    .modal-subtitle {
      margin: 0.25rem 0 0;
      font-size: 0.875rem;
      color: var(--muted-foreground, #6b7280);
    }
    .close-btn {
      background: none;
      border: none;
      color: var(--muted-foreground, #9ca3af);
      cursor: pointer;
      padding: 0.25rem;
      border-radius: 8px;
      display: flex;
      transition: background 0.15s, color 0.15s;
      flex-shrink: 0;
    }
    .close-btn:hover { background: var(--muted, #f3f4f6); color: var(--foreground, #374151); }
    .close-btn mat-icon { font-size: 20px; width: 20px; height: 20px; }

    /* ── Search ── */
    .search-wrap {
      position: relative;
      margin: 1rem 1.5rem 0;
      flex-shrink: 0;
    }
    .search-icon {
      position: absolute;
      left: 0.75rem;
      top: 50%;
      transform: translateY(-50%);
      font-size: 18px;
      width: 18px;
      height: 18px;
      color: var(--muted-foreground, #9ca3af);
      pointer-events: none;
    }
    .search-input {
      width: 100%;
      height: 2.5rem;
      padding: 0 0.75rem 0 2.5rem;
      border: 1px solid var(--border, #e5e7eb);
      border-radius: 12px;
      background: var(--background, #fff);
      font-size: 0.875rem;
      font-family: inherit;
      color: var(--foreground, #111827);
      outline: none;
      box-sizing: border-box;
      transition: border-color 0.2s, box-shadow 0.2s;
    }
    .search-input::placeholder { color: var(--muted-foreground, #9ca3af); }
    .search-input:focus {
      border-color: #3b82f6;
      box-shadow: 0 0 0 3px rgba(59,130,246,0.15);
    }
    .search-spinner {
      position: absolute;
      right: 0.75rem;
      top: 50%;
      transform: translateY(-50%);
      width: 16px;
      height: 16px;
      border: 2px solid var(--border, #e5e7eb);
      border-top-color: var(--primary, #E63946);
      border-radius: 50%;
      animation: spin 0.6s linear infinite;
    }
    .search-spinner-lg {
      width: 28px;
      height: 28px;
      border: 3px solid var(--border, #e5e7eb);
      border-top-color: var(--primary, #E63946);
      border-radius: 50%;
      animation: spin 0.6s linear infinite;
    }
    @keyframes spin { to { transform: translateY(-50%) rotate(360deg); } }

    /* ── Results (scrollable) ── */
    .results {
      flex: 1;
      overflow-y: auto;
      overflow-x: hidden;
      min-height: 0;
      padding: 0.75rem 1.5rem 1rem;
      margin-top: 0.5rem;

      scrollbar-width: thin;
      scrollbar-color: rgba(0,0,0,0.15) transparent;
      scroll-behavior: smooth;
    }
    .results::-webkit-scrollbar { width: 6px; }
    .results::-webkit-scrollbar-track { background: transparent; }
    .results::-webkit-scrollbar-thumb { background: rgba(0,0,0,0.15); border-radius: 3px; }
    .results::-webkit-scrollbar-thumb:hover { background: rgba(0,0,0,0.25); }

    /* ── Empty state ── */
    .empty-state {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      height: 100%;
      min-height: 120px;
      gap: 0.5rem;
      opacity: 0.6;
    }
    .empty-icon { font-size: 36px; width: 36px; height: 36px; color: var(--muted-foreground, #9ca3af); }
    .empty-text { margin: 0; font-size: 0.8125rem; color: var(--muted-foreground, #9ca3af); text-align: center; }

    /* ── User card ── */
    .user-card {
      display: flex;
      align-items: center;
      gap: 0.75rem;
      padding: 0.625rem 0.75rem;
      margin-bottom: 0.375rem;
      border-radius: 14px;
      background: var(--background, #fff);
      border: 1.5px solid transparent;
      cursor: pointer;
      transition: transform 0.2s, box-shadow 0.2s, border-color 0.2s, background 0.2s;
      animation: cardIn 0.25s ease both;
      position: relative;
    }
    .user-card:hover {
      transform: scale(1.01);
      background: var(--muted, #f9fafb);
      box-shadow: 0 4px 12px rgba(0,0,0,0.06);
    }
    .user-card.selected {
      border-color: #3b82f6;
      background: #eff6ff;
      box-shadow: 0 0 0 3px rgba(59,130,246,0.12);
    }
    @keyframes cardIn {
      from { opacity: 0; transform: translateY(8px); }
      to   { opacity: 1; transform: translateY(0); }
    }

    .card-left { flex-shrink: 0; }
    .card-avatar {
      display: inline-grid;
      place-items: center;
      width: 36px;
      height: 36px;
      border-radius: 50%;
      font-size: 12px;
      font-weight: 600;
      color: #fff;
      box-shadow: 0 2px 6px rgba(0,0,0,0.12);
    }
    .card-body {
      flex: 1;
      min-width: 0;
      display: flex;
      flex-direction: column;
      gap: 0.125rem;
    }
    .card-name {
      font-size: 0.8125rem;
      font-weight: 600;
      color: var(--foreground, #111827);
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }
    .card-email {
      font-size: 0.6875rem;
      color: var(--muted-foreground, #6b7280);
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }
    .card-badge {
      flex-shrink: 0;
      font-size: 0.625rem;
      font-weight: 600;
      padding: 0.125rem 0.625rem;
      height: 1.25rem;
      display: inline-flex;
      align-items: center;
      border-radius: 999px;
      background: var(--muted, #f3f4f6);
      color: var(--muted-foreground, #6b7280);
      border: 1px solid var(--border, #e5e7eb);
    }
    .check-badge {
      flex-shrink: 0;
      width: 22px;
      height: 22px;
      border-radius: 50%;
      background: #3b82f6;
      color: #fff;
      display: flex;
      align-items: center;
      justify-content: center;
    }
    .check-badge mat-icon { font-size: 14px; width: 14px; height: 14px; }

    /* ── Footer ── */
    .modal-footer {
      display: flex;
      justify-content: flex-end;
      gap: 0.5rem;
      padding: 0 1.5rem 1.5rem;
      flex-shrink: 0;
    }
    .btn-icon { font-size: 16px; width: 16px; height: 16px; }
  `],
})
export class DialogueAssignerChefComponent implements OnInit, OnDestroy {
  private readonly svc = inject(EquipeService);
  private readonly snack = inject(MatSnackBar);
  private readonly destroy$ = new Subject<void>();

  candidat: User[] = [];
  candidats: User[] = [];
  chargement = false;
  query = '';

  readonly search$ = new Subject<string>();

  constructor(
    public ref: MatDialogRef<DialogueAssignerChefComponent>,
    @Inject(MAT_DIALOG_DATA) public eq: Equipe,
  ) {}

  ngOnInit() {
    this.chargement = true;
    this.svc.chercherUtilisateursEligibles('', this.eq.id, 'CHEF', 0, 100).subscribe({
      next: (res) => { this.candidats = res.content; this.chargement = false; },
      error: () => { this.chargement = false; this.snack.open('Erreur lors du chargement', '✕', { duration: 3500, panelClass: ['snack-error'] }); },
    });

    this.search$.pipe(
      debounceTime(300),
      distinctUntilChanged(),
      switchMap((q) => {
        this.chargement = true;
        return this.svc.chercherUtilisateursEligibles(q, this.eq.id, 'CHEF', 0, 100);
      }),
      takeUntil(this.destroy$),
    ).subscribe((res) => {
      this.chargement = false;
      this.candidats = res.content;
    });
  }

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
  }

  selectionner(u: User) {
    if (this.candidat.length && this.candidat[0].id === u.id) {
      this.candidat = [];
    } else {
      this.candidat = [u];
    }
  }

  confirmer() {
    const chef = this.candidat[0];
    if (!chef) return;
    this.chargement = true;
    this.svc.assignerChef(this.eq.id, chef.id).pipe(finalize(() => (this.chargement = false))).subscribe({
      next: (updated) => {
        this.snack.open('Chef assigné avec succès', '✕', { duration: 3500, panelClass: ['snack-success'] });
        this.ref.close(updated);
      },
      error: () => {
        this.snack.open("Erreur lors de l'assignation du chef", '✕', { duration: 3500, panelClass: ['snack-error'] });
      },
    });
  }

  initiales(u: User): string {
    return `${u.prenom ?? ''} ${u.nom ?? ''}`.trim().split(' ').map((p) => p[0]?.toUpperCase() ?? '').slice(0, 2).join('');
  }

  couleurAvatar(u: User): string {
    const colors = ['#E63946', '#0ea5e9', '#10b981', '#f59e0b', '#6366f1', '#8b5cf6', '#ec4899'];
    const idx = String(u.id).split('').reduce((a, c) => a + c.charCodeAt(0), 0) % colors.length;
    return colors[idx];
  }
}
