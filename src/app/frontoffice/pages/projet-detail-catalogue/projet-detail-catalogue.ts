import { Component, OnInit, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, RouterModule } from '@angular/router';
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

type CatalogueTab = 'infos' | 'livrables' | 'progression' | 'historique';

/** Statuts pour lesquels un projet est publié au catalogue (dépôt de livrables autorisé). */
const STATUTS_CATALOGUE = new Set<StatutProjet>([
  'VALIDE',
  'CANDIDAT_INDUSTRIALISATION_INTERNE',
  'CANDIDAT_INDUSTRIALISATION_EXTERNE',
  'INDUSTRIALISE_DSI',
  'INDUSTRIALISE_EXTERNE',
]);

/**
 * Page de détail public d'un projet du catalogue. L'onglet « Informations » et
 * l'onglet « Livrables » sont actifs ; « Progression » et « Historique » restent
 * des espaces réservés (« À venir »).
 */
@Component({
  selector: 'app-projet-detail-catalogue',
  imports: [RouterModule, FormsModule],
  templateUrl: './projet-detail-catalogue.html',
  styleUrl: './projet-detail-catalogue.css',
})
export class ProjetDetailCatalogue implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly projetService = inject(ProjetCatalogueService);
  private readonly authService = inject(AuthService);
  private readonly livrableService = inject(CatalogueLivrableService);

  readonly typeLabels = TYPE_PROJET_LABELS;
  readonly statutLabels = STATUT_PROJET_LABELS;
  readonly typeLivrableOptions = TYPE_LIVRABLE_OPTIONS;
  readonly livrableLabels = TYPE_LIVRABLE_LABELS;

  readonly tabs: { id: CatalogueTab; label: string }[] = [
    { id: 'infos', label: 'Informations' },
    { id: 'livrables', label: 'Livrables' },
    { id: 'progression', label: 'Progression' },
    { id: 'historique', label: 'Historique' },
  ];

  projet?: ProjetDetails;
  isLoading = true;
  errorMessage = '';
  activeTab: CatalogueTab = 'infos';

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
        this.loadLivrables();
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
        this.livrables = [];
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
