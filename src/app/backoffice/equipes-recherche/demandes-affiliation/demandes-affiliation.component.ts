import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatSnackBar } from '@angular/material/snack-bar';
import { finalize } from 'rxjs';

import { AffiliationEnseignantResponse } from '../../../core/models/affiliation-request.model';
import { AffiliationService } from '../../../core/services/affiliation.service';
import { ButtonComponent } from '../../../ui/button/button.component';
import { CardComponent, CardContentComponent } from '../../../ui/card/card.component';
import {
  FilterDropdown,
  FilterOption,
} from '../../../frontoffice/components/sujets/filter-dropdown/filter-dropdown';

@Component({
  selector: 'app-demandes-affiliation',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    ButtonComponent,
    CardComponent,
    CardContentComponent,
    FilterDropdown,
  ],
  template: `
    <div class="space-y-6">
      <div class="page-header">
        <div>
          <h1 class="page-title">Demandes d'affiliation</h1>
          <p class="page-subtitle">
            Traitez les demandes en attente des enseignants aux équipes de recherche.
          </p>
        </div>
      </div>

      <app-card>
        <app-card-content>
          <div class="toolbar">
            <div class="search-box">
              <svg class="search-icon" width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
                <circle cx="7" cy="7" r="5" stroke="currentColor" stroke-width="1.5"/>
                <path d="M11 11L14 14" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
              </svg>
              <input
                type="text"
                class="search-input"
                [(ngModel)]="query"
                (ngModelChange)="appliquerFiltre()"
                placeholder="Rechercher un enseignant…"
              />
            </div>

            <div class="toolbar__filters">
              <app-filter-dropdown
                class="equipe-filter"
                label="Équipe"
                [options]="equipeOptions"
                [value]="selectedEquipeId"
                defaultValue=""
                (valueChange)="onEquipeFilterChange($event)"
              />
            </div>
          </div>

          <div *ngIf="chargement" class="center-msg">Chargement…</div>

          <div *ngIf="!chargement && filtered.length === 0" class="center-msg">
            Aucune demande en attente.
          </div>

          <div *ngIf="!chargement && filtered.length > 0" class="table-wrap">
            <table class="eq-table">
              <thead>
                <tr>
                  <th class="col-nom">Enseignant</th>
                  <th class="col-domaine">Équipe</th>
                  <th class="col-date">Date</th>
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
                  <td class="cell-actions">
                    <div class="action-btns">
                      <button
                        type="button"
                        class="affil-btn affil-btn--accept"
                        (click)="accepter(d)"
                      >
                        <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
                          <path d="M2.5 7L5.5 10L11.5 4" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
                        </svg>
                        Accepter
                      </button>
                      <button
                        type="button"
                        class="affil-btn affil-btn--reject"
                        (click)="ouvrirRefus(d)"
                      >
                        <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
                          <path d="M3.5 3.5L10.5 10.5M10.5 3.5L3.5 10.5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
                        </svg>
                        Refuser
                      </button>
                    </div>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </app-card-content>
      </app-card>
    </div>

    <div class="motif-overlay" *ngIf="motifDialogOpen" (click)="annulerRefus()">
      <div class="motif-dialog" (click)="$event.stopPropagation()">
        <h3 class="motif-dialog__title">Motif du refus</h3>
        <p class="motif-dialog__subtitle">
          Refuser la demande de <strong>{{ motifEnseignant }}</strong>
          pour l'équipe <strong>{{ motifEquipe }}</strong>
        </p>
        <textarea
          class="motif-dialog__input"
          [(ngModel)]="motifText"
          placeholder="Saisissez le motif du refus..."
          rows="3"
        ></textarea>
        <div class="motif-dialog__actions">
          <button app-button variant="outline" (click)="annulerRefus()">Annuler</button>
          <button app-button variant="default" class="btn-danger" (click)="confirmerRefus()">
            Confirmer le refus
          </button>
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

    .toolbar {
      display: flex;
      align-items: center;
      gap: 12px;
      margin-bottom: 1rem;
      flex-wrap: wrap;
    }

    .search-box {
      position: relative;
      display: flex;
      align-items: center;
      flex: 1 1 220px;
      min-width: 0;
      height: 42px;
      border: 1px solid #e5e7eb;
      border-radius: 10px;
      background: #ffffff;
      transition: border-color 0.15s ease, box-shadow 0.15s ease;
    }

    .search-box:focus-within {
      border-color: #d1d5db;
      box-shadow: 0 0 0 3px rgba(0, 0, 0, 0.03);
    }

    .search-icon {
      position: absolute;
      left: 14px;
      top: 50%;
      transform: translateY(-50%);
      color: #9ca3af;
      pointer-events: none;
    }

    .search-input {
      width: 100%;
      height: 100%;
      padding: 0 14px 0 40px;
      border: none;
      border-radius: 10px;
      background: transparent;
      font-family: inherit;
      font-size: 14px;
      color: #1a1a1a;
      box-sizing: border-box;
    }

    .search-input:focus { outline: none; }
    .search-input::placeholder { color: #9ca3af; }

    .toolbar__filters {
      display: flex;
      align-items: center;
      gap: 10px;
      flex-shrink: 0;
      margin-left: auto;
    }

    .equipe-filter {
      display: block;
      min-width: 160px;
    }

    .table-wrap { overflow-x: auto; }
    .eq-table { width: 100%; border-collapse: collapse; font-size: 0.8125rem; }
    .eq-table th {
      text-align: left;
      font-weight: 600;
      color: var(--muted-foreground);
      padding: 0.625rem 0.75rem;
      border-bottom: 1px solid var(--border);
      white-space: nowrap;
    }
    .eq-table td { padding: 0.75rem; border-bottom: 1px solid var(--border); vertical-align: middle; }
    .eq-table tbody tr:hover { background: rgba(0,0,0,0.01); }
    .cell-truncate { display: block; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; max-width: 220px; }
    .cell-email { font-size: 0.6875rem; color: var(--muted-foreground); display: block; }
    .center-msg { padding: 2rem; text-align: center; color: var(--muted-foreground); }

    .action-btns {
      display: flex;
      align-items: center;
      gap: 8px;
      flex-wrap: wrap;
    }

    .affil-btn {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      padding: 8px 14px;
      border-radius: 10px;
      font-family: inherit;
      font-size: 12px;
      font-weight: 600;
      cursor: pointer;
      white-space: nowrap;
      border: 1px solid transparent;
      transition: all 0.15s ease;
    }

    .affil-btn--accept {
      background: #ecfdf5;
      color: #047857;
      border-color: #a7f3d0;
    }

    .affil-btn--accept:hover { background: #d1fae5; }

    .affil-btn--reject {
      background: #fef2f2;
      color: #dc2626;
      border-color: #fecaca;
    }

    .affil-btn--reject:hover { background: #fee2e2; }

    .motif-overlay {
      position: fixed;
      inset: 0;
      background: rgba(0,0,0,0.4);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 1000;
    }

    .motif-dialog {
      background: #fff;
      border-radius: 12px;
      padding: 1.5rem;
      width: 420px;
      max-width: 90vw;
      box-shadow: 0 20px 60px rgba(0,0,0,0.15);
    }

    .motif-dialog__title { margin: 0 0 0.5rem; font-size: 1rem; font-weight: 700; }
    .motif-dialog__subtitle {
      margin: 0 0 1rem;
      font-size: 0.8125rem;
      color: var(--muted-foreground);
      line-height: 1.5;
    }
    .motif-dialog__input {
      width: 100%;
      padding: 0.625rem 0.75rem;
      border: 1px solid var(--border);
      border-radius: 8px;
      font-family: inherit;
      font-size: 0.8125rem;
      resize: vertical;
      box-sizing: border-box;
      margin-bottom: 1rem;
    }
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
  equipeOptions: FilterOption[] = [{ value: '', label: 'Toutes les équipes' }];
  query = '';
  selectedEquipeId = '';
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
      next: (data) => {
        this.demandes.set(data);
        this.refreshEquipeOptions();
        this.appliquerFiltre();
      },
      error: () => this.toast('Erreur lors du chargement des demandes'),
    });
  }

  onEquipeFilterChange(value: string): void {
    this.selectedEquipeId = value;
    this.appliquerFiltre();
  }

  appliquerFiltre() {
    const q = this.query.toLowerCase().trim();
    const equipeId = this.selectedEquipeId ? Number(this.selectedEquipeId) : null;

    this.filtered = this.demandes()
      .filter((d) => d.statut === 'EN_ATTENTE')
      .filter((d) => (equipeId == null || Number.isNaN(equipeId) ? true : d.equipeId === equipeId))
      .filter((d) => {
        if (!q) return true;
        return (
          `${d.enseignant.prenom} ${d.enseignant.nom}`.toLowerCase().includes(q) ||
          d.enseignant.email.toLowerCase().includes(q) ||
          d.equipeNom.toLowerCase().includes(q)
        );
      });
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

  formatDate(date: string): string {
    if (!date) return '';
    const d = new Date(date);
    return d.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' });
  }

  private refreshEquipeOptions(): void {
    const map = new Map<number, string>();
    for (const d of this.demandes()) {
      if (d.statut === 'EN_ATTENTE' && !map.has(d.equipeId)) {
        map.set(d.equipeId, d.equipeNom);
      }
    }
    this.equipeOptions = [
      { value: '', label: 'Toutes les équipes' },
      ...Array.from(map.entries())
        .sort((a, b) => a[1].localeCompare(b[1], 'fr'))
        .map(([id, nom]) => ({ value: String(id), label: nom })),
    ];

    if (
      this.selectedEquipeId &&
      !this.equipeOptions.some((o) => o.value === this.selectedEquipeId)
    ) {
      this.selectedEquipeId = '';
    }
  }

  private toast(msg: string, type: 'succes' | 'erreur' = 'erreur') {
    this.snack.open(msg, '✕', {
      duration: 3500,
      panelClass: type === 'succes' ? ['snack-success'] : ['snack-error'],
    });
  }
}
