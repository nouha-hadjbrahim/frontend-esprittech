import { DatePipe } from '@angular/common';
import { Component, EventEmitter, Input, OnChanges, Output, SimpleChanges, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Affectation, Candidature } from '../../../../core/models/candidature.model';
import { SujetProjet } from '../../../../core/models/sujet-projet.model';
import { CandidatureService } from '../../../../core/services/candidature.service';

/**
 * Modale "Gérer les candidatures" affichée depuis la liste des sujets (US-14, US-16 à US-20,
 * US-22, US-23, US-24).
 *
 * Donne la main à l'encadrant (propriétaire du sujet) et à l'admin pour :
 *  - ouvrir / fermer les candidatures (US-14, US-19, bascule auto US-20 côté backend)
 *  - accepter / refuser un étudiant candidat (US-17, US-18)
 *  - retirer un étudiant affecté pendant la réalisation, avec archivage (US-22)
 *  - déclarer la terminaison du projet (US-24)
 *
 * Le dépôt des livrables (US-23) n'est volontairement pas implémenté ici : seul un bouton
 * est exposé, la logique sera complétée séparément.
 */
@Component({
  selector: 'app-gerer-candidatures-modal',
  imports: [FormsModule, DatePipe],
  templateUrl: './gerer-candidatures-modal.html',
  styleUrl: './gerer-candidatures-modal.css',
})
export class GererCandidaturesModal implements OnChanges {
  private readonly candidatureService = inject(CandidatureService);

  @Input({ required: true }) isOpen = false;
  @Input({ required: true }) sujet?: SujetProjet;

  /** Émis quand une action a modifié l'état du sujet (statut, candidatures...) et que la liste parente doit être rechargée. */
  @Output() changed = new EventEmitter<void>();
  @Output() closed = new EventEmitter<void>();

  candidatures: Candidature[] = [];
  affectations: Affectation[] = [];
  isLoading = false;
  errorMessage = '';
  actionLoading = false;

  // Ligne en cours de saisie de motif (refus de candidature ou retrait d'affectation)
  motifTargetId: number | null = null;
  motifTargetType: 'refus' | 'retrait' | null = null;
  motifText = '';



  ngOnChanges(changes: SimpleChanges): void {
    if (changes['isOpen'] && this.isOpen && this.sujet) {
      this.loadData();
    }
    if (changes['isOpen'] && !this.isOpen) {
      this.resetState();
    }
  }

  private resetState(): void {
    this.candidatures = [];
    this.affectations = [];
    this.errorMessage = '';
    this.motifTargetId = null;
    this.motifTargetType = null;
    this.motifText = '';

  }

  private loadData(): void {
    if (!this.sujet) return;
    this.isLoading = true;
    this.errorMessage = '';

    // Les candidatures n'ont de sens qu'une fois le sujet ouvert (ou après) ;
    // les affectations n'existent qu'à partir de la réalisation.
    const sujetId = this.sujet.id;

    this.candidatureService.getCandidaturesParSujet(sujetId).subscribe({
      next: (candidatures) => (this.candidatures = candidatures),
      error: () => (this.candidatures = []),
    });

    this.candidatureService.getAffectationsParSujet(sujetId).subscribe({
      next: (affectations) => {
        this.affectations = affectations;
        this.isLoading = false;
      },
      error: () => {
        this.affectations = [];
        this.isLoading = false;
      },
    });
  }

  close(): void {
    this.closed.emit();
  }

  onOverlayClick(event: MouseEvent): void {
    if ((event.target as HTMLElement).classList.contains('gcm-overlay')) {
      this.close();
    }
  }

  // ── US-14 : Ouvrir les candidatures ───────────────────────────────
  get canOuvrir(): boolean {
    return this.sujet?.statut === 'VALIDE';
  }

  ouvrirCandidatures(): void {
    if (!this.sujet) return;
    this.actionLoading = true;
    this.errorMessage = '';
    this.candidatureService.ouvrirCandidatures(this.sujet.id).subscribe({
      next: () => {
        this.actionLoading = false;
        this.changed.emit();
        this.loadData();
      },
      error: (err) => {
        this.actionLoading = false;
        this.errorMessage = err?.error?.message ?? "Impossible d'ouvrir les candidatures.";
      },
    });
  }

  // ── US-19 + US-20 : Fermer les candidatures ──────────────────────
  get canFermer(): boolean {
    return this.sujet?.statut === 'CANDIDATURE_OUVERTE';
  }

  fermerCandidatures(): void {
    if (!this.sujet) return;
    this.actionLoading = true;
    this.errorMessage = '';
    this.candidatureService.fermerCandidatures(this.sujet.id).subscribe({
      next: () => {
        this.actionLoading = false;
        this.changed.emit();
        this.loadData();
      },
      error: (err) => {
        this.actionLoading = false;
        this.errorMessage = err?.error?.message ?? 'Impossible de fermer les candidatures.';
      },
    });
  }

  // ── US-17 / US-18 : Accepter / refuser une candidature ───────────
  get showCandidatures(): boolean {
    const statut = this.sujet?.statut;
    return statut === 'CANDIDATURE_OUVERTE' || statut === 'CANDIDATURE_FERMEE'
      || statut === 'REALISATION_EN_COURS' || statut === 'REALISATION_TERMINEE';
  }

  accepterCandidature(candidature: Candidature): void {
    this.actionLoading = true;
    this.errorMessage = '';
    this.candidatureService.accepterCandidature(candidature.id).subscribe({
      next: () => {
        this.actionLoading = false;
        this.changed.emit();
        this.loadData();
      },
      error: (err) => {
        this.actionLoading = false;
        this.errorMessage = err?.error?.message ?? "Impossible d'accepter cette candidature.";
      },
    });
  }

  ouvrirMotifRefus(candidature: Candidature): void {
    this.motifTargetType = 'refus';
    this.motifTargetId = candidature.id;
    this.motifText = '';
  }

  ouvrirMotifRetrait(affectation: Affectation): void {
    this.motifTargetType = 'retrait';
    this.motifTargetId = affectation.id;
    this.motifText = '';
  }

  annulerMotif(): void {
    this.motifTargetType = null;
    this.motifTargetId = null;
    this.motifText = '';
  }

  confirmerMotif(): void {
    if (!this.motifTargetId || !this.motifText.trim()) return;

    this.actionLoading = true;
    this.errorMessage = '';

    const onSuccess = () => {
      this.actionLoading = false;
      this.annulerMotif();
      this.changed.emit();
      this.loadData();
    };
    const onError = (err: unknown) => {
      this.actionLoading = false;
      this.errorMessage = (err as { error?: { message?: string } })?.error?.message ?? 'Une erreur est survenue.';
    };

    if (this.motifTargetType === 'refus') {
      this.candidatureService.refuserCandidature(this.motifTargetId, this.motifText.trim())
        .subscribe({ next: onSuccess, error: onError });
    } else {
      this.candidatureService.retirerEtudiant(this.motifTargetId, this.motifText.trim())
        .subscribe({ next: onSuccess, error: onError });
    }
  }

  // ── US-22 : Affectations actives / retrait archivé ───────────────
  get showAffectations(): boolean {
    const statut = this.sujet?.statut;
    return statut === 'REALISATION_EN_COURS' || statut === 'REALISATION_TERMINEE';
  }

  get affectationsActives(): Affectation[] {
    return this.affectations.filter((a) => a.statut === 'ACTIVE');
  }

  get affectationsArchivees(): Affectation[] {
    return this.affectations.filter((a) => a.statut === 'RETIREE_ARCHIVEE');
  }

  // ── US-24 : Déclarer la terminaison ───────────────────────────────
  get canTerminer(): boolean {
    return this.sujet?.statut === 'REALISATION_EN_COURS';
  }

  declarerTerminaison(): void {
    if (!this.sujet) return;
    this.actionLoading = true;
    this.errorMessage = '';
    this.candidatureService.declarerTerminaison(this.sujet.id).subscribe({
      next: () => {
        this.actionLoading = false;
        this.changed.emit();
        this.loadData();
      },
      error: (err) => {
        this.actionLoading = false;
        this.errorMessage = err?.error?.message ?? 'Impossible de déclarer la terminaison.';
      },
    });
  }


}
