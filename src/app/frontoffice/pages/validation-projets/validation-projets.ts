import { Component, OnInit, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { ProjetCard } from '../../../core/models/projet-catalogue.model';
import { ProjetCatalogueService } from '../../../core/services/projet-catalogue.service';
import { ConfirmDialog } from '../../../shared/components/confirm-dialog/confirm-dialog';
import { TYPE_PROJET_LABELS } from '../../constants/projet-catalogue.constants';

/**
 * Validation des projets du catalogue par le chef d'équipe.
 * Liste les projets « Soumis en validation » de son équipe et permet de les
 * Valider (confirmation) ou Refuser (motif obligatoire, ≥ 5 caractères).
 */
@Component({
  selector: 'app-validation-projets',
  imports: [FormsModule, RouterModule, ConfirmDialog],
  templateUrl: './validation-projets.html',
  styleUrl: './validation-projets.css',
})
export class ValidationProjets implements OnInit {
  private readonly projetService = inject(ProjetCatalogueService);

  readonly typeLabels = TYPE_PROJET_LABELS;

  projets: ProjetCard[] = [];
  isLoading = true;
  errorMessage = '';
  successMessage = '';
  actionLoadingId: number | null = null;

  // Confirmation de validation
  validerTarget: ProjetCard | null = null;

  // Modale de refus
  motifTargetId: number | null = null;
  motifText = '';

  ngOnInit(): void {
    this.load();
  }

  private load(): void {
    this.isLoading = true;
    this.errorMessage = '';
    this.projetService.projetsAValider().subscribe({
      next: (projets) => {
        this.projets = projets;
        this.isLoading = false;
      },
      error: () => {
        this.errorMessage = 'Impossible de charger les projets en attente de validation.';
        this.isLoading = false;
      },
    });
  }

  // ── Validation ──────────────────────────────────────────────────────
  demanderValidation(projet: ProjetCard): void {
    this.validerTarget = projet;
  }

  annulerValidation(): void {
    this.validerTarget = null;
  }

  confirmerValidation(): void {
    if (!this.validerTarget) {
      return;
    }
    const projet = this.validerTarget;
    this.actionLoadingId = projet.id;
    this.errorMessage = '';
    this.projetService.valider(projet.id).subscribe({
      next: () => {
        this.actionLoadingId = null;
        this.validerTarget = null;
        this.notifier('Projet validé et publié au catalogue.');
        this.load();
      },
      error: (err) => {
        this.actionLoadingId = null;
        this.validerTarget = null;
        this.errorMessage = err?.error?.detail ?? err?.error?.message ?? 'Impossible de valider ce projet.';
      },
    });
  }

  // ── Refus ───────────────────────────────────────────────────────────
  ouvrirMotif(projet: ProjetCard): void {
    this.motifTargetId = projet.id;
    this.motifText = '';
  }

  annulerMotif(): void {
    this.motifTargetId = null;
    this.motifText = '';
  }

  get motifInvalide(): boolean {
    return this.motifText.trim().length < 5;
  }

  confirmerRefus(): void {
    if (this.motifTargetId === null || this.motifInvalide) {
      return;
    }
    const id = this.motifTargetId;
    this.actionLoadingId = id;
    this.errorMessage = '';
    this.projetService.refuser(id, this.motifText.trim()).subscribe({
      next: () => {
        this.actionLoadingId = null;
        this.annulerMotif();
        this.notifier('Projet refusé.');
        this.load();
      },
      error: (err) => {
        this.actionLoadingId = null;
        this.errorMessage = err?.error?.detail ?? err?.error?.message ?? 'Impossible de refuser ce projet.';
      },
    });
  }

  private notifier(message: string): void {
    this.successMessage = message;
    setTimeout(() => (this.successMessage = ''), 4000);
  }
}
