import { Component, OnInit, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { SujetProjet } from '../../../core/models/sujet-projet.model';
import { SujetProjetService } from '../../../core/services/sujet-projet.service';
import { CATEGORIE_LABELS } from '../../constants/sujet-projet.constants';

/**
 * Validation des sujets par le chef d'équipe de recherche (US-12, US-13, BF-03).
 * Liste les sujets "Soumis en validation" de son équipe (ou tous, pour l'admin) et permet
 * de les Valider ou de les Invalider avec un motif obligatoire.
 */
@Component({
  selector: 'app-validation-sujets',
  standalone: true,
  imports: [FormsModule],
  templateUrl: './validation-sujets.html',
  styleUrl: './validation-sujets.css',
})
export class ValidationSujets implements OnInit {
  private readonly sujetProjetService = inject(SujetProjetService);

  readonly categorieLabels = CATEGORIE_LABELS;

  sujets: SujetProjet[] = [];
  isLoading = true;
  errorMessage = '';
  actionLoadingId: number | null = null;

  motifTargetId: number | null = null;
  motifText = '';

  ngOnInit(): void {
    this.loadSujets();
  }

  private loadSujets(): void {
    this.isLoading = true;
    this.errorMessage = '';
    this.sujetProjetService.getSujetsEnAttenteValidation().subscribe({
      next: (sujets) => {
        this.sujets = sujets;
        this.isLoading = false;
      },
      error: () => {
        this.errorMessage = 'Impossible de charger les sujets en attente de validation.';
        this.isLoading = false;
      },
    });
  }

  valider(sujet: SujetProjet): void {
    this.actionLoadingId = sujet.id;
    this.errorMessage = '';
    this.sujetProjetService.validerSujet(sujet.id).subscribe({
      next: () => {
        this.actionLoadingId = null;
        this.loadSujets();
      },
      error: (err) => {
        this.actionLoadingId = null;
        this.errorMessage = err?.error?.message ?? 'Impossible de valider ce sujet.';
      },
    });
  }

  ouvrirMotifInvalidation(sujet: SujetProjet): void {
    this.motifTargetId = sujet.id;
    this.motifText = '';
  }

  annulerMotif(): void {
    this.motifTargetId = null;
    this.motifText = '';
  }

  confirmerInvalidation(): void {
    if (!this.motifTargetId || !this.motifText.trim()) return;

    this.actionLoadingId = this.motifTargetId;
    this.errorMessage = '';
    this.sujetProjetService.invaliderSujet(this.motifTargetId, this.motifText.trim()).subscribe({
      next: () => {
        this.actionLoadingId = null;
        this.annulerMotif();
        this.loadSujets();
      },
      error: (err) => {
        this.actionLoadingId = null;
        this.errorMessage = err?.error?.message ?? 'Impossible d\'invalider ce sujet.';
      },
    });
  }
}
