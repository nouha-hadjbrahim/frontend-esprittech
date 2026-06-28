import { Component, OnInit, inject } from '@angular/core';
import { CandidatureService } from '../../core/services/candidature.service';
import { SujetProjet } from '../../core/models/sujet-projet.model';
import { SujetProjetService } from '../../core/services/sujet-projet.service';
import { STATUT_LABELS, CATEGORIE_LABELS } from '../../frontoffice/constants/sujet-projet.constants';
import { GererCandidaturesModal } from '../../frontoffice/components/sujets/gerer-candidatures-modal/gerer-candidatures-modal';

/**
 * Page admin "Candidatures" (US-14, 16-20, 22, 24) : liste tous les sujets validés ou plus
 * avancés dans le cycle, avec un bouton direct Ouvrir/Fermer les candidatures, et un bouton
 * "Gérer" qui ouvre la même modale que côté encadrant pour accepter/refuser les candidats,
 * retirer un étudiant ou déclarer la terminaison.
 */
@Component({
  selector: 'app-applications',
  standalone: true,
  imports: [GererCandidaturesModal],
  templateUrl: './applications.component.html',
  styleUrl: './applications.component.scss',
})
export class ApplicationsComponent implements OnInit {
  private readonly sujetProjetService = inject(SujetProjetService);
  private readonly candidatureService = inject(CandidatureService);

  readonly statutLabels = STATUT_LABELS;
  readonly categorieLabels = CATEGORIE_LABELS;

  sujets: SujetProjet[] = [];
  isLoading = true;
  errorMessage = '';
  actionLoadingId: number | null = null;

  modalOpen = false;
  selectedSujet?: SujetProjet;

  ngOnInit(): void {
    this.loadSujets();
  }

  private loadSujets(): void {
    this.isLoading = true;
    this.errorMessage = '';
    this.sujetProjetService.getSujetsPourCandidatures().subscribe({
      next: (sujets) => {
        this.sujets = sujets;
        this.isLoading = false;
      },
      error: () => {
        this.errorMessage = 'Impossible de charger les sujets.';
        this.isLoading = false;
      },
    });
  }

  ouvrirCandidatures(sujet: SujetProjet): void {
    this.actionLoadingId = sujet.id;
    this.candidatureService.ouvrirCandidatures(sujet.id).subscribe({
      next: () => {
        this.actionLoadingId = null;
        this.loadSujets();
      },
      error: () => {
        this.actionLoadingId = null;
        this.errorMessage = "Impossible d'ouvrir les candidatures pour ce sujet.";
      },
    });
  }

  fermerCandidatures(sujet: SujetProjet): void {
    this.actionLoadingId = sujet.id;
    this.candidatureService.fermerCandidatures(sujet.id).subscribe({
      next: () => {
        this.actionLoadingId = null;
        this.loadSujets();
      },
      error: () => {
        this.actionLoadingId = null;
        this.errorMessage = 'Impossible de fermer les candidatures pour ce sujet.';
      },
    });
  }

  openModal(sujet: SujetProjet): void {
    this.selectedSujet = sujet;
    this.modalOpen = true;
  }

  closeModal(): void {
    this.modalOpen = false;
    this.selectedSujet = undefined;
  }

  onModalChanged(): void {
    this.loadSujets();
  }
}
