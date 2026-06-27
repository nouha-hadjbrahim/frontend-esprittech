import { Component, OnInit, OnDestroy, HostListener, ViewChild, ElementRef, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatDialogRef, MatDialogModule } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { Subject, debounceTime, distinctUntilChanged, switchMap, of } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { CreateEquipePayload } from '../../../core/models/equipe.model';
import { User } from '../../../core/models/user.model';
import { EquipeDomaine } from '../../../core/models/equipe-domaine.model';
import { EquipeService } from '../../../core/services/equipe.service';
import { EquipeDomaineService } from '../../../core/services/equipe-domaine.service';
import { ButtonComponent } from '../../../ui/button/button.component';
import { LabelComponent } from '../../../ui/label/label.component';

@Component({
  selector: 'app-dialogue-creer-equipe',
  standalone: true,
  imports: [
    CommonModule, FormsModule, MatDialogModule, MatIconModule,
    ButtonComponent, LabelComponent,
  ],
  template: `
    <div class="modal">
      <div class="modal-header">
        <div class="modal-header-text">
          <h1 class="modal-title">Nouvelle équipe de recherche</h1>
          <p class="modal-subtitle">Créez une équipe et désignez un chef plus tard si nécessaire.</p>
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

            <div class="field">
              <app-label for="e-domaine">Domaine de recherche <span class="req">*</span></app-label>
              <div class="sel-wrap">
                <select id="e-domaine" name="domaineId" [(ngModel)]="domaineId" required class="inp sel">
                  <option [ngValue]="null" disabled>Sélectionnez un domaine…</option>
                  <option *ngFor="let d of domaines" [ngValue]="d.id">{{ d.nom }}</option>
                </select>
                <mat-icon class="sel-arrow">expand_more</mat-icon>
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
              <app-label>Membres <span class="opt">(optionnel)</span></app-label>

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
              <p class="hint">Les membres doivent avoir le rôle Enseignant et ne pas être déjà dans une équipe.</p>
            </div>
          </div>
        </form>
      </div>

      <div class="modal-footer">
        <button type="button" app-button variant="outline" (click)="ref.close()">Annuler</button>
        <button type="submit" app-button variant="default" (click)="submit()" [disabled]="!form.nom.trim() || !form.description.trim() || !domaineId">
          <mat-icon class="btn-i">add</mat-icon> Créer l'équipe
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
      max-height: 680px;
      padding: 0;
      overflow: hidden;
    }

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

    .hint { margin: 0; font-size: 0.6875rem; color: var(--muted-foreground, #64748b); }

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

    .modal-footer {
      display: flex;
      justify-content: flex-end;
      gap: 0.75rem;
      padding: 1.25rem 1.75rem 1.75rem;
      flex-shrink: 0;
    }
    .btn-i { font-size: 16px; width: 16px; height: 16px; }

    @media (max-width: 640px) {
      .modal-header { padding: 1.25rem 1.25rem 0; }
      .modal-body { padding: 1rem 1.25rem 0; }
      .modal-footer { padding: 1rem 1.25rem 1.25rem; }
    }
  `],
})
export class DialogueCreerEquipeComponent implements OnInit, OnDestroy {
  private readonly equipeSvc = inject(EquipeService);
  private readonly domaineSvc = inject(EquipeDomaineService);
  private readonly destroy$ = new Subject<void>();

  @ViewChild('chefPickerWrap') chefPickerRef!: ElementRef;
  @ViewChild('membresPickerWrap') membresPickerRef!: ElementRef;
  @ViewChild('chefInput', { read: ElementRef }) chefInputRef?: ElementRef;

  form = { nom: '', description: '' };
  domaines: EquipeDomaine[] = [];
  domaineId: number | null = null;

  // Chef picker
  chefs: User[] = [];
  queryChef = '';
  candidatsChef: User[] = [];
  showDropdownChef = false;
  chargementChef = false;
  hiChef = 0;
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

  constructor(public ref: MatDialogRef<DialogueCreerEquipeComponent>) {}

  ngOnInit() {
    this.domaineSvc.getAll().subscribe({
      next: (domaines) => { this.domaines = domaines; },
    });

    this.searchChef$.pipe(
      debounceTime(300),
      distinctUntilChanged(),
      switchMap((q) => {
        if (q.trim().length < 2) { this.candidatsChef = []; this.chargementChef = false; return of(null); }
        this.chargementChef = true;
        return this.equipeSvc.chercherUtilisateursEligibles(q, null, 'CHEF');
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

    this.searchMembres$.pipe(
      debounceTime(300),
      distinctUntilChanged(),
      switchMap((q) => {
        if (q.trim().length < 2) { this.candidatsMembres = []; this.chargementMembres = false; return of(null); }
        this.chargementMembres = true;
        return this.equipeSvc.chercherUtilisateursEligibles(q, null, 'MEMBER');
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
      if (this.chefs.length && this.chefs[0].id === u.id) return;
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
    if (!this.form.nom.trim() || !this.form.description.trim() || !this.domaineId) return;
    const chef = this.chefs[0];
    const membreIds = this.membres
      .filter((m) => !chef || m.id !== chef.id)
      .map((m) => m.id);
    const payload: CreateEquipePayload = {
      nom: this.form.nom.trim(),
      description: this.form.description.trim(),
      domaineId: this.domaineId,
      chefId: chef?.id ?? null,
      memberIds: membreIds.length ? membreIds : null,
    };
    this.ref.close(payload);
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
