import { Component, OnInit, inject } from '@angular/core';
import { ActivatedRoute, RouterModule } from '@angular/router';
import { ProjetDetails } from '../../../core/models/projet-catalogue.model';
import { ProjetCatalogueService } from '../../../core/services/projet-catalogue.service';
import { STATUT_PROJET_LABELS, TYPE_PROJET_LABELS } from '../../constants/projet-catalogue.constants';

type CatalogueTab = 'infos' | 'candidatures' | 'livrables' | 'progression' | 'historique' | 'commentaires';

/**
 * Page de détail public d'un projet du catalogue. Seul l'onglet « Informations »
 * est actif ; les autres onglets sont des espaces réservés (« À venir »).
 */
@Component({
  selector: 'app-projet-detail-catalogue',
  imports: [RouterModule],
  templateUrl: './projet-detail-catalogue.html',
  styleUrl: './projet-detail-catalogue.css',
})
export class ProjetDetailCatalogue implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly projetService = inject(ProjetCatalogueService);

  readonly typeLabels = TYPE_PROJET_LABELS;
  readonly statutLabels = STATUT_PROJET_LABELS;

  readonly tabs: { id: CatalogueTab; label: string }[] = [
    { id: 'infos', label: 'Informations' },
    { id: 'candidatures', label: 'Candidatures' },
    { id: 'livrables', label: 'Livrables' },
    { id: 'progression', label: 'Progression' },
    { id: 'historique', label: 'Historique' },
    { id: 'commentaires', label: 'Commentaires' },
  ];

  projet?: ProjetDetails;
  isLoading = true;
  errorMessage = '';
  activeTab: CatalogueTab = 'infos';

  get activeTabLabel(): string {
    return this.tabs.find((t) => t.id === this.activeTab)?.label ?? '';
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
  }

  setTab(tab: CatalogueTab): void {
    this.activeTab = tab;
  }
}
