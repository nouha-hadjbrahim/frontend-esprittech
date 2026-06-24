import { Component, Inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatDialogRef, MAT_DIALOG_DATA, MatDialogModule } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { Equipe } from '../../../core/models/equipe.model';
import { ButtonComponent } from '../../../ui/button/button.component';
import { BadgeComponent } from '../../../ui/badge/badge.component';

@Component({
  selector: 'app-dialogue-details-equipe',
  standalone: true,
  imports: [CommonModule, MatDialogModule, MatIconModule, ButtonComponent, BadgeComponent],
  template: `
    <div class="dlg-wrap" *ngIf="eq">
      <div class="dlg-header">
        <div>
          <h2 class="dlg-title">{{ eq.nom }}</h2>
          <p class="dlg-desc">{{ eq.description }}</p>
        </div>
        <app-badge variant="outline" [class.badge-success]="eq.statut === 'Actif'">
          {{ eq.statut }}
        </app-badge>
      </div>

      <div class="dlg-body">
        <div class="tiles">
          <div class="tile">
            <span class="tile-lbl"><mat-icon class="ti">domain</mat-icon>Domaine</span>
            <span class="tile-val">{{ eq.domaine }}</span>
          </div>
          <div class="tile">
            <span class="tile-lbl"><mat-icon class="ti">group</mat-icon>Membres</span>
            <span class="tile-val">{{ eq.nbMembres }}</span>
          </div>
          <div class="tile">
            <span class="tile-lbl"><mat-icon class="ti">calendar_today</mat-icon>Créée le</span>
            <span class="tile-val">{{ eq.createdAt }}</span>
          </div>
          <div class="tile" [class.tile-chef]="!!eq.chef">
            <span class="tile-lbl"><mat-icon class="ti">star</mat-icon>Chef</span>
            <span class="tile-val">{{ eq.chef ? (eq.chef.prenom + ' ' + eq.chef.nom) : '—' }}</span>
          </div>
        </div>

        <div class="contact-bar" *ngIf="eq.emailChef || eq.chef?.email">
          <mat-icon class="ci">mail</mat-icon>
          <span class="cl">Contact :</span>
          <span class="cv">{{ eq.emailChef || eq.chef?.email }}</span>
        </div>

        <div class="warn-bar" *ngIf="!eq.chef">
          <mat-icon class="wi">person_add</mat-icon>
          Aucun chef d'équipe désigné. Cliquez sur Modifier pour en choisir un.
        </div>
      </div>

      <div class="dlg-footer">
        <button app-button variant="outline" (click)="ref.close()">Fermer</button>
        <button app-button variant="default" (click)="ref.close('edit')">
          <mat-icon class="btn-i">edit</mat-icon>
          Modifier
        </button>
      </div>
    </div>
  `,
  styles: [`
    :host { display: block; max-width: 32rem; }
    .dlg-wrap { padding: 1.5rem; }
    .dlg-header { display: flex; align-items: flex-start; justify-content: space-between; gap: 0.75rem; margin-bottom: 1rem; }
    .dlg-title { margin: 0; font-size: 1.25rem; font-weight: 600; }
    .dlg-desc { margin: 0.25rem 0 0; font-size: 0.875rem; color: var(--muted-foreground); }
    .badge-success {
      background: #f0fdf4 !important;
      color: #16a34a !important;
      border-color: #bbf7d0 !important;
    }

    .dlg-body { display: flex; flex-direction: column; gap: 0.75rem; }
    .tiles { display: grid; grid-template-columns: 1fr 1fr; gap: 0.75rem; }
    .tile {
      padding: 0.75rem; border-radius: calc(var(--radius) - 2px);
      border: 1px solid var(--border); background: rgba(248,250,252,0.5);
      display: flex; flex-direction: column; gap: 0.25rem;
    }
    .tile-chef .ti { color: #f59e0b; }
    .tile-lbl {
      display: flex; align-items: center; gap: 0.375rem;
      font-size: 0.6875rem; font-weight: 700; text-transform: uppercase;
      letter-spacing: 0.05em; color: var(--muted-foreground);
    }
    .ti { font-size: 12px; width: 12px; height: 12px; }
    .tile-val { font-size: 0.8125rem; font-weight: 500; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }

    .contact-bar {
      display: flex; align-items: center; gap: 0.5rem;
      padding: 0.75rem; border-radius: calc(var(--radius) - 2px);
      background: #fef2f2; font-size: 0.875rem;
    }
    .ci { color: var(--primary); font-size: 16px; width: 16px; }
    .cl { color: var(--muted-foreground); }
    .cv { font-weight: 500; }

    .warn-bar {
      display: flex; align-items: center; gap: 0.5rem;
      padding: 0.75rem; border-radius: calc(var(--radius) - 2px);
      background: #fffbeb; border: 1px solid #fde68a;
      color: #b45309; font-size: 0.8125rem;
    }
    .wi { font-size: 16px; width: 16px; height: 16px; }

    .dlg-footer {
      display: flex; justify-content: flex-end; gap: 0.5rem;
      margin-top: 1.5rem; padding-top: 0; align-items: center;
    }
    .btn-i { font-size: 16px; width: 16px; height: 16px; margin-right: 0.375rem; }
  `],
})
export class DialogueDetailsEquipeComponent {
  constructor(
    public ref: MatDialogRef<DialogueDetailsEquipeComponent>,
    @Inject(MAT_DIALOG_DATA) public eq: Equipe,
  ) {}
}
