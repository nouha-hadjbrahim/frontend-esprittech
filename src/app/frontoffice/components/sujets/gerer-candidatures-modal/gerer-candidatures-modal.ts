import { DatePipe } from '@angular/common';
import { Component, EventEmitter, Input, OnChanges, Output, SimpleChanges, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Affectation, Candidature } from '../../../../core/models/candidature.model';
import { SujetProjet } from '../../../../core/models/sujet-projet.model';
import { CandidatureService } from '../../../../core/services/candidature.service';

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

  @Output() changed = new EventEmitter<void>();
  @Output() closed = new EventEmitter<void>();

  candidatures: Candidature[] = [];
  affectations: Affectation[] = [];
  isLoading = false;
  errorMessage = '';
  actionLoading = false;

  motifTargetId: number | null = null;
  motifText = '';

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['isOpen'] && this.isOpen && this.sujet) {
      this.loadData();
    }
    if (changes['isOpen'] && !this.isOpen) {
      this.resetState();
    }
  }

  get demandesCandidatures(): Candidature[] {
    return this.candidatures.filter((c) => c.statut === 'DEPOSEE');
  }

  get metaLabel(): string {
    const count = this.demandesCandidatures.length;
    const places = this.affectationsActives.length;
    const capacite = this.sujet?.capaciteAccueil ?? 0;
    return `${count} candidat${count > 1 ? 's' : ''} · ${places}/${capacite} place${capacite > 1 ? 's' : ''}`;
  }

  private resetState(): void {
    this.candidatures = [];
    this.affectations = [];
    this.errorMessage = '';
    this.motifTargetId = null;
    this.motifText = '';
  }

  private loadData(): void {
    if (!this.sujet) return;
    this.isLoading = true;
    this.errorMessage = '';

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

  get canOuvrir(): boolean {
    return this.sujet?.statut === 'VALIDE';
  }

  ouvrirCandidatures(): void {
    if (!this.sujet) return;
    this.runSujetAction(() => this.candidatureService.ouvrirCandidatures(this.sujet!.id), 'CANDIDATURE_OUVERTE');
  }

  get canFermer(): boolean {
    return this.sujet?.statut === 'CANDIDATURE_OUVERTE';
  }

  fermerCandidatures(): void {
    if (!this.sujet) return;
    this.runSujetAction(
      () => this.candidatureService.fermerCandidatures(this.sujet!.id),
      'REALISATION_EN_COURS',
      { closeOnSuccess: true },
    );
  }

  private runSujetAction(
    action: () => ReturnType<CandidatureService['fermerCandidatures']>,
    nextStatut: SujetProjet['statut'],
    options?: { closeOnSuccess?: boolean },
  ): void {
    this.actionLoading = true;
    this.errorMessage = '';
    action().subscribe({
      next: () => {
        this.actionLoading = false;
        if (this.sujet) {
          this.sujet = { ...this.sujet, statut: nextStatut };
        }
        this.changed.emit();
        if (options?.closeOnSuccess) {
          this.close();
        } else {
          this.loadData();
        }
      },
      error: (err) => {
        this.actionLoading = false;
        this.errorMessage = this.extractError(err, 'Une erreur est survenue.');
      },
    });
  }

  get canTraiterDemandes(): boolean {
    return this.sujet?.statut === 'CANDIDATURE_OUVERTE';
  }

  get showCandidatures(): boolean {
    return this.canTraiterDemandes;
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
        this.errorMessage = this.extractError(err, "Impossible d'accepter cette candidature.");
      },
    });
  }

  ouvrirMotifRefus(candidature: Candidature): void {
    this.motifTargetId = candidature.id;
    this.motifText = '';
  }

  annulerMotif(): void {
    this.motifTargetId = null;
    this.motifText = '';
  }

  confirmerMotif(): void {
    if (!this.motifTargetId || !this.motifText.trim()) return;

    this.actionLoading = true;
    this.errorMessage = '';
    this.candidatureService.refuserCandidature(this.motifTargetId, this.motifText.trim()).subscribe({
      next: () => {
        this.actionLoading = false;
        this.annulerMotif();
        this.changed.emit();
        this.loadData();
      },
      error: (err) => {
        this.actionLoading = false;
        this.errorMessage = this.extractError(err, 'Impossible de refuser cette candidature.');
      },
    });
  }

  get showAffectations(): boolean {
    const statut = this.sujet?.statut;
    return (
      statut === 'CANDIDATURE_OUVERTE' ||
      statut === 'REALISATION_EN_COURS' ||
      statut === 'REALISATION_TERMINEE' ||
      this.affectations.length > 0
    );
  }

  get affectationsActives(): Affectation[] {
    return this.affectations.filter((a) => a.statut === 'ACTIVE');
  }

  get affectationsArchivees(): Affectation[] {
    return this.affectations.filter((a) => a.statut === 'RETIREE_ARCHIVEE');
  }

  get canRetirerMembre(): boolean {
    return this.sujet?.statut === 'REALISATION_EN_COURS';
  }

  get canTerminer(): boolean {
    return this.sujet?.statut === 'REALISATION_EN_COURS';
  }

  get isTermine(): boolean {
    return this.sujet?.statut === 'REALISATION_TERMINEE';
  }

  declarerTerminaison(): void {
    if (!this.sujet) return;
    this.actionLoading = true;
    this.errorMessage = '';
    this.candidatureService.declarerTerminaison(this.sujet.id).subscribe({
      next: () => {
        this.actionLoading = false;
        if (this.sujet) {
          this.sujet = { ...this.sujet, statut: 'REALISATION_TERMINEE' };
        }
        this.changed.emit();
        this.loadData();
      },
      error: (err) => {
        this.actionLoading = false;
        this.errorMessage = this.extractError(err, 'Impossible de déclarer la terminaison.');
      },
    });
  }

  ouvrirMotifRetrait(affectation: Affectation): void {
    this.motifTargetId = affectation.id;
    this.motifText = '';
  }

  confirmerRetrait(): void {
    if (!this.motifTargetId || !this.motifText.trim()) return;

    this.actionLoading = true;
    this.errorMessage = '';
    this.candidatureService.retirerEtudiant(this.motifTargetId, this.motifText.trim()).subscribe({
      next: () => {
        this.actionLoading = false;
        this.annulerMotif();
        this.changed.emit();
        this.loadData();
      },
      error: (err) => {
        this.actionLoading = false;
        this.errorMessage = this.extractError(err, 'Une erreur est survenue.');
      },
    });
  }

  getInitials(candidature: Candidature): string {
    return this.getInitialsFromName(candidature.etudiantPrenom, candidature.etudiantNom);
  }

  getInitialsFromName(prenom?: string | null, nom?: string | null): string {
    const p = prenom?.trim().charAt(0) ?? '';
    const n = nom?.trim().charAt(0) ?? '';
    return `${p}${n}`.toUpperCase() || '?';
  }

  private extractError(err: unknown, fallback: string): string {
    const body = (err as { error?: { message?: string; detail?: string } })?.error;
    return body?.detail ?? body?.message ?? fallback;
  }
}
