import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatDialogRef, MatDialogModule } from '@angular/material/dialog';
import { SelecteurPersonnesComponent } from '../selecteur-personnes/selecteur-personnes.component';
import { Equipe } from '../../../core/models/equipe.model';
import { User } from '../../../core/models/user.model';
import { ButtonComponent } from '../../../ui/button/button.component';
import { LabelComponent } from '../../../ui/label/label.component';

@Component({
  selector: 'app-dialogue-creer-equipe',
  standalone: true,
  imports: [
    CommonModule, FormsModule, MatDialogModule,
    SelecteurPersonnesComponent, ButtonComponent, LabelComponent,
  ],
  template: `
    <div class="dialog-content-wrapper">
      <div class="dialog-header">
        <h2 class="dialog-title">Nouvelle équipe de recherche</h2>
        <p class="dialog-desc">Vous pouvez créer une équipe sans chef et le désigner plus tard.</p>
      </div>

      <form (ngSubmit)="submit()" class="dialog-form">
        <div class="field">
          <app-label for="nom">Nom de l'équipe <span class="req">*</span></app-label>
          <input id="nom" name="nom" [(ngModel)]="form.nom" #nomRef="ngModel" required placeholder="Ex: AI Research Lab" class="inp" />
        </div>

        <div class="field">
          <app-label for="description">Description</app-label>
          <textarea id="description" name="description" [(ngModel)]="form.description" rows="3" class="inp ta"></textarea>
        </div>

        <div class="field">
          <app-label for="domaine">Domaine de recherche <span class="req">*</span></app-label>
          <input id="domaine" name="domaine" [(ngModel)]="form.domaine" required placeholder="Ex: Intelligence Artificielle" class="inp" />
        </div>

        <div class="field">
          <app-label>Chef d'équipe <span class="opt">(optionnel)</span></app-label>
          <app-selecteur-personnes [(selected)]="chefs" [max]="1" />
          <p class="hint">Tapez un nom ou un email — la sélection fonctionne comme Gmail.</p>
        </div>

        <div class="dialog-actions">
          <button type="button" app-button variant="outline" (click)="ref.close()">Annuler</button>
          <button type="submit" app-button variant="default" [disabled]="!form.nom.trim() || !form.domaine.trim()">
            Créer l'équipe
          </button>
        </div>
      </form>
    </div>
  `,
  styles: [`
    :host { display: block; max-width: 32rem; }
    .dialog-content-wrapper { padding: 1.5rem; }
    .dialog-header { margin-bottom: 1.5rem; }
    .dialog-title { margin: 0; font-size: 1.125rem; font-weight: 600; line-height: 1; }
    .dialog-desc { margin: 0.5rem 0 0; font-size: 0.875rem; color: var(--muted-foreground); }
    .dialog-form { display: flex; flex-direction: column; gap: 1rem; }
    .field { display: flex; flex-direction: column; gap: 0.375rem; }
    .req { color: #ef4444; }
    .opt { font-weight: 400; color: var(--muted-foreground); font-size: 0.75rem; }
    .inp {
      width: 100%; padding: 0 0.75rem; height: 2.25rem;
      border-radius: calc(var(--radius) - 2px);
      border: 1px solid var(--input); background: transparent;
      font-size: 0.875rem; font-family: inherit; color: var(--foreground);
      outline: none; box-sizing: border-box;
      transition: border-color 0.15s, box-shadow 0.15s;
    }
    .inp:focus { border-color: var(--ring); box-shadow: 0 0 0 1px var(--ring); }
    .inp::placeholder { color: var(--muted-foreground); }
    .ta { height: auto; min-height: 3.75rem; padding: 0.5rem 0.75rem; resize: vertical; }
    .hint { margin: 0; font-size: 0.6875rem; color: var(--muted-foreground); }
    .dialog-actions {
      display: flex; justify-content: flex-end; gap: 0.5rem;
      padding-top: 0.5rem;
    }
  `],
})
export class DialogueCreerEquipeComponent {
  form = { nom: '', description: '', domaine: '' };
  chefs: User[] = [];

  constructor(public ref: MatDialogRef<DialogueCreerEquipeComponent>) {}

  submit() {
    const chef = this.chefs[0];
    const payload: Omit<Equipe, 'id'> = {
      nom: this.form.nom.trim(),
      description: this.form.description.trim() || null,
      domaine: this.form.domaine.trim(),
      chef: chef ?? null,
      emailChef: chef?.email,
      nbMembres: chef ? 1 : 0,
      createdAt: new Date().toISOString().slice(0, 10),
      statut: 'Actif',
    };
    this.ref.close(payload);
  }
}
