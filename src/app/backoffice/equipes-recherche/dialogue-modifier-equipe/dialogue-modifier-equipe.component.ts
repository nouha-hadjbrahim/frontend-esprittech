import { Component, Inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatDialogRef, MAT_DIALOG_DATA, MatDialogModule } from '@angular/material/dialog';
import { SelecteurPersonnesComponent } from '../selecteur-personnes/selecteur-personnes.component';
import { Equipe } from '../../../core/models/equipe.model';
import { User } from '../../../core/models/user.model';
import { ButtonComponent } from '../../../ui/button/button.component';
import { LabelComponent } from '../../../ui/label/label.component';

@Component({
  selector: 'app-dialogue-modifier-equipe',
  standalone: true,
  imports: [
    CommonModule, FormsModule, MatDialogModule,
    SelecteurPersonnesComponent, ButtonComponent, LabelComponent,
  ],
  template: `
    <div class="dialog-content-wrapper">
      <div class="dialog-header">
        <h2 class="dialog-title">Modifier l'équipe</h2>
        <p class="dialog-desc">Mettez à jour les informations et désignez un chef si nécessaire.</p>
      </div>

      <form (ngSubmit)="submit()" class="dialog-form">
        <div class="field">
          <app-label for="e-nom">Nom <span class="req">*</span></app-label>
          <input id="e-nom" name="nom" [(ngModel)]="form.nom" required class="inp" />
        </div>

        <div class="field">
          <app-label for="e-desc">Description</app-label>
          <textarea id="e-desc" name="description" [(ngModel)]="form.description" rows="3" class="inp ta"></textarea>
        </div>

        <div class="grid-2">
          <div class="field">
            <app-label for="e-domaine">Domaine <span class="req">*</span></app-label>
            <input id="e-domaine" name="domaine" [(ngModel)]="form.domaine" required class="inp" />
          </div>
          <div class="field">
            <app-label for="e-statut">Statut</app-label>
            <select id="e-statut" name="statut" [(ngModel)]="form.statut" class="inp sel">
              <option value="Actif">Actif</option>
              <option value="Inactif">Inactif</option>
            </select>
          </div>
        </div>

        <div class="field">
          <app-label>Chef d'équipe <span class="opt">(optionnel)</span></app-label>
          <app-selecteur-personnes [(selected)]="chefs" [max]="1" />
        </div>

        <div class="dialog-actions">
          <button type="button" app-button variant="outline" (click)="ref.close()">Annuler</button>
          <button type="submit" app-button variant="default" [disabled]="!form.nom.trim() || !form.domaine.trim()">
            Enregistrer
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
    .ta { height: auto; min-height: 3.75rem; padding: 0.5rem 0.75rem; resize: vertical; }
    .sel { cursor: pointer; }
    .grid-2 { display: grid; grid-template-columns: 1fr 1fr; gap: 0.75rem; }
    .dialog-actions {
      display: flex; justify-content: flex-end; gap: 0.5rem;
      padding-top: 0.5rem;
    }
  `],
})
export class DialogueModifierEquipeComponent implements OnInit {
  form!: { nom: string; description: string; domaine: string; statut: 'Actif' | 'Inactif' };
  chefs: User[] = [];

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
  }

  submit() {
    const chef = this.chefs[0];
    const updated: Equipe = {
      ...this.equipe,
      ...this.form,
      description: this.form.description || null,
      chef: chef ?? null,
      emailChef: chef ? chef.email : undefined,
    };
    this.ref.close(updated);
  }
}
