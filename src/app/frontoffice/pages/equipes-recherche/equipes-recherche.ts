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
import { FilterDropdown } from '../../components/sujets/filter-dropdown/filter-dropdown';
import { FrontofficeEmptyState } from '../../components/frontoffice-empty-state/frontoffice-empty-state';

@Component({
  selector: 'app-equipes-recherche',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    RouterModule,
    ModifierEquipeModal,
    AjouterMembreModal,
    ConfirmDialog,
    FilterDropdown,
    FrontofficeEmptyState,
  ],
  templateUrl: './equipes-recherche.html',
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
  selectedDomaine = signal('');
  selectedStatut = signal('');
  sortOrder = signal('recent');
  affilSearchQuery = signal('');
  affilSelectedStatut = signal('');
  affilSortOrder = signal('recent');
  newMemberName = '';

  readonly statutOptions = [
    { value: '', label: 'Tous les statuts' },
    { value: 'Actif', label: 'Actif' },
    { value: 'Inactif', label: 'Inactif' },
  ];

  readonly sortOptions = [
    { value: 'recent', label: 'Plus récents' },
    { value: 'ancien', label: 'Plus anciens' },
    { value: 'nom', label: 'Nom A–Z' },
    { value: 'membres', label: 'Plus de membres' },
  ];

  readonly affilStatutOptions = [
    { value: '', label: 'Tous les statuts' },
    { value: 'EN_ATTENTE', label: 'En attente' },
    { value: 'ACCEPTEE', label: 'Acceptée' },
    { value: 'REFUSEE', label: 'Refusée' },
  ];

  readonly affilSortOptions = [
    { value: 'recent', label: 'Plus récents' },
    { value: 'ancien', label: 'Plus anciens' },
    { value: 'nom', label: 'Nom A–Z' },
  ];

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

  domainePills = computed(() => {
    const names = [...new Set(this.equipes().map((e) => e.domaine).filter(Boolean))].sort((a, b) =>
      a.localeCompare(b, 'fr'),
    );
    return [{ value: '', label: 'Tous' }, ...names.map((d) => ({ value: d, label: d }))];
  });

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
    return this.applyTeamFilters(source);
  });

  enseignantTeamsList = computed(() => {
    const all = this.equipes();
    const my = this.enseignantTeam();
    const list = my ? all.filter((e) => e.id !== my.id) : all;
    return this.applyTeamFilters(list);
  });

  allTeamsUnified = computed(() => {
    const user = this.currentUser();
    if (!user) return this.applyTeamFilters(this.equipes());
    const my = this.enseignantTeam();
    if (!my) return this.applyTeamFilters(this.equipes());
    return this.applyTeamFilters([my, ...this.equipes().filter((e) => e.id !== my.id)]);
  });

  private applyTeamFilters(list: Equipe[]): Equipe[] {
    const q = this.searchQuery().toLowerCase().trim();
    const domaine = this.selectedDomaine();
    const statut = this.selectedStatut();
    const sort = this.sortOrder();

    let result = list.filter((t) => {
      if (domaine && t.domaine !== domaine) return false;
      if (statut && t.statut !== statut) return false;
      if (!q) return true;
      const chefName = t.chef ? `${t.chef.prenom} ${t.chef.nom}` : '';
      const desc = t.description ?? '';
      return (
        t.nom.toLowerCase().includes(q) ||
        t.domaine.toLowerCase().includes(q) ||
        desc.toLowerCase().includes(q) ||
        chefName.toLowerCase().includes(q)
      );
    });

    result = [...result].sort((a, b) => {
      if (sort === 'nom') return a.nom.localeCompare(b.nom, 'fr');
      if (sort === 'membres') return b.nbMembres - a.nbMembres;
      const da = new Date(a.createdAt).getTime();
      const db = new Date(b.createdAt).getTime();
      if (sort === 'ancien') return da - db;
      return db - da;
    });

    return result;
  }

  selectDomainePill(value: string): void {
    this.selectedDomaine.set(value);
  }

  myTeamAffiliations = computed(() => {
    const team = this.myTeam();
    if (!team) return [];
    return this.affiliations().filter((r) => r.equipeId === team.id);
  });

  myTeamPendingAffiliations = computed(() =>
    this.myTeamAffiliations().filter((r) => r.statut === 'EN_ATTENTE'),
  );

  chefPendingCount = computed(() => this.myTeamPendingAffiliations().length);

  myDemandes = computed(() => {
    const user = this.currentUser();
    if (!user) return [];
    return this.affiliations().filter((r) => r.enseignant.email === user.email);
  });

  myDemandesPendingCount = computed(() =>
    this.myDemandes().filter((r) => r.statut === 'EN_ATTENTE').length,
  );

  affiliationSource = computed(() =>
    this.isChef() ? this.myTeamPendingAffiliations() : this.myDemandes(),
  );

  affiliationSummary = computed(() => {
    const list = this.isChef() ? this.myTeamAffiliations() : this.myDemandes();
    return {
      total: list.length,
      enAttente: list.filter((r) => r.statut === 'EN_ATTENTE').length,
      acceptees: list.filter((r) => r.statut === 'ACCEPTEE').length,
      refusees: list.filter((r) => r.statut === 'REFUSEE').length,
    };
  });

  filteredAffiliations = computed(() => {
    const q = this.affilSearchQuery().toLowerCase().trim();
    const statut = this.affilSelectedStatut();
    const sort = this.affilSortOrder();
    const isChefView = this.isChef();

    let result = this.affiliationSource().filter((r) => {
      if (statut && r.statut !== statut) return false;
      if (!q) return true;
      const enseignant = `${r.enseignant.prenom} ${r.enseignant.nom}`.toLowerCase();
      const email = (r.enseignant.email ?? '').toLowerCase();
      const equipe = (r.equipeNom ?? '').toLowerCase();
      const domaine = this.equipeDomaine(r.equipeId).toLowerCase();
      const motif = (r.motifDecision ?? '').toLowerCase();
      return (
        enseignant.includes(q)
        || email.includes(q)
        || equipe.includes(q)
        || domaine.includes(q)
        || motif.includes(q)
      );
    });

    result = [...result].sort((a, b) => {
      if (sort === 'nom') {
        const nameA = isChefView
          ? `${a.enseignant.prenom} ${a.enseignant.nom}`
          : (a.equipeNom || '');
        const nameB = isChefView
          ? `${b.enseignant.prenom} ${b.enseignant.nom}`
          : (b.equipeNom || '');
        return nameA.localeCompare(nameB, 'fr');
      }
      const da = new Date(a.dateDemande).getTime();
      const db = new Date(b.dateDemande).getTime();
      if (sort === 'ancien') return da - db;
      return db - da;
    });

    return result;
  });

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

  /** Jusqu'à 3 personnes (chef + membres) pour la pile d'avatars sur les cartes. */
  membresPourAvatar(equipe: Equipe): User[] {
    const list: User[] = [];
    const chefId = equipe.chef?.id;

    if (equipe.chef) {
      list.push(equipe.chef);
    }

    for (const member of equipe.members ?? []) {
      if (member.id !== chefId) {
        list.push(member);
      }
    }

    return list.slice(0, 3);
  }

  /** Couleurs fixes de la pile d'avatars (comme la maquette). */
  couleurAvatarCarte(index: number): string {
    const colors = ['#e23e3e', '#8d99ae', '#4a5568'];
    return colors[index] ?? '#4a5568';
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

  affiliationAccentClass(statut: string): string {
    switch (statut) {
      case 'ACCEPTEE': return 'accent--acceptee';
      case 'REFUSEE': return 'accent--refusee';
      default: return 'accent--attente';
    }
  }

  equipeDomaine(equipeId: number): string {
    return this.equipes().find((e) => e.id === equipeId)?.domaine ?? 'Équipe RDI';
  }

  formatDate(date: string): string {
    if (!date) return '';
    const d = new Date(date);
    return d.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' });
  }

  formatDateLong(date: string): string {
    if (!date) return '—';
    const d = new Date(date);
    if (Number.isNaN(d.getTime())) return '—';
    return d.toLocaleDateString('fr-FR', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });
  }

  formatDateYmd(date: string): string {
    if (!date) return '—';
    const d = new Date(date);
    if (Number.isNaN(d.getTime())) return '—';
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  }

  timeAgo(date: string): string {
    if (!date) return '';
    const d = new Date(date);
    if (Number.isNaN(d.getTime())) return '';
    const days = Math.max(0, Math.floor((Date.now() - d.getTime()) / 86_400_000));
    if (days === 0) return "Aujourd'hui";
    if (days === 1) return 'Il y a 1 jour';
    if (days < 7) return `Il y a ${days} jours`;
    const weeks = Math.floor(days / 7);
    if (weeks === 1) return 'Il y a 1 semaine';
    if (weeks < 5) return `Il y a ${weeks} semaines`;
    const months = Math.floor(days / 30);
    return months <= 1 ? 'Il y a 1 mois' : `Il y a ${months} mois`;
  }

  private toast(msg: string, type: 'succes' | 'erreur' = 'erreur') {
    this.snack.open(msg, '✕', {
      duration: 3500,
      panelClass: type === 'succes' ? ['snack-success'] : ['snack-error'],
    });
  }
}
