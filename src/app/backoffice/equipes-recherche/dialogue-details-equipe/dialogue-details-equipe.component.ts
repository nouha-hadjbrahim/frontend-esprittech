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
import { BadgeComponent } from '../../../ui/badge/badge.component';
import { DialogueConfirmationComponent } from '../../../ui/dialogue-confirmation/dialogue-confirmation.component';
import { DialogueAssignerChefComponent } from '../dialogue-assigner-chef/dialogue-assigner-chef.component';
import { DialogueAjouterMembresComponent } from '../dialogue-ajouter-membres/dialogue-ajouter-membres.component';

@Component({
  selector: 'app-dialogue-details-equipe',
  standalone: true,
  imports: [CommonModule, MatDialogModule, MatIconModule, MatTooltipModule, BadgeComponent],
  template: `
    <div class="dlg-wrap" *ngIf="eq">
      <div class="dlg-header">
        <div class="dlg-header-text">
          <h2 class="dlg-title">{{ eq.nom }}</h2>
          <p class="dlg-subtitle">Détails de l'équipe de recherche</p>
        </div>
        <div class="dlg-header-actions">
          <app-badge variant="outline" [class.badge-success]="eq.statut === 'Actif'" [class.badge-inactive]="eq.statut !== 'Actif'">
            {{ eq.statut }}
          </app-badge>
          <button type="button" class="close-btn" (click)="ref.close(modifications ? 'updated' : undefined)" aria-label="Fermer">
            <mat-icon>close</mat-icon>
          </button>
        </div>
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

        <div *ngIf="eq.description" class="dlg-desc-card">
          <mat-icon class="dc-icon">description</mat-icon>
          <div class="dc-text">{{ eq.description }}</div>
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
            <button *ngIf="!eq.chef" type="button" class="btn-soft" (click)="ouvrirAssignerChef()">
              <mat-icon class="icon-xs">person_add</mat-icon> Assigner
            </button>
          </div>

          <div *ngIf="eq.chef" class="member-row chef-row">
            <span class="avatar sm avatar-chef">C</span>
            <span class="member-info">
              <span class="member-name">{{ eq.chef.prenom }} {{ eq.chef.nom }}</span>
              <span class="member-email">{{ eq.chef.email }}</span>
            </span>
            <app-badge variant="outline" class="badge-xs badge-chef">Chef</app-badge>
            <button
              type="button"
              class="btn-icon"
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

        <div class="section members-section">
          <div class="section-header">
            <mat-icon class="si">group</mat-icon>
            <span>Membres de l'équipe</span>
            <button type="button" class="btn-soft" (click)="ouvrirAjoutMembres()">
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
              type="button"
              class="btn-icon"
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
        <button type="button" class="btn-primary" (click)="ref.close(modifications ? 'updated' : undefined)">Fermer</button>
      </div>
    </div>
  `,
  styles: [`
    :host {
      display: flex;
      flex-direction: column;
      max-width: 36rem;
      max-height: 90vh;
      overflow: hidden;
      background: #ffffff;
      color: #111827;
    }

    .dlg-wrap {
      padding: 0;
      display: flex;
      flex-direction: column;
      min-height: 0;
      flex: 1;
      overflow: hidden;
      background: #ffffff;
    }

    .dlg-header {
      display: flex;
      align-items: flex-start;
      justify-content: space-between;
      gap: 0.75rem;
      padding: 24px 24px 0;
      margin-bottom: 1rem;
      flex-shrink: 0;
      background: #ffffff;
    }

    .dlg-header-text { min-width: 0; overflow: hidden; }

    .dlg-title {
      margin: 0;
      font-size: 1.25rem;
      font-weight: 700;
      color: #111827;
      letter-spacing: -0.01em;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    .dlg-subtitle {
      margin: 0.35rem 0 0;
      font-size: 0.875rem;
      color: #6b7280;
    }

    .dlg-header-actions {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      flex-shrink: 0;
    }

    .close-btn {
      background: none;
      border: none;
      color: #6b7280;
      cursor: pointer;
      padding: 4px;
      border-radius: 8px;
      display: flex;
      transition: background 0.15s, color 0.15s;
    }
    .close-btn:hover { background: #f3f4f6; color: #111827; }
    .close-btn mat-icon { font-size: 20px; width: 20px; height: 20px; }

    .badge-success {
      background: #ecfdf5 !important;
      color: #059669 !important;
      border-color: #a7f3d0 !important;
    }
    .badge-inactive {
      background: #f3f4f6 !important;
      color: #6b7280 !important;
      border-color: #e5e7eb !important;
    }
    .badge-chef {
      background: #fdecec !important;
      color: #e23e3e !important;
      border-color: #fecaca !important;
    }

    .dlg-desc-card {
      display: flex;
      align-items: flex-start;
      gap: 0.625rem;
      padding: 0.875rem 1rem;
      border-radius: 12px;
      background: #fff8f9;
      border: 1px solid #efe6e8;
      flex-shrink: 0;
    }
    .dc-icon { font-size: 16px; width: 16px; height: 16px; color: #e23e3e; flex-shrink: 0; margin-top: 1px; }
    .dc-text { font-size: 0.875rem; color: #334155; line-height: 1.55; word-break: break-word; }

    .dlg-body {
      display: flex;
      flex-direction: column;
      gap: 0.85rem;
      min-width: 0;
      flex: 1;
      overflow-y: auto;
      min-height: 0;
      padding: 0 24px;
      background: #ffffff;
      scrollbar-width: thin;
      scrollbar-color: rgba(226, 62, 62, 0.25) transparent;
      scrollbar-gutter: stable;
    }
    .dlg-body::-webkit-scrollbar { width: 5px; }
    .dlg-body::-webkit-scrollbar-track { background: transparent; }
    .dlg-body::-webkit-scrollbar-thumb {
      background: rgba(226, 62, 62, 0.25);
      border-radius: 3px;
    }
    .dlg-body::-webkit-scrollbar-thumb:hover { background: rgba(226, 62, 62, 0.45); }

    .tiles { display: grid; grid-template-columns: 1fr 1fr; gap: 0.75rem; flex-shrink: 0; }
    .tile {
      padding: 0.85rem;
      border-radius: 12px;
      border: 1px solid #efe6e8;
      background: #ffffff;
      box-shadow: 0 2px 8px rgba(226, 62, 62, 0.04);
      display: flex;
      flex-direction: column;
      gap: 0.3rem;
      min-width: 0;
    }
    .tile-chef .ti { color: #e23e3e; }
    .tile-lbl {
      display: flex;
      align-items: center;
      gap: 0.375rem;
      font-size: 0.6875rem;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      color: #8b8790;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }
    .ti { font-size: 12px; width: 12px; height: 12px; flex-shrink: 0; color: #e23e3e; }
    .tile-val {
      font-size: 0.875rem;
      font-weight: 600;
      color: #111827;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    .contact-bar {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      padding: 0.75rem 0.9rem;
      border-radius: 12px;
      background: #fdecec;
      border: 1px solid #fecaca;
      font-size: 0.875rem;
      overflow: hidden;
      min-width: 0;
      flex-shrink: 0;
    }
    .ci { color: #e23e3e; font-size: 16px; width: 16px; flex-shrink: 0; }
    .cl { color: #8b8790; flex-shrink: 0; }
    .cv { font-weight: 600; color: #111827; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }

    .section {
      border: 1px solid #efe6e8;
      border-radius: 14px;
      padding: 0.85rem;
      overflow: hidden;
      flex-shrink: 0;
      background: #ffffff;
    }
    .members-section { min-height: 0; }
    .section-header {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      font-size: 0.85rem;
      font-weight: 700;
      color: #111827;
      margin-bottom: 0.65rem;
      flex-shrink: 0;
    }
    .si { font-size: 16px; width: 16px; height: 16px; color: #e23e3e; flex-shrink: 0; }

    .btn-soft {
      margin-left: auto;
      display: inline-flex;
      align-items: center;
      gap: 0.35rem;
      border: 1px solid #fecaca;
      background: #fff8f9;
      color: #e23e3e;
      border-radius: 999px;
      padding: 0.35rem 0.75rem;
      font: inherit;
      font-size: 0.78rem;
      font-weight: 700;
      cursor: pointer;
      transition: background 0.15s, border-color 0.15s;
    }
    .btn-soft:hover {
      background: #fdecec;
      border-color: #f3c4c8;
    }

    .member-row {
      display: flex;
      align-items: center;
      gap: 0.625rem;
      padding: 0.55rem 0;
      border-bottom: 1px solid #f3eaea;
      min-width: 0;
      flex-shrink: 0;
    }
    .member-row:last-of-type { border-bottom: none; }
    .chef-row {
      background: #fff8f9;
      border: 1px solid #efe6e8;
      border-radius: 12px;
      padding: 0.75rem;
    }
    .avatar {
      border-radius: 50%;
      display: inline-grid;
      place-items: center;
      font-weight: 700;
      color: #fff;
      flex-shrink: 0;
      width: 30px;
      height: 30px;
      min-width: 30px;
    }
    .avatar.sm { font-size: 11px; }
    .avatar-chef { background: #e23e3e; }
    .member-info { flex: 1; min-width: 0; }
    .member-name {
      display: block;
      font-size: 0.84rem;
      font-weight: 600;
      color: #111827;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }
    .member-email {
      display: block;
      font-size: 0.72rem;
      color: #8b8790;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    .btn-icon {
      border: none;
      background: transparent;
      color: #9ca3af;
      border-radius: 8px;
      width: 32px;
      height: 32px;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      cursor: pointer;
      flex-shrink: 0;
      transition: background 0.15s, color 0.15s;
    }
    .btn-icon:hover:not(:disabled) {
      background: #fef2f2;
      color: #e23e3e;
    }
    .btn-icon:disabled { opacity: 0.55; cursor: not-allowed; }

    .center-msg {
      padding: 1rem 0;
      text-align: center;
      color: #8b8790;
      font-size: 0.84rem;
      flex-shrink: 0;
    }
    .center-msg-sm { padding: 0.5rem 0; }
    .muted { color: #8b8790; }
    .badge-xs { font-size: 0.625rem; padding: 0 0.5rem; height: 1.25rem; flex-shrink: 0; }
    .icon-xs { font-size: 14px; width: 14px; height: 14px; flex-shrink: 0; }

    .dlg-footer {
      display: flex;
      justify-content: flex-end;
      gap: 0.5rem;
      padding: 16px 24px 24px;
      align-items: center;
      flex-shrink: 0;
      background: #ffffff;
      border-top: 1px solid #f3eaea;
      margin-top: 0.75rem;
    }

    .btn-primary {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      min-height: 40px;
      padding: 0 1.15rem;
      border: none;
      border-radius: 999px;
      background: linear-gradient(135deg, #ff5a6e 0%, #e23e3e 100%);
      color: #ffffff;
      font: inherit;
      font-size: 0.9rem;
      font-weight: 700;
      cursor: pointer;
      box-shadow: 0 8px 18px rgba(226, 62, 62, 0.25);
      transition: filter 0.15s, box-shadow 0.15s;
    }
    .btn-primary:hover {
      filter: brightness(0.97);
      box-shadow: 0 10px 22px rgba(226, 62, 62, 0.3);
    }
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
  modifications = false;

  constructor(
    public ref: MatDialogRef<DialogueDetailsEquipeComponent>,
    @Inject(MAT_DIALOG_DATA) public eq: Equipe,
  ) {}

  ngOnInit() {
    this.chargerMembres();
  }

  private chargerMembres() {
    if (this.eq.members && this.eq.members.length) {
      this.membresList = this.eq.members.filter((u) => !this.eq.chef || u.id !== this.eq.chef.id);
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
          this.modifications = true;
          this.toast('Membre retiré', 'succes');
        },
        error: () => this.toast('Erreur lors du retrait du membre'),
        complete: () => (this.retraitEnCours = false),
      });
    });
  }

  ouvrirAssignerChef() {
    this.dialog.open(DialogueAssignerChefComponent, {
      width: '480px',
      data: this.eq,
      panelClass: 'equipe-form-dialog',
      autoFocus: false,
    })
      .afterClosed().subscribe((updated) => {
        if (!updated) return;
        this.eq.chef = updated.chef;
        this.modifications = true;
        this.toast('Chef assigné', 'succes');
        this.rechargerEquipe();
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
          this.modifications = true;
          this.toast('Chef révoqué', 'succes');
          this.rechargerEquipe();
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
        this.modifications = true;
        this.toast('Membre(s) ajouté(s)', 'succes');
        this.rechargerEquipe();
      });
  }

  private rechargerEquipe() {
    this.svc.getById(this.eq.id).subscribe({
      next: (data) => {
        this.eq = data;
        this.chargerMembres();
      },
      error: () => this.toast('Erreur lors du rechargement'),
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
