import { Component, OnInit, HostListener, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatSnackBar } from '@angular/material/snack-bar';
import { finalize } from 'rxjs';

import { AffiliationEnseignantResponse } from '../../../core/models/affiliation-request.model';
import { AffiliationService } from '../../../core/services/affiliation.service';

type FilterKey = 'statut' | 'equipe';
type StatutFilter = '' | 'EN_ATTENTE' | 'ACCEPTEE' | 'REFUSEE';

@Component({
  selector: 'app-demandes-affiliation',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './demandes-affiliation.component.html',
  styleUrl: './demandes-affiliation.component.css',
})
export class DemandesAffiliationComponent implements OnInit {
  private readonly svc = inject(AffiliationService);
  private readonly snack = inject(MatSnackBar);

  readonly demandes = signal<AffiliationEnseignantResponse[]>([]);
  filtered: AffiliationEnseignantResponse[] = [];
  equipeOptions: { value: string; label: string }[] = [{ value: '', label: 'Toutes les équipes' }];
  query = '';
  selectedEquipeId = '';
  selectedStatut: StatutFilter = 'EN_ATTENTE';
  chargement = true;
  page = 0;
  readonly pageSize = 8;
  readonly openFilter = signal<FilterKey | null>(null);

  readonly statutOptions: { value: StatutFilter; label: string }[] = [
    { value: '', label: 'Tous les statuts' },
    { value: 'EN_ATTENTE', label: 'En attente' },
    { value: 'ACCEPTEE', label: 'Acceptées' },
    { value: 'REFUSEE', label: 'Refusées' },
  ];

  motifDialogOpen = false;
  motifText = '';
  pendingRefuse: AffiliationEnseignantResponse | null = null;
  motifEnseignant = '';
  motifEquipe = '';

  readonly nbEnAttente = computed(() => this.demandes().filter((d) => d.statut === 'EN_ATTENTE').length);
  readonly nbAcceptees = computed(() => this.demandes().filter((d) => d.statut === 'ACCEPTEE').length);
  readonly nbRefusees = computed(() => this.demandes().filter((d) => d.statut === 'REFUSEE').length);

  stats = computed(() => [
    { label: 'En attente', value: this.nbEnAttente(), icon: 'pending' as const },
    { label: 'Acceptées', value: this.nbAcceptees(), icon: 'accepted' as const },
    { label: 'Refusées', value: this.nbRefusees(), icon: 'rejected' as const },
  ]);

  get statutFilterLabel(): string {
    return this.statutOptions.find((o) => o.value === this.selectedStatut)?.label ?? 'Tous les statuts';
  }

  get equipeFilterLabel(): string {
    return this.equipeOptions.find((o) => o.value === this.selectedEquipeId)?.label ?? 'Toutes les équipes';
  }

  get totalElements(): number {
    return this.filtered.length;
  }

  get totalPages(): number {
    return Math.max(1, Math.ceil(this.totalElements / this.pageSize));
  }

  get first(): boolean {
    return this.page <= 0;
  }

  get last(): boolean {
    return this.page >= this.totalPages - 1;
  }

  get pagedItems(): AffiliationEnseignantResponse[] {
    const start = this.page * this.pageSize;
    return this.filtered.slice(start, start + this.pageSize);
  }

  get pageDisplayCount(): number {
    return this.pagedItems.length;
  }

  get pageNumbers(): number[] {
    return Array.from({ length: this.totalPages }, (_, i) => i + 1);
  }

  getInitial(prenom: string, nom: string): string {
    const a = (prenom?.trim()?.charAt(0) || '').toUpperCase();
    const b = (nom?.trim()?.charAt(0) || '').toUpperCase();
    return (a + b) || '?';
  }

  statutLabel(statut: AffiliationEnseignantResponse['statut']): string {
    if (statut === 'EN_ATTENTE') return 'En attente';
    if (statut === 'ACCEPTEE') return 'Acceptée';
    return 'Refusée';
  }

  statutBadgeClass(statut: AffiliationEnseignantResponse['statut']): string {
    if (statut === 'EN_ATTENTE') return 'badge--attente';
    if (statut === 'ACCEPTEE') return 'badge--acceptee';
    return 'badge--refusee';
  }

  statutDotClass(statut: AffiliationEnseignantResponse['statut']): string {
    if (statut === 'EN_ATTENTE') return 'dot-attente';
    if (statut === 'ACCEPTEE') return 'dot-acceptee';
    return 'dot-refusee';
  }

  @HostListener('document:click')
  closeFiltersOnOutsideClick(): void {
    this.openFilter.set(null);
  }

  toggleFilter(filter: FilterKey, event: Event): void {
    event.stopPropagation();
    this.openFilter.update((current) => (current === filter ? null : filter));
  }

  selectStatutFilter(value: StatutFilter): void {
    this.selectedStatut = value;
    this.openFilter.set(null);
    this.appliquerFiltre();
  }

  selectEquipeFilter(value: string): void {
    this.selectedEquipeId = value;
    this.openFilter.set(null);
    this.appliquerFiltre();
  }

  ngOnInit() {
    this.charger();
  }

  charger() {
    this.chargement = true;
    this.svc.getAll().pipe(finalize(() => (this.chargement = false))).subscribe({
      next: (data) => {
        this.demandes.set(data);
        this.refreshEquipeOptions();
        this.appliquerFiltre();
      },
      error: () => this.toast('Erreur lors du chargement des demandes'),
    });
  }

  appliquerFiltre() {
    const q = this.query.toLowerCase().trim();
    const equipeId = this.selectedEquipeId ? Number(this.selectedEquipeId) : null;

    this.filtered = this.demandes()
      .filter((d) => !this.selectedStatut || d.statut === this.selectedStatut)
      .filter((d) => (equipeId == null || Number.isNaN(equipeId) ? true : d.equipeId === equipeId))
      .filter((d) => {
        if (!q) return true;
        return (
          `${d.enseignant.prenom} ${d.enseignant.nom}`.toLowerCase().includes(q) ||
          d.enseignant.email.toLowerCase().includes(q) ||
          d.equipeNom.toLowerCase().includes(q)
        );
      });
    this.page = 0;
  }

  prevPage(): void {
    if (!this.first) this.page--;
  }

  nextPage(): void {
    if (!this.last) this.page++;
  }

  goToPage(newPage: number): void {
    if (newPage < 0 || newPage >= this.totalPages) return;
    this.page = newPage;
  }

  accepter(d: AffiliationEnseignantResponse) {
    this.svc.traiter(d.id, d.equipeId, 'ACCEPTEE').subscribe({
      next: () => {
        this.toast(`Demande de ${d.enseignant.prenom} ${d.enseignant.nom} acceptée`, 'succes');
        this.charger();
      },
      error: () => this.toast("Erreur lors de l'acceptation"),
    });
  }

  ouvrirRefus(d: AffiliationEnseignantResponse) {
    this.pendingRefuse = d;
    this.motifEnseignant = `${d.enseignant.prenom} ${d.enseignant.nom}`;
    this.motifEquipe = d.equipeNom;
    this.motifText = '';
    this.motifDialogOpen = true;
  }

  confirmerRefus() {
    if (!this.pendingRefuse) return;
    const d = this.pendingRefuse;
    this.svc.traiter(d.id, d.equipeId, 'REFUSEE', this.motifText || undefined).subscribe({
      next: () => {
        this.toast(`Demande de ${d.enseignant.prenom} ${d.enseignant.nom} refusée`, 'succes');
        this.motifDialogOpen = false;
        this.pendingRefuse = null;
        this.charger();
      },
      error: () => this.toast('Erreur lors du refus'),
    });
  }

  annulerRefus() {
    this.motifDialogOpen = false;
    this.pendingRefuse = null;
  }

  formatDate(date: string): string {
    if (!date) return '';
    const d = new Date(date);
    return d.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' });
  }

  private refreshEquipeOptions(): void {
    const map = new Map<number, string>();
    for (const d of this.demandes()) {
      if (!map.has(d.equipeId)) {
        map.set(d.equipeId, d.equipeNom);
      }
    }
    this.equipeOptions = [
      { value: '', label: 'Toutes les équipes' },
      ...Array.from(map.entries())
        .sort((a, b) => a[1].localeCompare(b[1], 'fr'))
        .map(([id, nom]) => ({ value: String(id), label: nom })),
    ];

    if (
      this.selectedEquipeId &&
      !this.equipeOptions.some((o) => o.value === this.selectedEquipeId)
    ) {
      this.selectedEquipeId = '';
    }
  }

  private toast(msg: string, type: 'succes' | 'erreur' = 'erreur') {
    this.snack.open(msg, '✕', {
      duration: 3500,
      panelClass: type === 'succes' ? ['snack-success'] : ['snack-error'],
    });
  }
}
