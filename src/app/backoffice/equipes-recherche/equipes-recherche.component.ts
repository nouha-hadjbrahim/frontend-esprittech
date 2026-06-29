import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatDialog } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { finalize } from 'rxjs';

import { EquipeService } from '../../core/services/equipe.service';
import { CreateEquipePayload, Equipe } from '../../core/models/equipe.model';

import { ButtonComponent } from '../../ui/button/button.component';
import { BadgeComponent } from '../../ui/badge/badge.component';
import { CardComponent, CardContentComponent } from '../../ui/card/card.component';
import { InputComponent } from '../../ui/input/input.component';
import { DialogueCreerEquipeComponent } from './dialogue-creer-equipe/dialogue-creer-equipe.component';
import { DialogueModifierEquipeComponent } from './dialogue-modifier-equipe/dialogue-modifier-equipe.component';
import { DialogueDetailsEquipeComponent } from './dialogue-details-equipe/dialogue-details-equipe.component';
import { DialogueAssignerChefComponent } from './dialogue-assigner-chef/dialogue-assigner-chef.component';
import { DialogueConfirmationComponent } from '../../ui/dialogue-confirmation/dialogue-confirmation.component';


@Component({
  selector: 'app-equipes-recherche',
  standalone: true,
  imports: [
    CommonModule, FormsModule,
    MatIconModule, MatTooltipModule,
    ButtonComponent, BadgeComponent,
    CardComponent, CardContentComponent,
    InputComponent,
  ],
  templateUrl: './equipes-recherche.component.html',
  styleUrls: ['./equipes-recherche.component.css'],
})
export class EquipesRechercheComponent implements OnInit {
  private readonly svc    = inject(EquipeService);
  private readonly dialog = inject(MatDialog);
  private readonly snack  = inject(MatSnackBar);

  readonly equipes    = signal<Equipe[]>([]);
  filtered: Equipe[]  = [];
  query   = '';
  vue: 'grille' | 'liste' = 'grille';
  chargement = true;

  readonly nbActives  = computed(() => this.equipes().filter((e) => e.statut === 'Actif').length);
  readonly totalMembres = computed(() => this.equipes().reduce((a, b) => a + b.nbMembres, 0));
  readonly nbChefs = computed(() => this.equipes().filter((e) => !!e.chef).length);

  stats = computed(() => [
    { label: 'Équipes actives', value: this.nbActives(), color: 'vert', icon: 'groups' },
    { label: 'Membres totaux', value: this.totalMembres(), color: 'bleu', icon: 'groups' },
    { label: 'Chefs désignés', value: this.nbChefs(), color: 'rouge', icon: 'star' },
  ]);

  ngOnInit() {
    this.charger();
  }

  // ═══════════════════════════════════════════════════════════════
  // Equipes tab
  // ═══════════════════════════════════════════════════════════════

  charger() {
    this.chargement = true;
    this.svc.getAll().pipe(finalize(() => (this.chargement = false))).subscribe({
      next: (data) => { this.equipes.set(data); this.appliquerFiltre(); },
      error: () => this.toast('Erreur lors du chargement des équipes'),
    });
  }

  appliquerFiltre() {
    const q = this.query.toLowerCase().trim();
    this.filtered = !q
      ? this.equipes()
      : this.equipes().filter(
          (e) =>
            e.nom.toLowerCase().includes(q) ||
            (e.chef ? `${e.chef.prenom} ${e.chef.nom}`.toLowerCase().includes(q) : false) ||
            e.domaine.toLowerCase().includes(q),
        );
  }

  ouvrirCreation() {
    this.dialog.open(DialogueCreerEquipeComponent, { width: '520px' })
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
    this.dialog.open(DialogueModifierEquipeComponent, { width: '520px', data: equipe })
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
    const ref = this.dialog.open(DialogueAssignerChefComponent, { width: '480px', data: equipe });
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
