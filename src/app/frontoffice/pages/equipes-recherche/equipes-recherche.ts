import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { RouterModule, ActivatedRoute } from '@angular/router';
import { MatSnackBar } from '@angular/material/snack-bar';
import { finalize } from 'rxjs';

import { Equipe } from '../../../core/models/equipe.model';
import { AffiliationEnseignantResponse } from '../../../core/models/affiliation-request.model';
import { User } from '../../../core/models/user.model';
import { EquipeService } from '../../../core/services/equipe.service';
import { AffiliationService } from '../../../core/services/affiliation.service';
import { AuthService } from '../../../core/services/auth.service';

import { ModifierEquipeModal } from './modifier-equipe-modal/modifier-equipe-modal';
import { AjouterMembreModal } from './ajouter-membre-modal/ajouter-membre-modal';
import { ConfirmDialog } from '../../../shared/components/confirm-dialog/confirm-dialog';

@Component({
  selector: 'app-equipes-recherche',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule, ModifierEquipeModal, AjouterMembreModal, ConfirmDialog],
  templateUrl: './equipes-recherche.html',
  styleUrl: './equipes-recherche.scss',
})
export class EquipesRecherche implements OnInit {
  private readonly equipeSvc = inject(EquipeService);
  private readonly affiliationSvc = inject(AffiliationService);
  private readonly authSvc = inject(AuthService);
  private readonly route = inject(ActivatedRoute);

  private readonly snack = inject(MatSnackBar);

  readonly currentUser = this.authSvc.currentUser;

  equipes = signal<Equipe[]>([]);
  affiliations = signal<AffiliationEnseignantResponse[]>([]);
  loading = signal(true);
  activeTab = signal(0);
  searchQuery = signal('');
  newMemberName = '';

  editModalOpen = false;
  addMemberModalOpen = false;
  confirmDialogOpen = false;
  motifDialogOpen = false;
  motifText = '';
  pendingRefuseId: number | null = null;
  pendingRefuseEquipeId: number | null = null;
  memberToRemove: { equipeId: number; userId: number; nom: string } | null = null;

  isChef = computed(() => this.authSvc.getRole() === 'ROLE_CHEF_EQUIPE');
  isEnseignant = computed(() => this.authSvc.getRole() === 'ROLE_ENSEIGNANT');

  myTeam = computed(() => {
    const user = this.currentUser();
    if (!user) return null;
    return this.equipes().find((e) => e.chef?.id === user.id) ?? null;
  });

  enseignantTeam = computed(() => {
    const user = this.currentUser();
    if (!user) return null;
    return this.equipes().find((e) =>
      e.members?.some((m) => m.id === user.id) ||
      e.memberIds?.includes(user.id)
    ) ?? null;
  });

  otherTeams = computed(() => {
    const my = this.myTeam();
    return my ? this.equipes().filter((e) => e.id !== my.id) : this.equipes();
  });

  filteredTeams = computed(() => {
    const source = this.isChef() ? this.otherTeams() : this.equipes();
    const q = this.searchQuery().toLowerCase().trim();
    if (!q) return source;
    return source.filter(
      (t) =>
        t.nom.toLowerCase().includes(q) ||
        t.domaine.toLowerCase().includes(q) ||
        (t.chef && `${t.chef.prenom} ${t.chef.nom}`.toLowerCase().includes(q)),
    );
  });

  enseignantTeamsList = computed(() => {
    const all = this.equipes();
    const my = this.enseignantTeam();
    const q = this.searchQuery().toLowerCase().trim();
    let list = my ? all.filter((e) => e.id !== my.id) : all;
    if (q) {
      list = list.filter(
        (t) =>
          t.nom.toLowerCase().includes(q) ||
          t.domaine.toLowerCase().includes(q) ||
          (t.chef && `${t.chef.prenom} ${t.chef.nom}`.toLowerCase().includes(q)),
      );
    }
    return list;
  });

  allTeamsUnified = computed(() => {
    const user = this.currentUser();
    if (!user) return this.equipes();
    const my = this.enseignantTeam();
    if (!my) return this.filtredByQuery(this.equipes());
    return this.filtredByQuery([my, ...this.equipes().filter((e) => e.id !== my.id)]);
  });

  private filtredByQuery(list: Equipe[]): Equipe[] {
    const q = this.searchQuery().toLowerCase().trim();
    if (!q) return list;
    return list.filter(
      (t) =>
        t.nom.toLowerCase().includes(q) ||
        t.domaine.toLowerCase().includes(q) ||
        (t.chef && `${t.chef.prenom} ${t.chef.nom}`.toLowerCase().includes(q)),
    );
  }

  myTeamAffiliations = computed(() => {
    const team = this.myTeam();
    if (!team) return [];
    return this.affiliations().filter((r) => r.equipeId === team.id);
  });

  chefPendingCount = computed(() =>
    this.myTeamAffiliations().filter((r) => r.statut === 'EN_ATTENTE').length,
  );

  myDemandes = computed(() => {
    const user = this.currentUser();
    if (!user) return [];
    return this.affiliations().filter((r) => r.enseignant.email === user.email);
  });

  myDemandesPendingCount = computed(() =>
    this.myDemandes().filter((r) => r.statut === 'EN_ATTENTE').length,
  );

  ngOnInit(): void {
    const tab = this.route.snapshot.data['tab'];
    if (tab != null) this.activeTab.set(tab);
    this.loadData();
  }

  private loadData(): void {
    this.loading.set(true);
    this.equipeSvc.getAll().pipe(finalize(() => this.loading.set(false))).subscribe({
      next: (data) => {
        this.equipes.set(data);
        this.loadAffiliationsForRole();
      },
      error: () => {
        this.equipes.set([]);
        this.toast('Erreur lors du chargement des équipes');
      },
    });
  }

  private loadAffiliationsForRole(): void {
    const user = this.currentUser();
    if (!user) return;

    if (this.isChef()) {
      const team = this.myTeam();
      if (team) {
        this.affiliationSvc.getByEquipe(team.id).subscribe({
          next: (data) => this.affiliations.set(data),
          error: () => {
            this.affiliations.set([]);
            this.toast('Erreur lors du chargement des affiliations');
          },
        });
      } else {
        this.affiliations.set([]);
      }
    } else {
      this.affiliationSvc.getMesDemandes().subscribe({
        next: (data) => this.affiliations.set(data),
        error: () => {
          this.affiliations.set([]);
          this.toast('Erreur lors du chargement de mes demandes');
        },
      });
    }
  }

  reloadAffiliations(): void {
    this.loadAffiliationsForRole();
  }

  // ── Chef actions ──

  openEditModal(): void {
    this.editModalOpen = true;
  }

  onEditSaved(): void {
    this.editModalOpen = false;
    this.loadData();
    this.toast('Équipe mise à jour', 'succes');
  }

  openAddMemberModal(): void {
    this.addMemberModalOpen = true;
  }

  onMemberAdded(): void {
    this.addMemberModalOpen = false;
    this.loadData();
    this.toast('Membre(s) ajouté(s) avec succès', 'succes');
  }

  accepterDemande(id: number, equipeId: number, nom?: string): void {
    this.affiliationSvc.traiter(id, equipeId, 'ACCEPTEE').subscribe({
      next: () => {
        this.loadData();
        this.toast(`Demande ${nom ? 'de ' + nom : ''} acceptée`, 'succes');
      },
      error: () => this.toast("Erreur lors de l'acceptation de la demande"),
    });
  }

  ouvrirRefus(id: number, equipeId: number): void {
    this.pendingRefuseId = id;
    this.pendingRefuseEquipeId = equipeId;
    this.motifText = '';
    this.motifDialogOpen = true;
  }

  confirmerRefus(): void {
    if (this.pendingRefuseId == null || this.pendingRefuseEquipeId == null) return;
    this.affiliationSvc.traiter(this.pendingRefuseId, this.pendingRefuseEquipeId, 'REFUSEE', this.motifText || undefined).subscribe({
      next: () => {
        this.motifDialogOpen = false;
        this.pendingRefuseId = null;
        this.pendingRefuseEquipeId = null;
        this.reloadAffiliations();
        this.toast('Demande refusée', 'succes');
      },
      error: () => this.toast("Erreur lors du refus de la demande"),
    });
  }

  annulerRefus(): void {
    this.motifDialogOpen = false;
    this.pendingRefuseId = null;
    this.pendingRefuseEquipeId = null;
  }

  retirerMembre(equipeId: number, userId: number, nom: string): void {
    this.memberToRemove = { equipeId, userId, nom };
    this.confirmDialogOpen = true;
  }

  onRemoveConfirmed(): void {
    const target = this.memberToRemove;
    if (!target) return;
    this.equipeSvc.retirerMembre(target.equipeId, target.userId).subscribe({
      next: () => {
        this.confirmDialogOpen = false;
        this.memberToRemove = null;
        this.loadData();
        this.toast('Membre retiré de l\'équipe', 'succes');
      },
      error: () => {
        this.confirmDialogOpen = false;
        this.memberToRemove = null;
        this.toast('Erreur lors du retrait du membre');
      },
    });
  }

  cancelRemove(): void {
    this.confirmDialogOpen = false;
    this.memberToRemove = null;
  }

  affiliationState(equipeId: number): string | null {
    const user = this.currentUser();
    if (!user) return null;
    const req = this.affiliations().find(
      (r) => r.equipeId === equipeId && r.enseignant.email === user.email,
    );
    return req ? req.statut : null;
  }

  affiliationMotif(equipeId: number): string | null {
    const user = this.currentUser();
    if (!user) return null;
    const req = this.affiliations().find(
      (r) => r.equipeId === equipeId && r.enseignant.email === user.email,
    );
    return req?.motifDecision ?? null;
  }

  // ── Enseignant actions ──

  rejoindreEquipe(equipeId: number): void {
    this.affiliationSvc.create(equipeId).subscribe({
      next: () => {
        this.reloadAffiliations();
        this.toast('Demande d\'affiliation envoyée', 'succes');
      },
      error: () => this.toast("Erreur lors de l'envoi de la demande"),
    });
  }

  // ── Helpers ──

  isUserTeam(equipe: Equipe): boolean {
    const user = this.currentUser();
    if (!user) return false;
    if (this.isChef()) return this.myTeam()?.id === equipe.id;
    return this.enseignantTeam()?.id === equipe.id;
  }

  membersAvecChef(equipe: Equipe): User[] {
    let members = equipe.members ?? [];
    if (!equipe.chef) return members;
    const hasChef = members.some((m) => m.id === equipe.chef!.id);
    members = hasChef ? members : [equipe.chef, ...members];
    const q = this.newMemberName.toLowerCase().trim();
    if (!q) return members;
    return members.filter(
      (m) =>
        `${m.prenom} ${m.nom}`.toLowerCase().includes(q) ||
        m.email.toLowerCase().includes(q) ||
        (m.departement ?? '').toLowerCase().includes(q),
    );
  }

  chefName(equipe: Equipe): string {
    return equipe.chef ? `${equipe.chef.prenom} ${equipe.chef.nom}` : 'Non assigné';
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
