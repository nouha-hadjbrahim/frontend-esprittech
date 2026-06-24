import {
  Component, Input, Output, EventEmitter, OnDestroy, OnInit, inject,
  ViewChild, ElementRef, forwardRef, HostListener,
} from '@angular/core';
import {
  ControlValueAccessor, NG_VALUE_ACCESSOR, FormsModule,
} from '@angular/forms';
import { CommonModule } from '@angular/common';
import { Subject, debounceTime, distinctUntilChanged, switchMap, of } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { MatIconModule } from '@angular/material/icon';
import { AdminService } from '../../../core/services/admin.service';
import { User } from '../../../core/models/user.model';
import { BadgeComponent } from '../../../ui/badge/badge.component';

@Component({
  selector: 'app-selecteur-personnes',
  standalone: true,
  imports: [CommonModule, FormsModule, MatIconModule, BadgeComponent],
  providers: [{
    provide: NG_VALUE_ACCESSOR,
    useExisting: forwardRef(() => SelecteurPersonnesComponent),
    multi: true,
  }],
  template: `
    <div class="picker-container" #container>
      <div class="picker-wrap" [class.focused]="isFocused" (click)="focusInput()">
        <span *ngFor="let u of selected" class="chip">
          <span class="avatar sm" [style.background]="couleurAvatar(u)">{{ initiales(u) }}</span>
          {{ nomComplet(u) }}
          <button type="button" class="chip-remove" (click)="retirer(u); $event.stopPropagation()">
            <mat-icon class="chip-x">close</mat-icon>
          </button>
        </span>

        <input
          #inputEl
          *ngIf="selected.length < max"
          [(ngModel)]="query"
          (ngModelChange)="onQueryChange($event)"
          (focus)="isFocused = true; showDropdown = true"
          (blur)="onBlur()"
          (keydown)="onKeydown($event)"
          [placeholder]="selected.length ? '' : placeholder"
          class="picker-input"
          autocomplete="off"
        />
      </div>

      <div class="picker-dropdown" *ngIf="showDropdown && (candidats.length > 0 || chargement)">
        <div *ngIf="chargement" class="drop-state">Recherche en cours…</div>
        <ul *ngIf="!chargement">
          <li
            *ngFor="let u of candidats; let i = index"
            [class.hi]="i === hi"
            (mouseenter)="hi = i"
            (mousedown)="picker(u)"
          >
            <span class="avatar lg" [style.background]="couleurAvatar(u)">{{ initiales(u) }}</span>
            <span class="user-info">
              <span class="uname">{{ nomComplet(u) }}</span>
              <span class="uemail">{{ u.email }}</span>
            </span>
            <app-badge variant="outline" class="badge-xs">{{ u.role }}</app-badge>
          </li>
        </ul>
      </div>

      <p *ngIf="!chargement && query.length >= 2 && candidats.length === 0 && showDropdown" class="no-result">
        Aucun résultat pour "{{ query }}"
      </p>
    </div>
  `,
  styles: [`
    :host { display: block; }
    .picker-container { position: relative; }

    .picker-wrap {
      min-height: 2.5rem; display: flex; flex-wrap: wrap; align-items: center;
      gap: 0.375rem; padding: 0.375rem 0.5rem;
      border: 1px solid var(--input); border-radius: calc(var(--radius) - 2px);
      background: var(--background); cursor: text;
      transition: box-shadow 0.15s;
    }
    .picker-wrap.focused { box-shadow: 0 0 0 2px var(--ring); }

    .chip {
      display: inline-flex; align-items: center; gap: 0.375rem;
      padding: 0.125rem 0.375rem 0.125rem 0.25rem; border-radius: 999px;
      background: #fef2f2; color: var(--primary);
      font-size: 0.75rem; font-weight: 500;
      border: 1px solid #fecaca;
    }
    .chip-remove {
      background: none; border: none; cursor: pointer;
      display: flex; align-items: center; color: var(--primary);
      padding: 0; border-radius: 50%;
    }
    .chip-remove:hover { background: rgba(230,57,70,0.1); }
    .chip-x { font-size: 12px; width: 12px; height: 12px; line-height: 12px; }

    .avatar {
      border-radius: 50%; display: inline-grid; place-items: center;
      font-weight: 600; color: #fff; flex-shrink: 0;
    }
    .avatar.sm { width: 20px; height: 20px; font-size: 10px; }
    .avatar.lg { width: 36px; height: 36px; font-size: 12px; }

    .picker-input {
      flex: 1; min-width: 140px; border: none; outline: none;
      font-size: 0.875rem; background: transparent; padding: 0.25rem 0;
      color: var(--foreground);
    }
    .picker-input::placeholder { color: var(--muted-foreground); }

    .picker-dropdown {
      position: absolute; left: 0; right: 0; margin-top: 0.375rem; z-index: 50;
      background: var(--popover); border: 1px solid var(--border);
      border-radius: calc(var(--radius) + 2px);
      box-shadow: 0 4px 16px rgba(0,0,0,0.1); overflow: hidden;
    }
    ul { list-style: none; margin: 0; padding: 0.25rem 0; max-height: 18rem; overflow-y: auto; }
    li {
      display: flex; align-items: center; gap: 0.75rem; padding: 0.5rem 0.75rem;
      cursor: pointer; transition: background 0.1s;
    }
    li.hi { background: var(--muted); }
    .drop-state { padding: 0.75rem 1rem; font-size: 0.8125rem; color: var(--muted-foreground); }

    .user-info { flex: 1; min-width: 0; }
    .uname { display: block; font-size: 0.8125rem; font-weight: 500; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
    .uemail { display: block; font-size: 0.6875rem; color: var(--muted-foreground); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }

    .badge-xs { font-size: 0.625rem; padding: 0 0.5rem; height: 1.25rem; flex-shrink: 0; }
    .no-result { margin: 0.25rem 0 0; font-size: 0.6875rem; color: var(--muted-foreground); }
  `],
})
export class SelecteurPersonnesComponent implements ControlValueAccessor, OnInit, OnDestroy {
  @Input() max = 1;
  @Input() selected: User[] = [];
  @Input() placeholder = 'Tapez un nom ou un email…';
  @Output() selectedChange = new EventEmitter<User[]>();

  @ViewChild('inputEl') inputEl!: ElementRef<HTMLInputElement>;
  @ViewChild('container', { read: ElementRef }) containerEl!: ElementRef<HTMLElement>;

  private readonly adminSvc = inject(AdminService);
  private readonly destroy$ = new Subject<void>();
  private readonly search$ = new Subject<string>();

  query = '';
  candidats: User[] = [];
  hi = 0;
  showDropdown = false;
  isFocused = false;
  chargement = false;

  private onChange = (_: User[]) => {};
  private onTouched = () => {};
  writeValue(v: User[]) { if (v) this.selected = v; }
  registerOnChange(fn: any) { this.onChange = fn; }
  registerOnTouched(fn: any) { this.onTouched = fn; }

  ngOnInit() {
    this.search$.pipe(
      debounceTime(300),
      distinctUntilChanged(),
      switchMap((q) => {
        if (q.trim().length < 2) { this.candidats = []; this.chargement = false; return of(null); }
        this.chargement = true;
        return this.adminSvc.chercherUtilisateurs(q);
      }),
      takeUntil(this.destroy$),
    ).subscribe((res) => {
      this.chargement = false;
      if (!res) { this.candidats = []; return; }
      this.candidats = res.content.filter((u) => !this.selected.find((s) => s.id === u.id));
      this.hi = 0;
    });
  }

  @HostListener('document:mousedown', ['$event'])
  onDocumentClick(event: MouseEvent) {
    if (this.containerEl && !this.containerEl.nativeElement.contains(event.target as Node)) {
      this.showDropdown = false;
    }
  }

  onQueryChange(q: string) { this.search$.next(q); this.showDropdown = true; this.hi = 0; }

  picker(u: User) {
    const next = this.max === 1 ? [u] : [...this.selected, u];
    this.selected = next;
    this.selectedChange.emit(next);
    this.onChange(next);
    this.query = '';
    this.candidats = [];
    this.showDropdown = false;
    setTimeout(() => this.inputEl?.nativeElement?.focus());
  }

  retirer(u: User) {
    const next = this.selected.filter((s) => s.id !== u.id);
    this.selected = next;
    this.selectedChange.emit(next);
    this.onChange(next);
  }

  onKeydown(e: KeyboardEvent) {
    if (e.key === 'ArrowDown' && this.showDropdown && this.candidats.length) {
      e.preventDefault(); this.hi = (this.hi + 1) % this.candidats.length;
    }
    if (e.key === 'ArrowUp' && this.showDropdown && this.candidats.length) {
      e.preventDefault(); this.hi = (this.hi - 1 + this.candidats.length) % this.candidats.length;
    }
    if (e.key === 'Enter' && this.showDropdown && this.candidats.length) {
      e.preventDefault(); this.picker(this.candidats[this.hi]);
    }
    if (e.key === 'Backspace' && !this.query && this.selected.length) {
      this.retirer(this.selected[this.selected.length - 1]);
    }
    if (e.key === 'Escape') { this.showDropdown = false; }
  }

  onBlur() {
    this.isFocused = false;
    this.onTouched();
  }

  nomComplet(u: User): string {
    return `${u.prenom} ${u.nom}`.trim();
  }

  initiales(u: User): string {
    return this.nomComplet(u).split(' ').map((p) => p[0]?.toUpperCase() ?? '').slice(0, 2).join('');
  }

  couleurAvatar(u: User): string {
    const colors = ['#E63946', '#0ea5e9', '#10b981', '#f59e0b', '#6366f1', '#8b5cf6', '#ec4899'];
    const idx = String(u.id).split('').reduce((a, c) => a + c.charCodeAt(0), 0) % colors.length;
    return colors[idx];
  }

  focusInput() {
    if (this.inputEl) { this.inputEl.nativeElement.focus(); }
  }

  ngOnDestroy() { this.destroy$.next(); this.destroy$.complete(); }
}
