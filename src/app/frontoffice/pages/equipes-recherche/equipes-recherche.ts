import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { finalize } from 'rxjs';

import { Equipe } from '../../../core/models/equipe.model';
import { AffiliationRequest } from '../../../core/models/affiliation-request.model';
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

  readonly currentUser = this.authSvc.currentUser;

  equipes = signal<Equipe[]>([]);
  affiliations = signal<AffiliationRequest[]>([]);
  loading = signal(true);
  activeTab = signal(0);
  searchQuery = '';
  newMemberName = '';

  editModalOpen = false;
  addMemberModalOpen = false;
  confirmDialogOpen = false;
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

  chefTabLabels = ['Mon équipe', "Demandes d'affiliation", 'Toutes les équipes'];
  enseignantTabLabels = ['Équipes', 'Mes demandes'];

  tabLabels = computed(() => (this.isChef() ? this.chefTabLabels : this.enseignantTabLabels));

  otherTeams = computed(() => {
    const my = this.myTeam();
    return my ? this.equipes().filter((e) => e.id !== my.id) : this.equipes();
  });

  filteredTeams = computed(() => {
    const source = this.isChef() ? this.otherTeams() : this.equipes();
    const q = this.searchQuery.toLowerCase().trim();
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
    const q = this.searchQuery.toLowerCase().trim();
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
    const q = this.searchQuery.toLowerCase().trim();
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

  ignored = computed(() => 0);
  chefPendingCount = computed(() =>
    this.myTeamAffiliations().filter((r) => r.statut === 'en_attente').length,
  );

  myDemandes = computed(() => {
    const user = this.currentUser();
    if (!user) return [];
    return this.affiliations().filter((r) => r.encadrantEmail === user.email);
  });

  myDemandesPendingCount = computed(() =>
    this.myDemandes().filter((r) => r.statut === 'en_attente').length,
  );

  ngOnInit(): void {
    this.loadData();
  }

  private loadData(): void {
    this.loading.set(true);
    this.equipeSvc.getAll().pipe(finalize(() => this.loading.set(false))).subscribe({
      next: (data) => this.equipes.set(data),
      error: () => this.equipes.set([]),
    });

    this.affiliationSvc.getAll().subscribe({
      next: (data) => this.affiliations.set(data),
      error: () => this.affiliations.set([]),
    });
  }

  reloadAffiliations(): void {
    this.affiliationSvc.getAll().subscribe({
      next: (data) => this.affiliations.set(data),
      error: () => this.affiliations.set([]),
    });
  }

  setTab(index: number): void {
    this.activeTab.set(index);
  }

  // ── Chef actions ──

  openEditModal(): void {
    this.editModalOpen = true;
  }

  onEditSaved(): void {
    this.editModalOpen = false;
    this.loadData();
  }

  openAddMemberModal(): void {
    this.addMemberModalOpen = true;
  }

  onMemberAdded(): void {
    this.addMemberModalOpen = false;
    this.loadData();
  }

  accepterDemande(id: number): void {
    this.affiliationSvc.decider(id, 'acceptee').subscribe({
      next: () => this.reloadAffiliations(),
      error: () => {},
    });
  }

  refuserDemande(id: number): void {
    this.affiliationSvc.decider(id, 'refusee').subscribe({
      next: () => this.reloadAffiliations(),
      error: () => {},
    });
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
      },
      error: () => {
        this.confirmDialogOpen = false;
        this.memberToRemove = null;
      },
    });
  }

  cancelRemove(): void {
    this.confirmDialogOpen = false;
    this.memberToRemove = null;
  }

  hasPendingOrAcceptedRequest(equipeId: number): boolean {
    const user = this.currentUser();
    if (!user) return true;
    return this.affiliations().some(
      (r) =>
        r.equipeId === equipeId &&
        r.encadrantEmail === user.email &&
        (r.statut === 'en_attente' || r.statut === 'acceptee'),
    );
  }

  // ── Enseignant actions ──

  rejoindreEquipe(equipeId: number): void {
    this.affiliationSvc.create({
      equipeId,
      message: "Demande d'intégration via la plateforme.",
    }).subscribe({
      next: () => this.reloadAffiliations(),
      error: () => {},
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
    const members = equipe.members ?? [];
    if (!equipe.chef) return members;
    const hasChef = members.some((m) => m.id === equipe.chef!.id);
    return hasChef ? members : [equipe.chef, ...members];
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
