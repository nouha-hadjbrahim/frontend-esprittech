import { DatePipe } from '@angular/common';
import { Component, OnInit, inject } from '@angular/core';
import { ActivatedRoute, RouterModule } from '@angular/router';
import { ProjetDetails } from '../../../core/models/projet-catalogue.model';
import { ProjetCatalogueService } from '../../../core/services/projet-catalogue.service';
import { TYPE_PROJET_LABELS } from '../../constants/projet-catalogue.constants';

/** Page de détail public d'un projet du catalogue : identification et équipe porteuse. */
@Component({
  selector: 'app-projet-detail-catalogue',
  imports: [RouterModule, DatePipe],
  templateUrl: './projet-detail-catalogue.html',
  styleUrl: './projet-detail-catalogue.css',
})
export class ProjetDetailCatalogue implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly projetService = inject(ProjetCatalogueService);

  readonly typeLabels = TYPE_PROJET_LABELS;

  projet?: ProjetDetails;
  isLoading = true;
  errorMessage = '';

  get encadrantInitiale(): string {
    return this.projet?.encadrantNom?.trim().charAt(0).toUpperCase() ?? '?';
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
}
