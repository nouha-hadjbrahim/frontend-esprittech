import { Component, Inject, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatDialog, MatDialogRef, MAT_DIALOG_DATA, MatDialogModule } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatSnackBar } from '@angular/material/snack-bar';
import { finalize } from 'rxjs';
import { EquipeService } from '../../../core/services/equipe.service';
import { Equipe } from '../../../core/models/equipe.model';
import { User } from '../../../core/models/user.model';
import { ButtonComponent } from '../../../ui/button/button.component';
import { BadgeComponent } from '../../../ui/badge/badge.component';
import { DialogueConfirmationComponent } from '../../../ui/dialogue-confirmation/dialogue-confirmation.component';
import { DialogueAssignerChefComponent } from '../dialogue-assigner-chef/dialogue-assigner-chef.component';
import { DialogueAjouterMembresComponent } from '../dialogue-ajouter-membres/dialogue-ajouter-membres.component';

@Component({
  selector: 'app-dialogue-details-equipe',
  standalone: true,
  imports: [CommonModule, MatDialogModule, MatIconModule, MatTooltipModule, ButtonComponent, BadgeComponent],
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
            <span class="tile-val">{{ membresList.length + (eq.chef ? 1 : 0) }}</span>
          </div>
          <div class="tile">
            <span class="tile-lbl"><mat-icon class="ti">calendar_today</mat-icon>Créée le</span>
            <span class="tile-val">{{ eq.createdAt | date:'dd/MM/yyyy' }}</span>
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

        <div class="section">
          <div class="section-header">
            <mat-icon class="si">star</mat-icon>
            <span>Chef de l'équipe</span>
            <button *ngIf="!eq.chef" app-button variant="outline" size="sm" class="section-header-btn" (click)="ouvrirAssignerChef()">
              <mat-icon class="icon-xs">person_add</mat-icon> Assigner
            </button>
          </div>

          <div *ngIf="eq.chef" class="member-row chef-row">
            <span class="avatar sm" [style.background]="'#f59e0b'">C</span>
            <span class="member-info">
              <span class="member-name">{{ eq.chef.prenom }} {{ eq.chef.nom }}</span>
              <span class="member-email">{{ eq.chef.email }}</span>
            </span>
            <app-badge variant="outline" class="badge-xs badge-chef">Chef</app-badge>
            <button
              app-button variant="ghost" size="sm" class="btn-revoke"
              matTooltip="Révoquer le chef"
              (click)="revoquerChef()"
              [disabled]="revocationEnCours"
            >
              <mat-icon class="icon-xs">person_remove</mat-icon>
            </button>
          </div>

          <div *ngIf="!eq.chef" class="center-msg center-msg-sm muted">
            Aucun chef désigné
          </div>

        </div>

        <div class="section">
          <div class="section-header">
            <mat-icon class="si">group</mat-icon>
            <span>Membres de l'équipe</span>
            <button app-button variant="outline" size="sm" class="section-header-btn" (click)="ouvrirAjoutMembres()">
              <mat-icon class="icon-xs">person_add</mat-icon> Ajouter
            </button>
          </div>

          <div *ngIf="chargement" class="center-msg">Chargement…</div>

          <div *ngIf="!chargement && membresList.length === 0 && !eq.chef" class="center-msg muted">
            Aucun membre dans cette équipe.
          </div>

          <div *ngFor="let m of membresList" class="member-row">
            <span class="avatar sm" [style.background]="couleurAvatar(m)">{{ initiales(m) }}</span>
            <span class="member-info">
              <span class="member-name">{{ m.prenom }} {{ m.nom }}</span>
              <span class="member-email">{{ m.email }}</span>
            </span>
            <button
              app-button variant="ghost" size="sm" class="btn-remove"
              matTooltip="Retirer de l'équipe"
              (click)="retirerMembre(m)"
              [disabled]="retraitEnCours"
            >
              <mat-icon class="icon-xs">person_remove</mat-icon>
            </button>
          </div>

        </div>
      </div>

      <div class="dlg-footer">
        <button app-button variant="outline" (click)="ref.close()">Fermer</button>
      </div>
    </div>
  `,
  styles: [`
    :host { display: block; max-width: 36rem; }
    .dlg-wrap { padding: 1.5rem; }
    .dlg-header { display: flex; align-items: flex-start; justify-content: space-between; gap: 0.75rem; margin-bottom: 1rem; }
    .dlg-title { margin: 0; font-size: 1.25rem; font-weight: 600; }
    .dlg-desc { margin: 0.25rem 0 0; font-size: 0.875rem; color: var(--muted-foreground); }
    .badge-success { background: #f0fdf4 !important; color: #16a34a !important; border-color: #bbf7d0 !important; }
    .badge-chef { background: #fffbeb !important; color: #b45309 !important; border-color: #fde68a !important; }

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

    .section {
      border: 1px solid var(--border);
      border-radius: calc(var(--radius) - 2px);
      padding: 0.75rem;
    }
    .section-header {
      display: flex; align-items: center; gap: 0.5rem;
      font-size: 0.8125rem; font-weight: 600; margin-bottom: 0.5rem;
    }
    .section-header-btn { margin-left: auto; }
    .si { font-size: 16px; width: 16px; height: 16px; color: var(--primary); }

    .member-row {
      display: flex; align-items: center; gap: 0.5rem;
      padding: 0.375rem 0; border-bottom: 1px solid var(--border);
    }
    .member-row:last-of-type { border-bottom: none; }
    .chef-row { background: #fffbeb; border-radius: calc(var(--radius) - 4px); padding: 0.375rem 0.5rem; }
    .avatar {
      border-radius: 50%; display: inline-grid; place-items: center;
      font-weight: 600; color: #fff; flex-shrink: 0;
    }
    .avatar.sm { width: 28px; height: 28px; font-size: 11px; }
    .member-info { flex: 1; min-width: 0; }
    .member-name { display: block; font-size: 0.8125rem; font-weight: 500; }
    .member-email { display: block; font-size: 0.6875rem; color: var(--muted-foreground); }
    .btn-remove { color: var(--muted-foreground); }
    .btn-remove:hover { color: var(--destructive); }
    .btn-revoke { color: var(--muted-foreground); }
    .btn-revoke:hover { color: var(--destructive); }
    .center-msg { padding: 1rem 0; text-align: center; color: var(--muted-foreground); font-size: 0.8125rem; }
    .center-msg-sm { padding: 0.5rem 0; }
    .muted { color: var(--muted-foreground); }
    .badge-xs { font-size: 0.625rem; padding: 0 0.5rem; height: 1.25rem; }
    .icon-xs { font-size: 14px; width: 14px; height: 14px; }

    .dlg-footer {
      display: flex; justify-content: flex-end; gap: 0.5rem;
      margin-top: 1.5rem; padding-top: 0; align-items: center;
    }
    .btn-i { font-size: 16px; width: 16px; height: 16px; margin-right: 0.375rem; }
  `],
})
export class DialogueDetailsEquipeComponent implements OnInit {
  private readonly svc = inject(EquipeService);
  private readonly snack = inject(MatSnackBar);
  private readonly dialog = inject(MatDialog);

  membresList: User[] = [];
  chargement = false;
  retraitEnCours = false;
  revocationEnCours = false;

  constructor(
    public ref: MatDialogRef<DialogueDetailsEquipeComponent>,
    @Inject(MAT_DIALOG_DATA) public eq: Equipe,
  ) {}

  ngOnInit() {
    this.chargerMembres();
  }

  private chargerMembres() {
    if (this.eq.members && this.eq.members.length) {
      this.membresList = [...this.eq.members];
      return;
    }
    this.chargement = true;
    this.svc.getMembres(this.eq.id).pipe(finalize(() => (this.chargement = false))).subscribe({
      next: (data) => {
        this.membresList = data.filter((u) => !this.eq.chef || u.id !== this.eq.chef.id);
      },
      error: () => this.toast('Erreur lors du chargement des membres'),
    });
  }

  retirerMembre(user: User) {
    this.dialog.open(DialogueConfirmationComponent, {
      width: '320px',
      data: `Retirer ${user.prenom} ${user.nom} de l'équipe ?`,
    }).afterClosed().subscribe((confirmed) => {
      if (!confirmed) return;
      this.retraitEnCours = true;
      this.svc.retirerMembre(this.eq.id, user.id).subscribe({
        next: () => {
          this.membresList = this.membresList.filter((m) => m.id !== user.id);
          this.toast('Membre retiré', 'succes');
          this.ref.close('updated');
        },
        error: () => this.toast('Erreur lors du retrait du membre'),
        complete: () => (this.retraitEnCours = false),
      });
    });
  }

  ouvrirAssignerChef() {
    this.dialog.open(DialogueAssignerChefComponent, { width: '480px', data: this.eq })
      .afterClosed().subscribe((updated) => {
        if (!updated) return;
        this.eq.chef = updated.chef;
        this.toast('Chef assigné', 'succes');
        this.ref.close('updated');
      });
  }

  revoquerChef() {
    this.dialog.open(DialogueConfirmationComponent, {
      width: '320px',
      data: `Révoquer le chef ${this.eq.chef?.prenom} ${this.eq.chef?.nom} ?`,
    }).afterClosed().subscribe((confirmed) => {
      if (!confirmed) return;
      this.revocationEnCours = true;
      this.svc.retirerChef(this.eq.id).subscribe({
        next: () => {
          this.eq.chef = null;
          this.toast('Chef révoqué', 'succes');
          this.ref.close('updated');
        },
        error: () => this.toast('Erreur lors de la révocation du chef'),
        complete: () => (this.revocationEnCours = false),
      });
    });
  }

  ouvrirAjoutMembres() {
    this.dialog.open(DialogueAjouterMembresComponent, { width: '480px', data: this.eq })
      .afterClosed().subscribe((result) => {
        if (!result) return;
        this.toast('Membre(s) ajouté(s)', 'succes');
        this.ref.close('updated');
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

  private toast(msg: string, type: 'succes' | 'erreur' = 'erreur') {
    this.snack.open(msg, '✕', {
      duration: 3500,
      panelClass: type === 'succes' ? ['snack-success'] : ['snack-error'],
    });
  }
}
