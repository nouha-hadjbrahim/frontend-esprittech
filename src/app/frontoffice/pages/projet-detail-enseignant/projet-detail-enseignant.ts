import { Component, OnInit, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { ProjetDetails, StatutProjet } from '../../../core/models/projet-catalogue.model';
import { LivrableCatalogue } from '../../../core/models/livrable-catalogue.model';
import {
  TYPE_LIVRABLE_LABELS,
  TYPE_LIVRABLE_OPTIONS,
  TypeLivrable,
} from '../../../core/models/livrable.model';
import { AuthService } from '../../../core/services/auth.service';
import { CatalogueLivrableService } from '../../../core/services/catalogue-livrable.service';
import { ProjetCatalogueService } from '../../../core/services/projet-catalogue.service';
import { STATUT_PROJET_LABELS, TYPE_PROJET_LABELS } from '../../constants/projet-catalogue.constants';

type DetailTab = 'infos' | 'livrables' | 'industrialisation';

/** Statuts pour lesquels un projet est publié au catalogue (dépôt de livrables autorisé). */
const STATUTS_CATALOGUE = new Set<StatutProjet>([
  'VALIDE',
  'CANDIDAT_INDUSTRIALISATION_INTERNE',
  'CANDIDAT_INDUSTRIALISATION_EXTERNE',
  'INDUSTRIALISE_DSI',
  'INDUSTRIALISE_EXTERNE',
]);

/**
 * Page de détail d'un projet, vue enseignant (route mes-projets/:id) ou chef
 * (route validation-projets/:id). L'onglet « Livrables » reprend la fonctionnalité
 * développée sur les sujets ; l'onglet « Industrialisation » reste un espace réservé.
 */
@Component({
  selector: 'app-projet-detail-enseignant',
  imports: [RouterModule, FormsModule],
  templateUrl: './projet-detail-enseignant.html',
  styleUrl: './projet-detail-enseignant.css',
})
export class ProjetDetailEnseignant implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly projetService = inject(ProjetCatalogueService);
  private readonly authService = inject(AuthService);
  private readonly livrableService = inject(CatalogueLivrableService);

  readonly typeLabels = TYPE_PROJET_LABELS;
  readonly statutLabels = STATUT_PROJET_LABELS;
  readonly typeLivrableOptions = TYPE_LIVRABLE_OPTIONS;
  readonly livrableLabels = TYPE_LIVRABLE_LABELS;

  projet?: ProjetDetails;
  isLoading = true;
  errorMessage = '';
  activeTab: DetailTab = 'infos';
  backLink = '/frontoffice/mes-projets';
  backLabel = 'Mes projets';

  livrables: LivrableCatalogue[] = [];
  livrablesLoading = false;
  livrableError = '';
  livrableMessage = '';
  selectedUploadFile: File | null = null;
  uploadForm = {
    typeLivrable: 'DOCUMENTATION' as TypeLivrable,
    nom: '',
    description: '',
  };
  linkForm = {
    typeLivrable: 'LIEN_GIT' as TypeLivrable,
    nom: '',
    description: '',
    lienExterne: '',
  };

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
        this.loadLivrables();
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

  get isOwner(): boolean {
    const userId = this.authService.currentUser()?.id;
    if (!this.projet || userId == null) return false;
    return Number(this.projet.encadrantId) === Number(userId);
  }

  get canManageLivrables(): boolean {
    return this.isOwner && !!this.projet && STATUTS_CATALOGUE.has(this.projet.statut);
  }

  loadLivrables(): void {
    if (!this.projet) return;
    this.livrablesLoading = true;
    this.livrableError = '';
    this.livrableService.findByProjet(this.projet.id).subscribe({
      next: (livrables) => {
        this.livrables = livrables;
        this.livrablesLoading = false;
      },
      error: () => {
        this.livrableError = 'Impossible de charger les livrables.';
        this.livrablesLoading = false;
      },
    });
  }

  onUploadFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    this.selectedUploadFile = input.files?.[0] ?? null;
  }

  uploadLivrable(): void {
    if (!this.projet || !this.selectedUploadFile || !this.uploadForm.nom.trim()) {
      this.livrableError = 'Fichier et nom obligatoires.';
      return;
    }
    this.livrableService.upload(this.projet.id, {
      typeLivrable: this.uploadForm.typeLivrable,
      nom: this.uploadForm.nom.trim(),
      description: this.uploadForm.description.trim(),
      file: this.selectedUploadFile,
    }).subscribe({
      next: () => {
        this.livrableMessage = 'Livrable ajouté.';
        this.livrableError = '';
        this.uploadForm = { typeLivrable: 'DOCUMENTATION', nom: '', description: '' };
        this.selectedUploadFile = null;
        this.loadLivrables();
        setTimeout(() => (this.livrableMessage = ''), 2500);
      },
      error: (err) => (this.livrableError = err?.error?.detail ?? 'Depot impossible.'),
    });
  }

  addLivrableLink(): void {
    if (!this.projet || !this.linkForm.nom.trim() || !this.linkForm.lienExterne.trim()) {
      this.livrableError = 'Nom et lien obligatoires.';
      return;
    }
    this.livrableService.addLink(this.projet.id, {
      typeLivrable: this.linkForm.typeLivrable,
      nom: this.linkForm.nom.trim(),
      description: this.linkForm.description.trim(),
      lienExterne: this.linkForm.lienExterne.trim(),
    }).subscribe({
      next: () => {
        this.livrableMessage = 'Livrable ajouté.';
        this.livrableError = '';
        this.linkForm = { typeLivrable: 'LIEN_GIT', nom: '', description: '', lienExterne: '' };
        this.loadLivrables();
        setTimeout(() => (this.livrableMessage = ''), 2500);
      },
      error: (err) => (this.livrableError = err?.error?.detail ?? 'Ajout impossible.'),
    });
  }

  deleteLivrable(livrable: LivrableCatalogue): void {
    this.livrableService.delete(livrable.id).subscribe({
      next: () => this.loadLivrables(),
      error: () => (this.livrableError = 'Suppression impossible.'),
    });
  }

  downloadLivrable(livrable: LivrableCatalogue): string {
    return this.livrableService.downloadUrl(livrable.id);
  }
}
