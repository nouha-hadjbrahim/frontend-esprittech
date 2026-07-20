import { DatePipe } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { Component, OnInit, inject } from '@angular/core';
import { ActivatedRoute, RouterModule } from '@angular/router';
import { ProjetDetails } from '../../../core/models/projet-catalogue.model';
import { EvaluationResponse } from '../../../core/models/evaluation.model';
import { LivrableCatalogue } from '../../../core/models/livrable-catalogue.model';
import { ProjetCatalogueService } from '../../../core/services/projet-catalogue.service';
import { CatalogueLivrableService } from '../../../core/services/catalogue-livrable.service';
import { TYPE_PROJET_LABELS, DEFAULT_PROJET_COVER_IMAGE } from '../../constants/projet-catalogue.constants';
import { HistoriqueService } from '../../../core/services/historique.service';
import { HistoriqueResponse, ACTION_LABEL } from '../../../core/models/historique.model';
import { AuthService } from '../../../core/services/auth.service';
import { EvaluationChecklistComponent } from '../../../shared/components/evaluation-checklist/evaluation-checklist.component';

/** Rôles autorisés par le backend à consulter GET /api/historique/projet/{id}. */
const HISTORIQUE_ROLES = ['ROLE_ADMIN', 'ROLE_CI', 'ROLE_CHEF_EQUIPE', 'ROLE_ENSEIGNANT'];

/** Page de détail public d'un projet du catalogue : score ML, livrables, équipe et historique. */
@Component({
  selector: 'app-projet-detail-catalogue',
  imports: [RouterModule, DatePipe, EvaluationChecklistComponent],
  templateUrl: './projet-detail-catalogue.html',
  styleUrl: './projet-detail-catalogue.css',
})
export class ProjetDetailCatalogue implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly projetService = inject(ProjetCatalogueService);
  private readonly livrableService = inject(CatalogueLivrableService);
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
  evaluationError = '';

  livrables: LivrableCatalogue[] = [];
  livrablesLoading = false;
  livrableError = '';

  historique: HistoriqueResponse[] = [];
  isHistoriqueLoading = false;
  historiqueError = '';
  historiqueForbidden = false;

  get coverImage(): string {
    return this.projet?.coverImage || this.defaultCoverImage;
  }

  get displayedScore(): string {
    if (this.evaluation?.scoreFinal != null) {
      return String(this.evaluation.scoreFinal);
    }
    if (this.projet?.score != null && this.projet.score > 0) {
      return String(this.projet.score);
    }
    return 'Non calculé';
  }

  get showScoreSuffix(): boolean {
    return this.displayedScore !== 'Non calculé';
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

  downloadLivrable(livrable: LivrableCatalogue): string {
    if (!this.projet) return '#';
    return this.livrableService.downloadPublishedUrl(
      this.projet.id,
      livrable.id,
      !!livrable.fromSujet,
    );
  }

  trackLivrable(livrable: LivrableCatalogue): string {
    if (livrable.objectName?.trim()) {
      return `object:${livrable.objectName.trim()}`;
    }
    if (livrable.lienExterne?.trim()) {
      return `link:${livrable.lienExterne.trim().toLowerCase()}`;
    }
    return `${livrable.fromSujet ? 'sujet' : 'catalogue'}:${livrable.id}`;
  }

  livrableDisplayName(livrable: LivrableCatalogue): string {
    return livrable.originalFileName?.trim() || livrable.nom;
  }

  private loadEvaluation(id: number): void {
    this.evaluationLoading = true;
    this.evaluationError = '';
    this.projetService.evaluationCatalogue(id).subscribe({
      next: (evaluation) => {
        this.evaluation = evaluation;
        this.evaluationLoading = false;
      },
      error: (err: HttpErrorResponse) => {
        this.evaluation = null;
        this.evaluationLoading = false;
        if (err.status !== 404) {
          this.evaluationError = "Impossible de charger l'évaluation.";
        }
      },
    });
  }

  private loadLivrables(id: number): void {
    this.livrablesLoading = true;
    this.livrableError = '';
    this.livrableService.findPublishedByProjet(id).subscribe({
      next: (livrables) => {
        this.livrables = this.dedupeLivrables(livrables);
        this.livrableError = '';
        this.livrablesLoading = false;
      },
      error: () => {
        this.livrableError = 'Impossible de charger les livrables.';
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

  private dedupeLivrables(livrables: LivrableCatalogue[]): LivrableCatalogue[] {
    const seen = new Set<string>();
    return livrables.filter((livrable) => {
      const key = this.trackLivrable(livrable);
      if (seen.has(key)) {
        return false;
      }
      seen.add(key);
      return true;
    });
  }
}
