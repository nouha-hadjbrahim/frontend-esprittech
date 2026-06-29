import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatSnackBar } from '@angular/material/snack-bar';
import { finalize } from 'rxjs';

import { AffiliationEnseignantResponse } from '../../../core/models/affiliation-request.model';
import { AffiliationService } from '../../../core/services/affiliation.service';
import { ButtonComponent } from '../../../ui/button/button.component';
import { BadgeComponent } from '../../../ui/badge/badge.component';
import { CardComponent, CardContentComponent } from '../../../ui/card/card.component';
import { InputComponent } from '../../../ui/input/input.component';

@Component({
  selector: 'app-demandes-affiliation',
  standalone: true,
  imports: [
    CommonModule, FormsModule,
    MatIconModule, MatTooltipModule,
    ButtonComponent, BadgeComponent,
    CardComponent, CardContentComponent,
    InputComponent,
  ],
  template: `
    <div class="space-y-6">
    <div class="page-header">
      <div>
        <h1 class="page-title">Demandes d'affiliation</h1>
        <p class="page-subtitle">Gérez les demandes d'affiliation des enseignants aux équipes de recherche.</p>
      </div>
    </div>
    <app-card>
      <app-card-content>
        <div class="toolbar">
          <div class="search-wrap">
            <mat-icon class="search-icon">search</mat-icon>
            <app-input [(ngModel)]="query" (ngModelChange)="appliquerFiltre()" placeholder="Rechercher un enseignant ou une équipe…" />
          </div>
        </div>

        <div *ngIf="chargement" class="center-msg">Chargement…</div>

        <div *ngIf="!chargement && filtered.length === 0" class="center-msg">Aucune demande d'affiliation.</div>

        <div *ngIf="!chargement && filtered.length > 0" class="table-wrap">
          <table class="eq-table">
            <thead>
              <tr>
                <th class="col-nom">Enseignant</th>
                <th class="col-domaine">Équipe</th>
                <th class="col-date">Date</th>
                <th class="col-statut">Statut</th>
                <th class="col-motif">Motif</th>
                <th class="col-actions">Actions</th>
              </tr>
            </thead>
            <tbody>
              <tr *ngFor="let d of filtered">
                <td class="cell-name">
                  <span class="cell-truncate">{{ d.enseignant.prenom }} {{ d.enseignant.nom }}</span>
                  <span class="cell-email">{{ d.enseignant.email }}</span>
                </td>
                <td class="cell-domaine">
                  <span class="cell-truncate">{{ d.equipeNom }}</span>
                </td>
                <td class="cell-date">
                  <span class="cell-truncate">{{ formatDate(d.dateDemande) }}</span>
                </td>
                <td class="cell-statut">
                  <app-badge variant="outline" [class.badge-success]="d.statut === 'ACCEPTEE'" [class.badge-error]="d.statut === 'REFUSEE'">
                    {{ statutLabel(d.statut) }}
                  </app-badge>
                </td>
                <td class="cell-motif">
                  <span class="cell-truncate">{{ d.motifDecision || '—' }}</span>
                </td>
                <td class="cell-actions">
                  <div class="action-btns" *ngIf="d.statut === 'EN_ATTENTE'">
                    <button class="action-btn accept" matTooltip="Accepter" (click)="accepter(d)">
                      <mat-icon>check_circle</mat-icon>
                    </button>
                    <button class="action-btn refuse" matTooltip="Refuser" (click)="ouvrirRefus(d)">
                      <mat-icon>cancel</mat-icon>
                    </button>
                  </div>
                  <span *ngIf="d.statut !== 'EN_ATTENTE'" class="muted-text">—</span>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </app-card-content>
    </app-card>

    <!-- Refus dialog -->
    </div>
    <div class="motif-overlay" *ngIf="motifDialogOpen" (click)="annulerRefus()">
      <div class="motif-dialog" (click)="$event.stopPropagation()">
        <h3 class="motif-dialog__title">Motif du refus</h3>
        <p class="motif-dialog__subtitle">
          Refuser la demande de <strong>{{ motifEnseignant }}</strong> pour l'équipe <strong>{{ motifEquipe }}</strong>
        </p>
        <textarea
          class="motif-dialog__input"
          [(ngModel)]="motifText"
          placeholder="Saisissez le motif du refus..."
          rows="3"
        ></textarea>
        <div class="motif-dialog__actions">
          <button app-button variant="outline" (click)="annulerRefus()">Annuler</button>
          <button app-button variant="default" class="btn-danger" (click)="confirmerRefus()">Confirmer le refus</button>
        </div>
      </div>
    </div>
  `,
  styles: [`
    :host { display: block; }
    .space-y-6 { display: flex; flex-direction: column; gap: 1.5rem; }
    .page-header { display: flex; justify-content: space-between; align-items: flex-start; gap: 1rem; }
    .page-title { margin: 0; font-size: 1.5rem; font-weight: 700; color: #0f172a; }
    .page-subtitle { margin: 0.25rem 0 0; font-size: 0.875rem; color: var(--muted-foreground); }
    .toolbar { display: flex; align-items: center; gap: 0.75rem; margin-bottom: 1rem; }
    .search-wrap { position: relative; flex: 1; max-width: 24rem; }
    .search-icon { position: absolute; left: 0.75rem; top: 50%; transform: translateY(-50%); font-size: 18px; width: 18px; height: 18px; color: var(--muted-foreground); pointer-events: none; }
    .table-wrap { overflow-x: auto; }
    .eq-table { width: 100%; border-collapse: collapse; font-size: 0.8125rem; }
    .eq-table th { text-align: left; font-weight: 600; color: var(--muted-foreground); padding: 0.625rem 0.75rem; border-bottom: 1px solid var(--border); white-space: nowrap; }
    .eq-table td { padding: 0.625rem 0.75rem; border-bottom: 1px solid var(--border); }
    .eq-table tbody tr:hover { background: rgba(0,0,0,0.01); }
    .cell-truncate { display: block; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; max-width: 200px; }
    .cell-email { font-size: 0.6875rem; color: var(--muted-foreground); display: block; }
    .center-msg { padding: 2rem; text-align: center; color: var(--muted-foreground); }
    .action-btns { display: flex; gap: 0.25rem; }
    .action-btn { display: inline-flex; align-items: center; justify-content: center; width: 28px; height: 28px; border: none; border-radius: 6px; background: transparent; cursor: pointer; transition: background 0.15s, color 0.15s; }
    .action-btn.accept { color: #16a34a; }
    .action-btn.accept:hover { background: #f0fdf4; }
    .action-btn.refuse { color: #dc2626; }
    .action-btn.refuse:hover { background: #fef2f2; }
    .muted-text { color: var(--muted-foreground); }
    .badge-success { background: #f0fdf4 !important; color: #16a34a !important; border-color: #bbf7d0 !important; }
    .badge-error { background: #fef2f2 !important; color: #dc2626 !important; border-color: #fecaca !important; }

    .motif-overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.4); display: flex; align-items: center; justify-content: center; z-index: 1000; }
    .motif-dialog { background: #fff; border-radius: 12px; padding: 1.5rem; width: 420px; max-width: 90vw; box-shadow: 0 20px 60px rgba(0,0,0,0.15); }
    .motif-dialog__title { margin: 0 0 0.5rem; font-size: 1rem; font-weight: 700; }
    .motif-dialog__subtitle { margin: 0 0 1rem; font-size: 0.8125rem; color: var(--muted-foreground); line-height: 1.5; }
    .motif-dialog__input { width: 100%; padding: 0.625rem 0.75rem; border: 1px solid var(--border); border-radius: 8px; font-family: inherit; font-size: 0.8125rem; resize: vertical; box-sizing: border-box; margin-bottom: 1rem; }
    .motif-dialog__input:focus { outline: none; border-color: var(--primary); }
    .motif-dialog__actions { display: flex; justify-content: flex-end; gap: 0.5rem; }
    .btn-danger { background: #dc2626 !important; color: #fff !important; }
    .btn-danger:hover { background: #b91c1c !important; }
  `],
})
export class DemandesAffiliationComponent implements OnInit {
  private readonly svc = inject(AffiliationService);
  private readonly snack = inject(MatSnackBar);

  readonly demandes = signal<AffiliationEnseignantResponse[]>([]);
  filtered: AffiliationEnseignantResponse[] = [];
  query = '';
  chargement = true;

  motifDialogOpen = false;
  motifText = '';
  pendingRefuse: AffiliationEnseignantResponse | null = null;
  motifEnseignant = '';
  motifEquipe = '';

  ngOnInit() {
    this.charger();
  }

  charger() {
    this.chargement = true;
    this.svc.getAll().pipe(finalize(() => (this.chargement = false))).subscribe({
      next: (data) => { this.demandes.set(data); this.appliquerFiltre(); },
      error: () => this.toast('Erreur lors du chargement des demandes'),
    });
  }

  appliquerFiltre() {
    const q = this.query.toLowerCase().trim();
    this.filtered = !q
      ? this.demandes()
      : this.demandes().filter(
          (d) =>
            `${d.enseignant.prenom} ${d.enseignant.nom}`.toLowerCase().includes(q) ||
            d.enseignant.email.toLowerCase().includes(q) ||
            d.equipeNom.toLowerCase().includes(q),
        );
  }

  accepter(d: AffiliationEnseignantResponse) {
    this.svc.traiter(d.id, d.equipeId, 'ACCEPTEE').subscribe({
      next: () => {
        this.toast(`Demande de ${d.enseignant.prenom} ${d.enseignant.nom} acceptée`, 'succes');
        this.charger();
      },
      error: () => this.toast("Erreur lors de l'acceptation"),
    });
  }

  ouvrirRefus(d: AffiliationEnseignantResponse) {
    this.pendingRefuse = d;
    this.motifEnseignant = `${d.enseignant.prenom} ${d.enseignant.nom}`;
    this.motifEquipe = d.equipeNom;
    this.motifText = '';
    this.motifDialogOpen = true;
  }

  confirmerRefus() {
    if (!this.pendingRefuse) return;
    const d = this.pendingRefuse;
    this.svc.traiter(d.id, d.equipeId, 'REFUSEE', this.motifText || undefined).subscribe({
      next: () => {
        this.toast(`Demande de ${d.enseignant.prenom} ${d.enseignant.nom} refusée`, 'succes');
        this.motifDialogOpen = false;
        this.pendingRefuse = null;
        this.charger();
      },
      error: () => this.toast('Erreur lors du refus'),
    });
  }

  annulerRefus() {
    this.motifDialogOpen = false;
    this.pendingRefuse = null;
  }

  statutLabel(statut: string): string {
    switch (statut) {
      case 'ACCEPTEE': return 'Acceptée';
      case 'REFUSEE': return 'Refusée';
      default: return 'En attente';
    }
  }

  formatDate(date: string): string {
    if (!date) return '';
    const d = new Date(date);
    return d.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' });
  }

  private toast(msg: string, type: 'succes' | 'erreur' = 'erreur') {
    this.snack.open(msg, '✕', {
      duration: 3500,
      panelClass: type === 'succes' ? ['snack-success'] : ['snack-error'],
    });
  }
}
