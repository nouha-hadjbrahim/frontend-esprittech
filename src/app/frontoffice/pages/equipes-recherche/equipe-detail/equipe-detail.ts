import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { ActivatedRoute, RouterModule } from '@angular/router';
import { CommonModule } from '@angular/common';
import { Location } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatSnackBar } from '@angular/material/snack-bar';
import { finalize, switchMap, forkJoin } from 'rxjs';

import { Equipe } from '../../../../core/models/equipe.model';
import { AffiliationEnseignantResponse } from '../../../../core/models/affiliation-request.model';
import { User } from '../../../../core/models/user.model';
import { EquipeService } from '../../../../core/services/equipe.service';
import { AffiliationService } from '../../../../core/services/affiliation.service';
import { AuthService } from '../../../../core/services/auth.service';

import { ModifierEquipeModal } from '../modifier-equipe-modal/modifier-equipe-modal';
import { AjouterMembreModal } from '../ajouter-membre-modal/ajouter-membre-modal';

@Component({
  selector: 'app-equipe-detail',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule, ModifierEquipeModal, AjouterMembreModal],
  templateUrl: './equipe-detail.html',
  styleUrl: './equipe-detail.css',
})
export class EquipeDetail implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly location = inject(Location);
  private readonly equipeSvc = inject(EquipeService);
  private readonly affiliationSvc = inject(AffiliationService);
  private readonly authSvc = inject(AuthService);
  private readonly snack = inject(MatSnackBar);

  readonly currentUser = this.authSvc.currentUser;

  equipe = signal<Equipe | null>(null);
  affiliations = signal<AffiliationEnseignantResponse[]>([]);
  membres = signal<User[]>([]);
  loading = signal(true);
  error = signal('');
  equipes = signal<Equipe[]>([]);

  editModalOpen = false;
  addMemberModalOpen = false;
  motifDialogOpen = false;
  motifText = '';
  pendingRefuseId: number | null = null;

  isChef = computed(() => this.authSvc.getRole() === 'ROLE_CHEF_EQUIPE');
  isEnseignant = computed(() => this.authSvc.getRole() === 'ROLE_ENSEIGNANT');

  isChefOfThisTeam = computed(() => {
    const user = this.currentUser();
    const eq = this.equipe();
    return !!user && !!eq && eq.chef?.id === user.id;
  });

  isMemberOfThisTeam = computed(() => {
    const user = this.currentUser();
    const eq = this.equipe();
    if (!user || !eq) return false;
    return eq.members?.some((m) => m.id === user.id) ?? false;
  });

  alreadyInTeam = computed(() => {
    if (!this.isEnseignant()) return false;
    const user = this.currentUser();
    if (!user) return false;
    return this.equipes().some((e) =>
      e.members?.some((m) => m.id === user.id) || e.chef?.id === user.id
    );
  });

  teamAffiliations = computed(() => {
    const eq = this.equipe();
    if (!eq) return [];
    return this.affiliations().filter((r) => r.equipeId === eq.id);
  });

  pendingAffiliations = computed(() =>
    this.teamAffiliations().filter((r) => r.statut === 'EN_ATTENTE'),
  );

  canJoin = computed(() => {
    if (!this.isEnseignant()) return false;
    if (this.isMemberOfThisTeam()) return false;
    const eq = this.equipe();
    if (!eq) return false;
    const user = this.currentUser();
    if (!user) return false;
    return !this.affiliations().some(
      (r) =>
        r.equipeId === eq.id &&
        r.enseignant.email === user.email &&
        (r.statut === 'EN_ATTENTE' || r.statut === 'ACCEPTEE'),
    );
  });

  joinStatus = computed(() => {
    if (this.isMemberOfThisTeam()) return 'Déjà membre';
    const eq = this.equipe();
    if (!eq) return '';
    const user = this.currentUser();
    if (!user) return '';
    const req = this.affiliations().find(
      (r) => r.equipeId === eq.id && r.enseignant.email === user.email,
    );
    if (!req) return '';
    if (req.statut === 'EN_ATTENTE') return 'Demande envoyée';
    if (req.statut === 'ACCEPTEE') return 'Acceptée';
    return 'Refusée';
  });

  ngOnInit(): void {
    this.route.paramMap
      .pipe(
        switchMap((params) => {
          const id = Number(params.get('id'));
          this.loading.set(true);
          this.error.set('');
          return forkJoin({
            equipe: this.equipeSvc.getById(id),
            allEquipes: this.equipeSvc.getAll(),
          });
        }),
      )
      .subscribe({
        next: ({ equipe, allEquipes }) => {
          this.equipe.set(equipe);
          this.equipes.set(allEquipes);
          this.loadMembres(equipe.id);
          if (this.isChefOfThisTeam()) {
            this.loadAffiliations(equipe.id);
          } else if (this.isEnseignant()) {
            this.loadMesDemandes();
          }
        },
        error: () => {
          this.error.set("Impossible de charger l'équipe. Vérifiez que le backend est démarré.");
          this.loading.set(false);
          this.toast("Erreur lors du chargement de l'équipe");
        },
      });
  }

  private loadMembres(equipeId: number): void {
    const addChef = (list: User[]): User[] => {
      const eq = this.equipe();
      if (!eq?.chef) return list;
      const hasChef = list.some((m) => m.id === eq.chef!.id);
      return hasChef ? list : [eq.chef, ...list];
    };

    if (this.equipe()?.members && this.equipe()!.members!.length > 0) {
      this.membres.set(addChef(this.equipe()!.members!));
      this.loading.set(false);
      return;
    }
    this.equipeSvc.getMembres(equipeId).pipe(finalize(() => this.loading.set(false))).subscribe({
      next: (data) => this.membres.set(addChef(data)),
      error: () => this.membres.set([]),
    });
  }

  private loadAffiliations(equipeId: number): void {
    this.affiliationSvc.getByEquipe(equipeId).subscribe({
      next: (data) => this.affiliations.set(data),
      error: () => this.affiliations.set([]),
    });
  }

  goBack(): void {
    this.location.back();
  }

  rejoindreEquipe(): void {
    const eq = this.equipe();
    if (!eq) return;
    this.affiliationSvc.create(eq.id).subscribe({
      next: () => {
        if (this.isChefOfThisTeam()) {
          this.loadAffiliations(eq.id);
        } else {
          this.loadMesDemandes();
        }
        this.toast('Demande d\'affiliation envoyée', 'succes');
      },
      error: () => this.toast("Erreur lors de l'envoi de la demande"),
    });
  }

  private loadMesDemandes(): void {
    this.affiliationSvc.getMesDemandes().subscribe({
      next: (data) => this.affiliations.set(data),
      error: () => this.affiliations.set([]),
    });
  }

  // ── Chef actions ──

  openEditModal(): void {
    this.editModalOpen = true;
  }

  onEditSaved(): void {
    this.editModalOpen = false;
    this.reloadEquipe();
    this.toast('Équipe mise à jour', 'succes');
  }

  openAddMemberModal(): void {
    this.addMemberModalOpen = true;
  }

  onMemberAdded(): void {
    this.addMemberModalOpen = false;
    this.reloadEquipe();
    this.toast('Membre(s) ajouté(s) avec succès', 'succes');
  }

  accepterDemande(id: number, nom?: string): void {
    const eq = this.equipe();
    if (!eq) return;
    this.affiliationSvc.traiter(id, eq.id, 'ACCEPTEE').subscribe({
      next: () => {
        this.reloadEquipe();
        this.loadAffiliations(eq.id);
        this.toast(`Demande ${nom ? 'de ' + nom : ''} acceptée`, 'succes');
      },
      error: () => this.toast("Erreur lors de l'acceptation de la demande"),
    });
  }

  ouvrirRefus(id: number): void {
    this.pendingRefuseId = id;
    this.motifText = '';
    this.motifDialogOpen = true;
  }

  confirmerRefus(): void {
    if (this.pendingRefuseId == null) return;
    const eq = this.equipe();
    if (!eq) return;
    this.affiliationSvc.traiter(this.pendingRefuseId, eq.id, 'REFUSEE', this.motifText || undefined).subscribe({
      next: () => {
        this.motifDialogOpen = false;
        this.pendingRefuseId = null;
        this.loadAffiliations(eq.id);
        this.toast('Demande refusée', 'succes');
      },
      error: () => this.toast("Erreur lors du refus de la demande"),
    });
  }

  annulerRefus(): void {
    this.motifDialogOpen = false;
    this.pendingRefuseId = null;
  }

  retirerMembre(userId: number): void {
    const eq = this.equipe();
    if (!eq) return;
    this.equipeSvc.retirerMembre(eq.id, userId).subscribe({
      next: () => {
        this.reloadEquipe();
        this.toast('Membre retiré de l\'équipe', 'succes');
      },
      error: () => this.toast('Erreur lors du retrait du membre'),
    });
  }

  private reloadEquipe(): void {
    const eq = this.equipe();
    if (!eq) return;
    this.equipeSvc.getById(eq.id).subscribe({
      next: (data) => {
        this.equipe.set(data);
        this.loadMembres(data.id);
      },
      error: () => this.toast("Erreur lors du rechargement de l'équipe"),
    });
  }

  // ── Helpers ──

  chefName(): string {
    const eq = this.equipe();
    return eq?.chef ? `${eq.chef.prenom} ${eq.chef.nom}` : 'Non assigné';
  }

  initiales(nom: string): string {
    return nom.split(' ').map((p) => p[0]?.toUpperCase() ?? '').slice(0, 2).join('');
  }

  membreInitiales(m: User): string {
    return `${m.prenom ?? ''} ${m.nom ?? ''}`.trim().split(' ').map((p) => p[0]?.toUpperCase() ?? '').slice(0, 2).join('');
  }

  /** Couleurs avatars membres : chef rouge, puis gris/bleu comme la maquette. */
  couleurAvatarMembre(m: User, index: number): string {
    const eq = this.equipe();
    if (eq?.chef && m.id === eq.chef.id) {
      return '#ef4444';
    }
    const colors = ['#64748b', '#334155', '#475569', '#0f172a'];
    return colors[Math.max(0, index - 1) % colors.length];
  }

  couleurAvatar(u: User): string {
    return this.couleurAvatarMembre(u, 0);
  }

  statutClass(statut: string): string {
    switch (statut) {
      case 'ACCEPTEE': return 'status-acceptee';
      case 'REFUSEE': return 'status-refusee';
      default: return 'status-attente';
    }
  }

  statutLabel(statut: string): string {
    switch (statut) {
      case 'ACCEPTEE': return 'Acceptée';
      case 'REFUSEE': return 'Refusée';
      default: return 'En attente';
    }
  }

  formatDate(date: string): string {
    if (!date) return '';
    const d = new Date(date);
    return d.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' });
  }

  private toast(msg: string, type: 'succes' | 'erreur' = 'erreur') {
    this.snack.open(msg, '✕', {
      duration: 3500,
      panelClass: type === 'succes' ? ['snack-success'] : ['snack-error'],
    });
  }
}
