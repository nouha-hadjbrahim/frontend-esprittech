import { DatePipe } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { Component, OnInit, inject } from '@angular/core';
import { ActivatedRoute, RouterModule } from '@angular/router';
import { EvaluationResponse, ResultatCritereResponse } from '../../../core/models/evaluation.model';
import { HistoriqueResponse, ACTION_LABEL } from '../../../core/models/historique.model';
import { LivrableCatalogue } from '../../../core/models/livrable-catalogue.model';
import { ProjetDetails } from '../../../core/models/projet-catalogue.model';
import { AuthService } from '../../../core/services/auth.service';
import { HistoriqueService } from '../../../core/services/historique.service';
import { ProjetCatalogueService } from '../../../core/services/projet-catalogue.service';
import { EvaluationChecklistComponent } from '../../../shared/components/evaluation-checklist/evaluation-checklist.component';
import { TYPE_PROJET_LABELS, DEFAULT_PROJET_COVER_IMAGE } from '../../constants/projet-catalogue.constants';

type DisplayLivrable = LivrableCatalogue & { fromSujet?: boolean };

/** Rôles autorisés par le backend à consulter GET /api/historique/projet/{id}. */
const HISTORIQUE_ROLES = ['ROLE_ADMIN', 'ROLE_CI', 'ROLE_CHEF_EQUIPE', 'ROLE_ENSEIGNANT'];

/** Page de détail public d'un projet du catalogue : infos, évaluation ML, livrables, industrialisation. */
@Component({
  selector: 'app-projet-detail-catalogue',
  imports: [RouterModule, DatePipe, EvaluationChecklistComponent],
  templateUrl: './projet-detail-catalogue.html',
  styleUrl: './projet-detail-catalogue.css',
})
export class ProjetDetailCatalogue implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly projetService = inject(ProjetCatalogueService);
  private readonly historiqueService = inject(HistoriqueService);
  private readonly authService = inject(AuthService);

  readonly typeLabels = TYPE_PROJET_LABELS;
  readonly actionLabels = ACTION_LABEL;
  readonly defaultCoverImage = DEFAULT_PROJET_COVER_IMAGE;
  readonly canViewHistorique = HISTORIQUE_ROLES.includes(this.authService.getRole() ?? '');

  projet?: ProjetDetails;
  isLoading = true;
  errorMessage = '';

  evaluation: EvaluationResponse | null = null;
  evaluationLoading = false;

  livrables: DisplayLivrable[] = [];
  livrablesLoading = false;

  historique: HistoriqueResponse[] = [];
  isHistoriqueLoading = false;
  historiqueError = '';
  historiqueForbidden = false;

  get coverImage(): string {
    return this.projet?.coverImage || this.defaultCoverImage;
  }

  get displayedScore(): number {
    if (this.evaluation?.scoreFinal != null) {
      return Math.round(this.evaluation.scoreFinal);
    }
    return this.projet?.score ?? 0;
  }

  get objectifLines(): string[] {
    if (!this.projet?.objectifs) return [];
    const lines = this.projet.objectifs.split('\n').map((l) => l.trim()).filter(Boolean);
    return lines.length > 0 ? lines : [this.projet.objectifs];
  }

  get encadrantInitials(): string {
    const name = this.projet?.encadrantNom?.trim() ?? '';
    const parts = name.split(/\s+/).filter(Boolean);
    if (parts.length === 0) return '?';
    if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
    return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
  }

  /** Alias conservé pour les tests existants. */
  get encadrantInitiale(): string {
    return this.encadrantInitials.charAt(0);
  }

  get periodeLabel(): string {
    if (!this.projet) return '—';
    const debut = this.projet.dateDebut
      ? new Date(this.projet.dateDebut).toLocaleDateString('fr-FR')
      : '—';
    const fin = this.projet.dateFin
      ? new Date(this.projet.dateFin).toLocaleDateString('fr-FR')
      : '—';
    return `${debut} → ${fin}`;
  }

  get eligibilityLabel(): string {
    const status = this.evaluation?.eligibilityStatus;
    switch (status) {
      case 'ELIGIBLE':
        return 'Éligible';
      case 'REVIEW_REQUIRED':
        return 'Revue requise';
      case 'NON_ELIGIBLE':
        return 'Non éligible';
      case 'NON_ELIGIBLE_EN_L_ETAT':
        return 'Non éligible en l\'état';
      case 'NOT_EVALUABLE':
        return 'Non évaluable';
      default:
        if (this.evaluation?.eligibleIndustrialisation === true) return 'Éligible';
        if (this.evaluation?.eligibleIndustrialisation === false) return 'Non éligible';
        if (this.evaluation?.scoreFinal != null && !this.evaluation.hasEliminatoryWarnings) {
          return 'Revue requise';
        }
        return 'Non calculé';
    }
  }

  ngOnInit(): void {
    const id = Number(this.route.snapshot.paramMap.get('id'));
    if (!id) {
      this.errorMessage = 'Projet introuvable.';
      this.isLoading = false;
      return;
    }
    this.projetService.detailsCatalogue(id).subscribe({
      next: (projet) => {
        this.projet = projet;
        this.isLoading = false;
        this.loadEvaluation(id);
        this.loadLivrables(id);
      },
      error: () => {
        this.errorMessage = 'Ce projet est introuvable ou non publié au catalogue.';
        this.isLoading = false;
      },
    });

    if (this.canViewHistorique) {
      this.loadHistorique(id);
    }
  }

  private loadEvaluation(id: number): void {
    this.evaluationLoading = true;
    this.projetService.evaluationCatalogue(id).subscribe({
      next: (evaluation) => {
        this.evaluation = evaluation;
        this.evaluationLoading = false;
        if (this.projet && evaluation.scoreFinal != null) {
          this.projet = { ...this.projet, score: Math.round(evaluation.scoreFinal) };
        }
      },
      error: () => {
        this.evaluation = null;
        this.evaluationLoading = false;
      },
    });
  }

  private loadLivrables(id: number): void {
    this.livrablesLoading = true;
    this.projetService.livrablesCatalogue(id).subscribe({
      next: (livrables) => {
        this.livrables = livrables;
        this.livrablesLoading = false;
      },
      error: () => {
        this.livrables = [];
        this.livrablesLoading = false;
      },
    });
  }

  private loadHistorique(id: number): void {
    this.isHistoriqueLoading = true;
    this.historiqueService.findByProjet(id).subscribe({
      next: (entries) => {
        this.historique = [...entries].reverse();
        this.isHistoriqueLoading = false;
      },
      error: (err: HttpErrorResponse) => {
        if (err.status === 403) {
          this.historiqueForbidden = true;
        } else {
          this.historiqueError = "Impossible de charger l'historique de ce projet.";
        }
        this.isHistoriqueLoading = false;
      },
    });
  }

  noteResultDisplay(resultat: ResultatCritereResponse): string {
    if (resultat.mlScore != null && resultat.mlMaxScore != null) {
      const normalized = resultat.normalizedScore != null
        ? ` - ${Math.round(resultat.normalizedScore * 100)}/100`
        : '';
      return `${resultat.mlScore}/${resultat.mlMaxScore}${normalized}`;
    }
    const note = resultat.noteValue ?? resultat.noteObtenue ?? 0;
    const scale = resultat.bareme && resultat.bareme > 0 ? resultat.bareme : null;
    if (scale) {
      return resultat.noteLabel ? `${note}/${scale} - ${resultat.noteLabel}` : `${note}/${scale}`;
    }
    return resultat.noteLabel ? resultat.noteLabel : String(note);
  }

  livrableTrackId(livrable: DisplayLivrable): string {
    return `${livrable.fromSujet ? 'sujet' : 'catalogue'}-${livrable.id}`;
  }

  livrableDisplayName(livrable: DisplayLivrable): string {
    return livrable.originalFileName?.trim() || livrable.nom;
  }

  livrableDateLabel(livrable: DisplayLivrable): string {
    if (!livrable.dateDepot) return '—';
    return new Date(livrable.dateDepot).toLocaleDateString('fr-FR', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    });
  }

  downloadLivrable(livrable: DisplayLivrable): string {
    if (!this.projet) return '#';
    return this.projetService.downloadLivrableCatalogueUrl(
      this.projet.id,
      livrable.id,
      !!livrable.fromSujet,
    );
  }
}
