import { Component, OnInit, HostListener, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatDialog } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { finalize } from 'rxjs';

import { EquipeService } from '../../core/services/equipe.service';
import { AffiliationService } from '../../core/services/affiliation.service';
import { CreateEquipePayload, Equipe } from '../../core/models/equipe.model';
import { AffiliationEnseignantResponse } from '../../core/models/affiliation-request.model';

import { DialogueCreerEquipeComponent } from './dialogue-creer-equipe/dialogue-creer-equipe.component';
import { DialogueModifierEquipeComponent } from './dialogue-modifier-equipe/dialogue-modifier-equipe.component';
import { DialogueDetailsEquipeComponent } from './dialogue-details-equipe/dialogue-details-equipe.component';
import { DialogueAssignerChefComponent } from './dialogue-assigner-chef/dialogue-assigner-chef.component';
import { DialogueConfirmationComponent } from '../../ui/dialogue-confirmation/dialogue-confirmation.component';

type FilterKey = 'statut';

@Component({
  selector: 'app-equipes-recherche',
  standalone: true,
  imports: [
    CommonModule, FormsModule,
    MatIconModule, MatTooltipModule,
  ],
  templateUrl: './equipes-recherche.component.html',
  styleUrl: './equipes-recherche.component.css',
})
export class EquipesRechercheComponent implements OnInit {
  private readonly svc        = inject(EquipeService);
  private readonly affSvc    = inject(AffiliationService);
  private readonly dialog    = inject(MatDialog);
  private readonly snack     = inject(MatSnackBar);

  readonly equipes           = signal<Equipe[]>([]);
  readonly affiliations      = signal<AffiliationEnseignantResponse[]>([]);
  filtered: Equipe[]         = [];
  query   = '';
  selectedStatut = '';
  vue: 'grille' | 'liste' = 'liste';
  chargement = true;
  page = 0;
  readonly pageSize = 8;
  readonly openFilter = signal<FilterKey | null>(null);

  readonly statutOptions = [
    { value: '', label: 'Tous les statuts' },
    { value: 'Actif', label: 'Actif' },
    { value: 'Inactif', label: 'Inactif' },
  ];

  private readonly domaineColors = ['badge--pfe', 'badge--stage', 'badge--rdi', 'badge--domaine-teal', 'badge--domaine-violet'];

  readonly pendingCountByEquipeId = computed(() => {
    const map = new Map<number, number>();
    for (const r of this.affiliations()) {
      if (r.statut === 'EN_ATTENTE') {
        map.set(r.equipeId, (map.get(r.equipeId) ?? 0) + 1);
      }
    }
    return map;
  });

  readonly nbActives  = computed(() => this.equipes().filter((e) => e.statut === 'Actif').length);
  readonly totalMembres = computed(() => this.equipes().reduce((a, b) => a + b.nbMembres, 0));
  readonly nbChefs = computed(() => this.equipes().filter((e) => !!e.chef).length);

  stats = computed(() => [
    { label: 'Équipes actives', value: this.nbActives(), icon: 'teams' as const },
    { label: 'Membres totaux', value: this.totalMembres(), icon: 'members' as const },
    { label: 'Chefs désignés', value: this.nbChefs(), icon: 'chefs' as const },
  ]);

  get statutFilterLabel(): string {
    return this.statutOptions.find((o) => o.value === this.selectedStatut)?.label ?? 'Tous les statuts';
  }

  get totalElements(): number {
    return this.filtered.length;
  }

  get totalPages(): number {
    return Math.max(1, Math.ceil(this.totalElements / this.pageSize));
  }

  get first(): boolean {
    return this.page <= 0;
  }

  get last(): boolean {
    return this.page >= this.totalPages - 1;
  }

  get pagedItems(): Equipe[] {
    const start = this.page * this.pageSize;
    return this.filtered.slice(start, start + this.pageSize);
  }

  get pageDisplayCount(): number {
    return this.pagedItems.length;
  }

  get pageNumbers(): number[] {
    return Array.from({ length: this.totalPages }, (_, i) => i + 1);
  }

  getInitial(nom: string): string {
    return (nom?.trim()?.charAt(0) || '?').toUpperCase();
  }

  domaineBadgeClass(domaine: string): string {
    const key = (domaine || '').toLowerCase();
    let hash = 0;
    for (let i = 0; i < key.length; i++) {
      hash = (hash + key.charCodeAt(i) * (i + 1)) % this.domaineColors.length;
    }
    return this.domaineColors[hash];
  }

  statutBadgeClass(statut: string): string {
    return statut === 'Actif' ? 'badge--statut-actif' : 'badge--statut-inactif';
  }

  @HostListener('document:click')
  closeFiltersOnOutsideClick(): void {
    this.openFilter.set(null);
  }

  toggleFilter(filter: FilterKey, event: Event): void {
    event.stopPropagation();
    this.openFilter.update((current) => (current === filter ? null : filter));
  }

  selectStatutFilter(value: string): void {
    this.selectedStatut = value;
    this.openFilter.set(null);
    this.appliquerFiltre();
  }

  ngOnInit() {
    this.charger();
  }

  charger() {
    this.chargement = true;
    this.svc.getAll().pipe(finalize(() => (this.chargement = false))).subscribe({
      next: (data) => {
        this.equipes.set(data);
        this.appliquerFiltre();
        this.affSvc.getAll().subscribe({
          next: (affs) => this.affiliations.set(affs),
        });
      },
      error: () => this.toast('Erreur lors du chargement des équipes'),
    });
  }

  appliquerFiltre() {
    const q = this.query.toLowerCase().trim();
    this.filtered = this.equipes().filter((e) => {
      const matchStatut = !this.selectedStatut || e.statut === this.selectedStatut;
      const matchQuery = !q
        || e.nom.toLowerCase().includes(q)
        || (e.chef ? `${e.chef.prenom} ${e.chef.nom}`.toLowerCase().includes(q) : false)
        || e.domaine.toLowerCase().includes(q);
      return matchStatut && matchQuery;
    });
    this.page = 0;
  }

  prevPage(): void {
    if (!this.first) this.page--;
  }

  nextPage(): void {
    if (!this.last) this.page++;
  }

  goToPage(newPage: number): void {
    if (newPage < 0 || newPage >= this.totalPages) return;
    this.page = newPage;
  }

  private clampPage(): void {
    if (this.page > this.totalPages - 1) {
      this.page = Math.max(0, this.totalPages - 1);
    }
  }

  ouvrirCreation() {
    this.dialog.open(DialogueCreerEquipeComponent, {
      width: '520px',
      panelClass: 'equipe-form-dialog',
      autoFocus: false,
    })
      .afterClosed()
      .subscribe((payload: CreateEquipePayload | undefined) => {
        if (!payload) return;
        this.svc.creer(payload).subscribe({
          next: (created) => {
            this.equipes.update((arr) => [created, ...arr]);
            this.appliquerFiltre();
            this.toast(payload.chefId ? 'Équipe créée avec chef' : 'Équipe créée — chef à désigner plus tard', 'succes');
          },
          error: () => this.toast('Erreur lors de la création'),
        });
      });
  }

  ouvrirDetails(equipe: Equipe) {
    const ref = this.dialog.open(DialogueDetailsEquipeComponent, { width: '520px', data: equipe });
    ref.afterClosed().subscribe((r) => {
      if (r === 'edit') this.ouvrirModification(equipe);
      if (r === 'updated') this.charger();
    });
  }

  ouvrirModification(equipe: Equipe) {
    this.dialog.open(DialogueModifierEquipeComponent, {
      width: '520px',
      data: equipe,
      panelClass: 'equipe-form-dialog',
      autoFocus: false,
    })
      .afterClosed()
      .subscribe((updated: Equipe | undefined) => {
        if (!updated) return;
        this.svc.modifier(updated.id, updated).subscribe({
          next: (saved) => {
            this.equipes.update((arr) => arr.map((e) => (e.id === saved.id ? saved : e)));
            this.appliquerFiltre();
            this.toast('Équipe mise à jour', 'succes');
          },
          error: () => this.toast('Erreur lors de la mise à jour'),
        });
      });
  }

  supprimer(equipe: Equipe) {
    this.dialog.open(DialogueConfirmationComponent, {
      width: '320px',
      data: `Supprimer l'équipe « ${equipe.nom} » ?`,
    }).afterClosed().subscribe((confirmed) => {
      if (!confirmed) return;
      this.svc.supprimer(equipe.id).subscribe({
        next: () => {
          this.equipes.update((arr) => arr.filter((e) => e.id !== equipe.id));
          this.appliquerFiltre();
          this.clampPage();
          this.toast('Équipe supprimée', 'succes');
        },
        error: (err) => {
          const msg = err?.error?.detail || 'Erreur lors de la suppression';
          this.toast(msg);
        },
      });
    });
  }

  ouvrirAssignerChef(equipe: Equipe) {
    const ref = this.dialog.open(DialogueAssignerChefComponent, {
      width: '480px',
      data: equipe,
      panelClass: 'equipe-form-dialog',
      autoFocus: false,
    });
    ref.afterClosed().subscribe((updated) => {
      if (!updated) return;
      this.equipes.update((arr) => arr.map((e) => (e.id === updated.id ? updated : e)));
      this.appliquerFiltre();
      this.toast('Chef assigné avec succès', 'succes');
    });
  }

  // ═══════════════════════════════════════════════════════════════
  // Shared
  // ═══════════════════════════════════════════════════════════════

  private toast(msg: string, type: 'succes' | 'erreur' = 'erreur') {
    this.snack.open(msg, '✕', {
      duration: 3500,
      panelClass: type === 'succes' ? ['snack-success'] : ['snack-error'],
    });
  }
}
