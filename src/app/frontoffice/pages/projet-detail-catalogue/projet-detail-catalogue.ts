import { DatePipe } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { Component, OnInit, inject } from '@angular/core';
import { ActivatedRoute, RouterModule } from '@angular/router';
import { ProjetDetails } from '../../../core/models/projet-catalogue.model';
import { ProjetCatalogueService } from '../../../core/services/projet-catalogue.service';
import { TYPE_PROJET_LABELS, DEFAULT_PROJET_COVER_IMAGE } from '../../constants/projet-catalogue.constants';
import { HistoriqueService } from '../../../core/services/historique.service';
import { HistoriqueResponse, ACTION_LABEL } from '../../../core/models/historique.model';
import { AuthService } from '../../../core/services/auth.service';

/** Rôles autorisés par le backend à consulter GET /api/historique/projet/{id}. */
const HISTORIQUE_ROLES = ['ROLE_ADMIN', 'ROLE_CI', 'ROLE_CHEF_EQUIPE', 'ROLE_ENSEIGNANT'];

/** Page de détail public d'un projet du catalogue : identification, équipe porteuse et historique. */
@Component({
  selector: 'app-projet-detail-catalogue',
  imports: [RouterModule, DatePipe],
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

  historique: HistoriqueResponse[] = [];
  isHistoriqueLoading = false;
  historiqueError = '';
  historiqueForbidden = false;

  get coverImage(): string {
    return this.projet?.coverImage || this.defaultCoverImage;
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

  private loadHistorique(id: number): void {
    this.isHistoriqueLoading = true;
    this.historiqueService.findByProjet(id).subscribe({
      next: (entries) => {
        // Le backend trie par date décroissante ; on affiche le parcours du projet dans l'ordre chronologique.
        this.historique = [...entries].reverse();
        this.isHistoriqueLoading = false;
      },
      error: (err: HttpErrorResponse) => {
        if (err.status === 403) {
          // Enseignant consultant un projet dont il n'est pas l'encadrant : section non pertinente pour lui.
          this.historiqueForbidden = true;
        } else {
          this.historiqueError = "Impossible de charger l'historique de ce projet.";
        }
        this.isHistoriqueLoading = false;
      },
    });
  }
}
