import { Component, Inject, OnInit, OnDestroy, HostListener, ViewChild, ElementRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatDialogRef, MAT_DIALOG_DATA, MatDialogModule } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { MatSnackBar } from '@angular/material/snack-bar';
import { Subject, debounceTime, distinctUntilChanged, switchMap, of } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { inject } from '@angular/core';
import { Equipe } from '../../../core/models/equipe.model';
import { User } from '../../../core/models/user.model';
import { AdminService } from '../../../core/services/admin.service';
import { ButtonComponent } from '../../../ui/button/button.component';
import { LabelComponent } from '../../../ui/label/label.component';

@Component({
  selector: 'app-dialogue-modifier-equipe',
  standalone: true,
  imports: [
    CommonModule, FormsModule, MatDialogModule, MatIconModule,
    ButtonComponent, LabelComponent,
  ],
  template: `
    <div class="modal">
      <div class="modal-header">
        <div class="modal-header-text">
          <h1 class="modal-title">Modifier l'équipe</h1>
          <p class="modal-subtitle">Mettez à jour les informations et gérez les membres.</p>
        </div>
        <button class="close-btn" (click)="ref.close()" aria-label="Fermer">
          <mat-icon>close</mat-icon>
        </button>
      </div>

      <div class="modal-body">
        <form (ngSubmit)="submit()" #formEl="ngForm">
          <div class="form-content">
            <div class="field">
              <app-label for="e-nom">Nom <span class="req">*</span></app-label>
              <input id="e-nom" name="nom" [(ngModel)]="form.nom" required placeholder="Ex: AI Research Lab" class="inp" autocomplete="off" />
            </div>

            <div class="field">
              <app-label for="e-desc">Description <span class="req">*</span></app-label>
              <textarea id="e-desc" name="description" [(ngModel)]="form.description" required rows="3" placeholder="Décrivez l'équipe et ses objectifs…" class="inp ta"></textarea>
            </div>

            <div class="grid-2">
              <div class="field">
                <app-label for="e-domaine">Domaine <span class="req">*</span></app-label>
                <input id="e-domaine" name="domaine" [(ngModel)]="form.domaine" required placeholder="Ex: Intelligence Artificielle" class="inp" autocomplete="off" />
              </div>
              <div class="field">
                <app-label for="e-statut">Statut</app-label>
                <div class="sel-wrap">
                  <select id="e-statut" name="statut" [(ngModel)]="form.statut" class="inp sel">
                    <option value="Actif">Actif</option>
                    <option value="Inactif">Inactif</option>
                  </select>
                  <mat-icon class="sel-arrow">expand_more</mat-icon>
                </div>
              </div>
            </div>

            <!-- Chef picker -->
            <div class="field">
              <app-label>Chef d'équipe <span class="opt">(optionnel)</span></app-label>

              <div class="chip-input-wrap" #chefPickerWrap>
                <div class="chip-input" (click)="focusChefInput()">
                  <div class="chip" *ngFor="let c of chefs">
                    <span class="chip-avatar" [style.background]="couleurAvatar(c)">{{ initiales(c) }}</span>
                    <span class="chip-name">{{ c.prenom }} {{ c.nom }}</span>
                    <button type="button" class="chip-remove" (click)="retirerChef(); $event.stopPropagation()" aria-label="Retirer le chef">
                      <mat-icon>close</mat-icon>
                    </button>
                  </div>
                  <input
                    #chefInput
                    *ngIf="!chefs.length"
                    class="chip-inp"
                    name="chef-search"
                    [ngModelOptions]="{standalone: true}"
                    [(ngModel)]="queryChef"
                    (ngModelChange)="onChefQueryChange($event)"
                    (focus)="showDropdownChef = true"
                    (keydown)="onChefKeydown($event)"
                    [placeholder]="chefPlaceholder"
                    autocomplete="off"
                  />
                </div>
                <div class="picker-dropdown" *ngIf="showDropdownChef && (chargementChef || candidatsChef.length > 0)">
                  <div *ngIf="chargementChef" class="drop-loading">
                    <div class="skeleton-card" *ngFor="let _ of [1,2,3]">
                      <div class="sk-avatar"></div>
                      <div class="sk-lines"><div class="sk-line w-32"></div><div class="sk-line w-24"></div></div>
                    </div>
                  </div>
                  <ul *ngIf="!chargementChef">
                    <li
                      *ngFor="let u of candidatsChef; let i = index"
                      [class.hi]="i === hiChef"
                      (mouseenter)="hiChef = i"
                      (mousedown)="selectionnerChef(u)"
                    >
                      <span class="res-avatar" [style.background]="couleurAvatar(u)">{{ initiales(u) }}</span>
                      <span class="res-info"><span class="res-name">{{ u.prenom }} {{ u.nom }}</span><span class="res-email">{{ u.email }}</span></span>
                      <span class="res-badge">{{ u.role === 'ROLE_CHEF_EQUIPE' ? 'Chef' : 'Enseignant' }}</span>
                    </li>
                  </ul>
                </div>
                <p *ngIf="!chargementChef && queryChef.length >= 2 && candidatsChef.length === 0 && showDropdownChef" class="no-result">Aucun résultat pour "{{ queryChef }}"</p>
              </div>
            </div>

            <!-- Members picker -->
            <div class="field">
              <app-label>Membres</app-label>

              <div class="chip-input-wrap" #membresPickerWrap>
                <div class="chip-input" (click)="membresInput.focus()">
                  <div class="chip" *ngFor="let m of membresSansChef">
                    <span class="chip-avatar" [style.background]="couleurAvatar(m)">{{ initiales(m) }}</span>
                    <span class="chip-name">{{ m.prenom }} {{ m.nom }}</span>
                    <button type="button" class="chip-remove" (click)="retirerMembre(m); $event.stopPropagation()" aria-label="Retirer le membre">
                      <mat-icon>close</mat-icon>
                    </button>
                  </div>
                  <input
                    #membresInput
                    class="chip-inp"
                    name="member-search"
                    [ngModelOptions]="{standalone: true}"
                    [(ngModel)]="queryMembres"
                    (ngModelChange)="onMembresQueryChange($event)"
                    (focus)="showDropdownMembres = true"
                    (keydown)="onMembresKeydown($event)"
                    [placeholder]="membres.length ? '' : 'Chercher des membres…'"
                    autocomplete="off"
                  />
                </div>
                <div class="picker-dropdown" *ngIf="showDropdownMembres && (chargementMembres || candidatsMembres.length > 0)">
                  <div *ngIf="chargementMembres" class="drop-loading">
                    <div class="skeleton-card" *ngFor="let _ of [1,2,3]">
                      <div class="sk-avatar"></div>
                      <div class="sk-lines"><div class="sk-line w-32"></div><div class="sk-line w-24"></div></div>
                    </div>
                  </div>
                  <ul *ngIf="!chargementMembres">
                    <li
                      *ngFor="let u of candidatsMembres; let i = index"
                      [class.hi]="i === hiMembres"
                      [class.selected]="estSelectionne(u)"
                      (mouseenter)="hiMembres = i"
                      (mousedown)="basculerMembre(u)"
                    >
                      <span class="res-avatar" [style.background]="couleurAvatar(u)">{{ initiales(u) }}</span>
                      <span class="res-info"><span class="res-name">{{ u.prenom }} {{ u.nom }}</span><span class="res-email">{{ u.email }}</span></span>
                      <span class="res-badge">{{ u.role === 'ROLE_CHEF_EQUIPE' ? 'Chef' : 'Enseignant' }}</span>
                      <span *ngIf="estSelectionne(u)" class="check-mark"><mat-icon>check</mat-icon></span>
                    </li>
                  </ul>
                </div>
                <p *ngIf="!chargementMembres && queryMembres.length >= 2 && candidatsMembres.length === 0 && showDropdownMembres" class="no-result">Aucun résultat pour "{{ queryMembres }}"</p>
              </div>
            </div>
          </div>
        </form>
      </div>

      <div class="modal-footer">
        <button type="button" app-button variant="outline" (click)="ref.close()">Annuler</button>
        <button type="submit" app-button variant="default" (click)="submit()" [disabled]="!form.nom.trim() || !form.description.trim() || !form.domaine.trim()">
          <mat-icon class="btn-i">save</mat-icon> Enregistrer
        </button>
      </div>
    </div>
  `,
  styles: [`
    :host { display: block; }

    .modal {
      display: flex;
      flex-direction: column;
      height: 85vh;
      max-height: 780px;
      padding: 0;
      overflow: hidden;
    }

    /* ── Header ── */
    .modal-header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      padding: 1.75rem 1.75rem 0;
      flex-shrink: 0;
    }
    .modal-header-text { min-width: 0; }
    .modal-title {
      margin: 0;
      font-size: 1.35rem;
      font-weight: 700;
      color: var(--foreground, #1e293b);
      letter-spacing: -0.01em;
      line-height: 1.3;
    }
    .modal-subtitle {
      margin: 0.35rem 0 0;
      font-size: 0.875rem;
      color: var(--muted-foreground, #64748b);
    }
    .close-btn {
      background: none;
      border: none;
      color: var(--muted-foreground, #94a3b8);
      cursor: pointer;
      padding: 0.375rem;
      border-radius: 50%;
      display: flex;
      transition: background 0.2s, color 0.2s;
      flex-shrink: 0;
    }
    .close-btn:hover { background: var(--accent, #f1f5f9); color: var(--foreground, #1e293b); }
    .close-btn mat-icon { font-size: 20px; width: 20px; height: 20px; }

    /* ── Scrollable body ── */
    .modal-body {
      flex: 1;
      overflow-y: auto;
      overflow-x: hidden;
      min-height: 0;
      padding: 1.25rem 1.75rem 0;

      scrollbar-width: thin;
      scrollbar-color: rgba(0,0,0,0.12) transparent;
      scroll-behavior: smooth;
    }
    .modal-body::-webkit-scrollbar { width: 5px; }
    .modal-body::-webkit-scrollbar-track { background: transparent; }
    .modal-body::-webkit-scrollbar-thumb { background: rgba(0,0,0,0.12); border-radius: 3px; }
    .modal-body::-webkit-scrollbar-thumb:hover { background: rgba(0,0,0,0.22); }

    .form-content { display: flex; flex-direction: column; gap: 1.5rem; padding-bottom: 1rem; }

    .field { display: flex; flex-direction: column; gap: 0.375rem; }

    .req { color: #ef4444; font-weight: 600; }
    .opt { font-weight: 400; color: var(--muted-foreground); font-size: 0.75rem; }

    /* ── Inputs / textarea / select ── */
    .inp {
      width: 100%;
      height: 3rem;
      padding: 0 0.875rem;
      border: 1px solid var(--border, #e2e8f0);
      border-radius: 12px;
      background: var(--background, #fff);
      font-size: 0.875rem;
      font-family: inherit;
      color: var(--foreground, #1e293b);
      outline: none;
      box-sizing: border-box;
      transition: border-color 0.2s, box-shadow 0.2s;
    }
    .inp::placeholder { color: var(--muted-foreground, #94a3b8); }
    .inp:hover { border-color: #cbd5e1; }
    .inp:focus {
      border-color: var(--ring, #E63946);
      box-shadow: 0 0 0 3px rgba(230,57,70,0.1);
    }

    .ta { height: auto; min-height: 5rem; padding: 0.75rem 0.875rem; resize: vertical; line-height: 1.5; }

    .sel-wrap { position: relative; }
    .sel {
      appearance: none;
      cursor: pointer;
      padding-right: 2.5rem;
      background: var(--background, #fff);
    }
    .sel-arrow {
      position: absolute;
      right: 0.75rem;
      top: 50%;
      transform: translateY(-50%);
      pointer-events: none;
      color: var(--muted-foreground, #94a3b8);
      font-size: 20px;
    }

    .grid-2 {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 1rem;
    }

    /* ── Chip input (integrated chips + input) ── */
    .chip-input-wrap {
      position: relative;
    }
    .chip-input {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      gap: 0.375rem;
      min-height: 3rem;
      padding: 0.375rem 0.875rem;
      border: 1px solid var(--border, #e2e8f0);
      border-radius: 12px;
      background: var(--background, #fff);
      cursor: text;
      transition: border-color 0.2s, box-shadow 0.2s;
    }
    .chip-input:focus-within {
      border-color: var(--ring, #E63946);
      box-shadow: 0 0 0 3px rgba(230,57,70,0.1);
    }
    .chip-input:hover { border-color: #cbd5e1; }
    .chip-inp {
      flex: 1;
      min-width: 100px;
      border: none;
      outline: none;
      height: 1.625rem;
      padding: 0;
      font-size: 0.875rem;
      font-family: inherit;
      background: transparent;
      color: var(--foreground, #1e293b);
    }
    .chip-inp::placeholder { color: var(--muted-foreground, #94a3b8); }

    .chip {
      display: inline-flex;
      align-items: center;
      gap: 0.375rem;
      padding: 0.25rem 0.375rem 0.25rem 0.25rem;
      border-radius: 999px;
      background: var(--muted, #f8fafc);
      border: 1px solid var(--border, #e2e8f0);
      font-size: 0.75rem;
      font-weight: 500;
      color: var(--foreground, #1e293b);
      animation: chipIn 0.2s ease both;
      box-shadow: 0 1px 2px rgba(0,0,0,0.04);
    }
    @keyframes chipIn {
      from { opacity: 0; transform: scale(0.9); }
      to { opacity: 1; transform: scale(1); }
    }
    .chip-avatar {
      width: 22px;
      height: 22px;
      border-radius: 50%;
      display: inline-grid;
      place-items: center;
      font-size: 9px;
      font-weight: 600;
      color: #fff;
      flex-shrink: 0;
    }
    .chip-name { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; max-width: 120px; }
    .chip-remove {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      background: none;
      border: none;
      cursor: pointer;
      padding: 1px;
      border-radius: 50%;
      color: var(--muted-foreground, #94a3b8);
      transition: background 0.15s, color 0.15s;
      width: 18px;
      height: 18px;
    }
    .chip-remove:hover { background: var(--accent, #e2e8f0); color: var(--foreground, #475569); }
    .chip-remove mat-icon { font-size: 14px; width: 14px; height: 14px; }

    /* ── Dropdown (shared for both pickers) ── */

    .picker-dropdown {
      position: absolute;
      left: 0; right: 0;
      margin-top: 0.25rem;
      z-index: 50;
      background: var(--popover, #fff);
      border: 1px solid var(--border, #e2e8f0);
      border-radius: 14px;
      box-shadow: 0 8px 24px rgba(0,0,0,0.08);
      overflow: hidden;
      animation: dropIn 0.15s ease both;
      transform-origin: top;
    }
    @keyframes dropIn {
      from { opacity: 0; transform: scaleY(0.95) translateY(-4px); }
      to { opacity: 1; transform: scaleY(1) translateY(0); }
    }

    .picker-dropdown ul {
      list-style: none;
      margin: 0;
      padding: 0.375rem;
      max-height: 260px;
      overflow-y: auto;

      scrollbar-width: thin;
      scrollbar-color: rgba(0,0,0,0.12) transparent;
    }
    .picker-dropdown ul::-webkit-scrollbar { width: 5px; }
    .picker-dropdown ul::-webkit-scrollbar-track { background: transparent; }
    .picker-dropdown ul::-webkit-scrollbar-thumb { background: rgba(0,0,0,0.12); border-radius: 3px; }
    .picker-dropdown ul::-webkit-scrollbar-thumb:hover { background: rgba(0,0,0,0.22); }

    .picker-dropdown li {
      display: flex;
      align-items: center;
      gap: 0.75rem;
      padding: 0.5rem 0.625rem;
      border-radius: 10px;
      cursor: pointer;
      transition: background 0.15s;
      animation: resIn 0.2s ease both;
    }
    @keyframes resIn {
      from { opacity: 0; transform: translateY(4px); }
      to { opacity: 1; transform: translateY(0); }
    }
    .picker-dropdown li.hi { background: var(--accent, #f1f5f9); }
    .picker-dropdown li.selected { background: #fef2f2; }

    .res-avatar {
      width: 32px;
      height: 32px;
      border-radius: 50%;
      display: inline-grid;
      place-items: center;
      font-size: 11px;
      font-weight: 600;
      color: #fff;
      flex-shrink: 0;
      box-shadow: 0 2px 4px rgba(0,0,0,0.08);
    }
    .res-info { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 1px; }
    .res-name { font-size: 0.8125rem; font-weight: 600; color: var(--foreground, #1e293b); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
    .res-email { font-size: 0.6875rem; color: var(--muted-foreground, #64748b); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
    .res-badge {
      flex-shrink: 0;
      font-size: 0.625rem;
      font-weight: 600;
      padding: 0.125rem 0.5rem;
      height: 1.25rem;
      display: inline-flex;
      align-items: center;
      border-radius: 999px;
      background: var(--muted, #f1f5f9);
      color: var(--muted-foreground, #64748b);
      border: 1px solid var(--border, #e2e8f0);
    }
    .check-mark {
      flex-shrink: 0;
      width: 20px;
      height: 20px;
      border-radius: 50%;
      background: var(--ring, #E63946);
      color: #fff;
      display: flex;
      align-items: center;
      justify-content: center;
    }
    .check-mark mat-icon { font-size: 13px; width: 13px; height: 13px; }

    .field-error {
      margin: 0.25rem 0 0;
      font-size: 0.75rem;
      color: #ef4444;
      font-weight: 500;
    }

    .no-result {
      margin: 0.25rem 0 0;
      font-size: 0.75rem;
      color: var(--muted-foreground);
      padding: 0.25rem 0.25rem;
    }

    .drop-loading { padding: 0.375rem; display: flex; flex-direction: column; gap: 0.5rem; }
    .skeleton-card {
      display: flex;
      align-items: center;
      gap: 0.75rem;
      padding: 0.5rem 0.625rem;
    }
    .sk-avatar {
      width: 32px;
      height: 32px;
      border-radius: 50%;
      background: var(--muted, #e2e8f0);
      animation: shimmer 1.4s infinite;
    }
    .sk-lines { flex: 1; display: flex; flex-direction: column; gap: 0.375rem; }
    .sk-line {
      height: 10px;
      border-radius: 6px;
      background: var(--muted, #e2e8f0);
      animation: shimmer 1.4s infinite;
    }
    .w-32 { width: 60%; }
    .w-24 { width: 40%; }
    @keyframes shimmer {
      0%, 100% { opacity: 1; }
      50% { opacity: 0.5; }
    }

    /* ── Footer ── */
    .modal-footer {
      display: flex;
      justify-content: flex-end;
      gap: 0.75rem;
      padding: 1.25rem 1.75rem 1.75rem;
      flex-shrink: 0;
    }
    .btn-i { font-size: 16px; width: 16px; height: 16px; }

    /* ── Responsive ── */
    @media (max-width: 640px) {
      .grid-2 { grid-template-columns: 1fr; gap: 1.5rem; }
      .modal-header { padding: 1.25rem 1.25rem 0; }
      .modal-body { padding: 1rem 1.25rem 0; }
      .modal-footer { padding: 1rem 1.25rem 1.25rem; }
    }
  `],
})
export class DialogueModifierEquipeComponent implements OnInit, OnDestroy {
  private readonly adminSvc = inject(AdminService);
  private readonly snack = inject(MatSnackBar);
  private readonly destroy$ = new Subject<void>();

  @ViewChild('chefPickerWrap') chefPickerRef!: ElementRef;
  @ViewChild('membresPickerWrap') membresPickerRef!: ElementRef;
  @ViewChild('chefInput', { read: ElementRef }) chefInputRef?: ElementRef;

  form!: { nom: string; description: string; domaine: string; statut: 'Actif' | 'Inactif' };

  // Chef picker
  chefs: User[] = [];
  queryChef = '';
  candidatsChef: User[] = [];
  showDropdownChef = false;
  chargementChef = false;
  hiChef = 0;
  touchedChef = false;
  readonly searchChef$ = new Subject<string>();

  // Members picker
  membres: User[] = [];
  queryMembres = '';
  candidatsMembres: User[] = [];
  showDropdownMembres = false;
  chargementMembres = false;
  hiMembres = 0;
  readonly searchMembres$ = new Subject<string>();

  readonly chefPlaceholder = "Chercher un chef d'équipe…";

  constructor(
    public ref: MatDialogRef<DialogueModifierEquipeComponent>,
    @Inject(MAT_DIALOG_DATA) public equipe: Equipe,
  ) {}

  ngOnInit() {
    this.form = {
      nom: this.equipe.nom,
      description: this.equipe.description ?? '',
      domaine: this.equipe.domaine,
      statut: this.equipe.statut,
    };
    if (this.equipe.chef) {
      this.chefs = [this.equipe.chef];
    }
    if (this.equipe.members?.length) {
      this.membres = this.equipe.chef
        ? this.equipe.members.filter((m) => m.id !== this.equipe.chef!.id)
        : [...this.equipe.members];
    }

    // Chef search
    this.searchChef$.pipe(
      debounceTime(300),
      distinctUntilChanged(),
      switchMap((q) => {
        if (q.trim().length < 2) { this.candidatsChef = []; this.chargementChef = false; return of(null); }
        this.chargementChef = true;
        return this.adminSvc.chercherUtilisateursEligibles(q, this.equipe.id, 'CHEF');
      }),
      takeUntil(this.destroy$),
    ).subscribe({
      next: (res) => {
        this.chargementChef = false;
        if (!res) { this.candidatsChef = []; return; }
        this.candidatsChef = res.content.filter((u) => !this.chefs.find((s) => s.id === u.id));
        this.hiChef = 0;
      },
      error: () => { this.chargementChef = false; },
    });

    // Member search
    this.searchMembres$.pipe(
      debounceTime(300),
      distinctUntilChanged(),
      switchMap((q) => {
        if (q.trim().length < 2) { this.candidatsMembres = []; this.chargementMembres = false; return of(null); }
        this.chargementMembres = true;
        return this.adminSvc.chercherUtilisateursEligibles(q, this.equipe.id, 'MEMBER');
      }),
      takeUntil(this.destroy$),
    ).subscribe({
      next: (res) => {
        this.chargementMembres = false;
        if (!res) { this.candidatsMembres = []; return; }
        this.candidatsMembres = res.content.filter((u) => !this.membres.find((s) => s.id === u.id) && !this.chefs.find((c) => c.id === u.id));
        this.hiMembres = 0;
      },
      error: () => { this.chargementMembres = false; },
    });
  }

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
  }

  /* ── Chef picker ── */

  focusChefInput() {
    this.chefInputRef?.nativeElement?.focus();
  }

  onChefQueryChange(q: string) { this.searchChef$.next(q); this.showDropdownChef = true; this.hiChef = 0; }

  selectionnerChef(u: User) {
    this.chefs = [u];
    this.touchedChef = false;
    if (!this.membres.find((m) => m.id === u.id)) {
      this.membres = [...this.membres, u];
    }
    this.queryChef = '';
    this.candidatsChef = [];
    this.showDropdownChef = false;
  }

  retirerChef() {
    const ancien = this.chefs[0];
    this.chefs = [];
    if (ancien) {
      this.membres = this.membres.filter((m) => m.id !== ancien.id);
    }
  }

  onChefKeydown(e: KeyboardEvent) {
    if (e.key === 'ArrowDown' && this.showDropdownChef && this.candidatsChef.length) {
      e.preventDefault(); this.hiChef = (this.hiChef + 1) % this.candidatsChef.length;
    }
    if (e.key === 'ArrowUp' && this.showDropdownChef && this.candidatsChef.length) {
      e.preventDefault(); this.hiChef = (this.hiChef - 1 + this.candidatsChef.length) % this.candidatsChef.length;
    }
    if (e.key === 'Enter' && this.showDropdownChef && this.candidatsChef.length) {
      e.preventDefault(); this.selectionnerChef(this.candidatsChef[this.hiChef]);
    }
    if (e.key === 'Escape') { this.showDropdownChef = false; }
    if (e.key === 'Backspace' && !this.queryChef && this.chefs.length) { this.retirerChef(); }
  }

  get membresSansChef(): User[] {
    if (!this.chefs.length) return this.membres;
    return this.membres.filter((m) => m.id !== this.chefs[0].id);
  }

  /* ── Members picker ── */

  onMembresQueryChange(q: string) { this.searchMembres$.next(q); this.showDropdownMembres = true; this.hiMembres = 0; }

  estSelectionne(u: User): boolean {
    return this.membres.some((m) => m.id === u.id);
  }

  basculerMembre(u: User) {
    const idx = this.membres.findIndex((m) => m.id === u.id);
    if (idx >= 0) {
      this.membres.splice(idx, 1);
      this.candidatsMembres.unshift(u);
    } else {
      this.membres.push(u);
      this.candidatsMembres = this.candidatsMembres.filter((c) => c.id !== u.id);
    }
    this.membres = [...this.membres];
    this.candidatsMembres = [...this.candidatsMembres];
  }

  retirerMembre(u: User) {
    if (this.chefs.length && this.chefs[0].id === u.id) return;
    this.membres = this.membres.filter((m) => m.id !== u.id);
  }

  onMembresKeydown(e: KeyboardEvent) {
    if (e.key === 'ArrowDown' && this.showDropdownMembres && this.candidatsMembres.length) {
      e.preventDefault(); this.hiMembres = (this.hiMembres + 1) % this.candidatsMembres.length;
    }
    if (e.key === 'ArrowUp' && this.showDropdownMembres && this.candidatsMembres.length) {
      e.preventDefault(); this.hiMembres = (this.hiMembres - 1 + this.candidatsMembres.length) % this.candidatsMembres.length;
    }
    if (e.key === 'Enter' && this.showDropdownMembres && this.candidatsMembres.length) {
      e.preventDefault(); this.basculerMembre(this.candidatsMembres[this.hiMembres]);
    }
    if (e.key === 'Escape') { this.showDropdownMembres = false; }
  }

  /* ── Outside click ── */

  @HostListener('document:mousedown', ['$event'])
  onDocClick(e: MouseEvent) {
    if (this.chefPickerRef && !this.chefPickerRef.nativeElement.contains(e.target)) {
      this.showDropdownChef = false;
    }
    if (this.membresPickerRef && !this.membresPickerRef.nativeElement.contains(e.target)) {
      this.showDropdownMembres = false;
    }
  }

  /* ── Submit ── */

  submit() {
    if (!this.form.nom.trim() || !this.form.description.trim() || !this.form.domaine.trim()) {
      return;
    }
    const chef = this.chefs[0] ?? null;
    const membreIds = this.membres
      .filter((m) => !chef || m.id !== chef.id)
      .map((m) => m.id);
    const updated: Equipe = {
      ...this.equipe,
      ...this.form,
      description: this.form.description.trim(),
      chef: chef ?? null,
      chefId: chef?.id ?? null,
      memberIds: membreIds.length ? membreIds : null,
      emailChef: chef ? chef.email : undefined,
    };
    this.ref.close(updated);
  }

  /* ── Helpers ── */

  initiales(u: User): string {
    return `${u.prenom ?? ''} ${u.nom ?? ''}`.trim().split(' ').map((p) => p[0]?.toUpperCase() ?? '').slice(0, 2).join('');
  }

  couleurAvatar(u: User): string {
    const colors = ['#E63946', '#0ea5e9', '#10b981', '#f59e0b', '#6366f1', '#8b5cf6', '#ec4899'];
    const idx = String(u.id).split('').reduce((a, c) => a + c.charCodeAt(0), 0) % colors.length;
    return colors[idx];
  }
}
