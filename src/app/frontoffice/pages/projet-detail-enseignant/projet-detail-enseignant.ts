import { Component, OnInit, inject } from '@angular/core';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { ProjetDetails } from '../../../core/models/projet-catalogue.model';
import { ProjetCatalogueService } from '../../../core/services/projet-catalogue.service';
import { STATUT_PROJET_LABELS, TYPE_PROJET_LABELS } from '../../constants/projet-catalogue.constants';

type DetailTab = 'infos' | 'livrables' | 'industrialisation';

/**
 * Page de détail d'un projet, vue enseignant (route mes-projets/:id) ou chef
 * (route validation-projets/:id). Onglet « Informations » actif ; les onglets
 * « Livrables » et « Industrialisation » sont des espaces réservés.
 */
@Component({
  selector: 'app-projet-detail-enseignant',
  imports: [RouterModule],
  templateUrl: './projet-detail-enseignant.html',
  styleUrl: './projet-detail-enseignant.css',
})
export class ProjetDetailEnseignant implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly projetService = inject(ProjetCatalogueService);

  readonly typeLabels = TYPE_PROJET_LABELS;
  readonly statutLabels = STATUT_PROJET_LABELS;

  projet?: ProjetDetails;
  isLoading = true;
  errorMessage = '';
  activeTab: DetailTab = 'infos';
  backLink = '/frontoffice/mes-projets';
  backLabel = 'Mes projets';

  ngOnInit(): void {
    if (this.router.url.includes('validation-projets')) {
      this.backLink = '/frontoffice/validation-projets';
      this.backLabel = 'Validation projets';
    }
    const id = Number(this.route.snapshot.paramMap.get('id'));
    if (!id) {
      this.errorMessage = 'Projet introuvable.';
      this.isLoading = false;
      return;
    }
    this.load(id);
  }

  private load(id: number): void {
    this.isLoading = true;
    this.projetService.detailsProjet(id).subscribe({
      next: (projet) => {
        this.projet = projet;
        this.isLoading = false;
      },
      error: (err) => {
        this.errorMessage =
          err?.status === 403
            ? "Vous n'avez pas accès à ce projet."
            : 'Projet introuvable.';
        this.isLoading = false;
      },
    });
  }

  setTab(tab: DetailTab): void {
    this.activeTab = tab;
  }
}
