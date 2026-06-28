import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { ActivatedRoute, RouterModule } from '@angular/router';
import { CommonModule } from '@angular/common';
import { Location } from '@angular/common';
import { finalize, switchMap } from 'rxjs';

import { Equipe } from '../../../../core/models/equipe.model';
import { AffiliationRequest } from '../../../../core/models/affiliation-request.model';
import { User } from '../../../../core/models/user.model';
import { EquipeService } from '../../../../core/services/equipe.service';
import { AffiliationService } from '../../../../core/services/affiliation.service';
import { AuthService } from '../../../../core/services/auth.service';

import { ModifierEquipeModal } from '../modifier-equipe-modal/modifier-equipe-modal';
import { AjouterMembreModal } from '../ajouter-membre-modal/ajouter-membre-modal';

@Component({
  selector: 'app-equipe-detail',
  standalone: true,
  imports: [CommonModule, RouterModule, ModifierEquipeModal, AjouterMembreModal],
  templateUrl: './equipe-detail.html',
  styleUrl: './equipe-detail.css',
})
export class EquipeDetail implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly location = inject(Location);
  private readonly equipeSvc = inject(EquipeService);
  private readonly affiliationSvc = inject(AffiliationService);
  private readonly authSvc = inject(AuthService);

  readonly currentUser = this.authSvc.currentUser;

  equipe = signal<Equipe | null>(null);
  affiliations = signal<AffiliationRequest[]>([]);
  membres = signal<User[]>([]);
  loading = signal(true);
  error = signal('');

  editModalOpen = false;
  addMemberModalOpen = false;

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

  teamAffiliations = computed(() => {
    const eq = this.equipe();
    if (!eq) return [];
    return this.affiliations().filter((r) => r.equipeId === eq.id);
  });

  pendingAffiliations = computed(() =>
    this.teamAffiliations().filter((r) => r.statut === 'en_attente'),
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
        r.encadrantEmail === user.email &&
        (r.statut === 'en_attente' || r.statut === 'acceptee'),
    );
  });

  joinStatus = computed(() => {
    if (this.isMemberOfThisTeam()) return 'Déjà membre';
    const eq = this.equipe();
    if (!eq) return '';
    const user = this.currentUser();
    if (!user) return '';
    const req = this.affiliations().find(
      (r) => r.equipeId === eq.id && r.encadrantEmail === user.email,
    );
    if (!req) return '';
    if (req.statut === 'en_attente') return 'Demande envoyée';
    if (req.statut === 'acceptee') return 'Acceptée';
    return 'Refusée';
  });

  ngOnInit(): void {
    this.route.paramMap
      .pipe(
        switchMap((params) => {
          const id = Number(params.get('id'));
          this.loading.set(true);
          this.error.set('');
          return this.equipeSvc.getById(id);
        }),
      )
      .subscribe({
        next: (eq) => {
          this.equipe.set(eq);
          this.loadMembres(eq.id);
          this.loadAffiliations(eq.id);
        },
        error: () => {
          this.error.set("Impossible de charger l'équipe. Vérifiez que le backend est démarré.");
          this.loading.set(false);
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
    this.affiliationSvc.create({
      equipeId: eq.id,
      message: "Demande d'intégration via la plateforme.",
    }).subscribe({
      next: () => this.loadAffiliations(eq.id),
      error: () => {},
    });
  }

  // ── Chef actions ──

  openEditModal(): void {
    this.editModalOpen = true;
  }

  onEditSaved(): void {
    this.editModalOpen = false;
    this.reloadEquipe();
  }

  openAddMemberModal(): void {
    this.addMemberModalOpen = true;
  }

  onMemberAdded(): void {
    this.addMemberModalOpen = false;
    this.reloadEquipe();
  }

  accepterDemande(id: number): void {
    this.affiliationSvc.decider(id, 'acceptee').subscribe({
      next: () => {
        const eq = this.equipe();
        if (eq) this.loadAffiliations(eq.id);
      },
      error: () => {},
    });
  }

  refuserDemande(id: number): void {
    this.affiliationSvc.decider(id, 'refusee').subscribe({
      next: () => {
        const eq = this.equipe();
        if (eq) this.loadAffiliations(eq.id);
      },
      error: () => {},
    });
  }

  retirerMembre(userId: number): void {
    const eq = this.equipe();
    if (!eq) return;
    this.equipeSvc.retirerMembre(eq.id, userId).subscribe({
      next: () => this.reloadEquipe(),
      error: () => {},
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
      error: () => {},
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

  couleurAvatar(u: User): string {
    const colors = ['#E63946', '#0ea5e9', '#10b981', '#f59e0b', '#6366f1', '#8b5cf6', '#ec4899'];
    if (!u?.id) return colors[0];
    const idx = String(u.id).split('').reduce((a, c) => a + c.charCodeAt(0), 0) % colors.length;
    return colors[idx];
  }

  statutClass(statut: string): string {
    switch (statut) {
      case 'acceptee': return 'status-acceptee';
      case 'refusee': return 'status-refusee';
      default: return 'status-attente';
    }
  }

  formatDate(date: string): string {
    if (!date) return '';
    const d = new Date(date);
    return d.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' });
  }
}
