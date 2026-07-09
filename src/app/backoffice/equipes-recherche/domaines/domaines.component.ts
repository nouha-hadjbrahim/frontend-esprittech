import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Subject, debounceTime, distinctUntilChanged, takeUntil } from 'rxjs';
import { MatSnackBar } from '@angular/material/snack-bar';

import { EquipeDomaineService } from '../../../core/services/equipe-domaine.service';
import { EquipeDomaine } from '../../../core/models/equipe-domaine.model';
import { ConfirmDialog } from '../../../shared/components/confirm-dialog/confirm-dialog';

@Component({
  selector: 'app-domaines',
  standalone: true,
  imports: [CommonModule, FormsModule, ConfirmDialog],
  templateUrl: './domaines.component.html',
  styleUrls: ['./domaines.component.css'],
})
export class DomainesComponent implements OnInit {
  private readonly domaineSvc = inject(EquipeDomaineService);
  private readonly snack = inject(MatSnackBar);
  private readonly destroy$   = new Subject<void>();

  domainItems: EquipeDomaine[] = [];
  domainsLoading = false;
  domainsLoadError = '';
  domainsPage = 0;
  domainsSize = 12;
  domainsTotalPages = 0;
  domainsTotalElements = 0;
  domainsFirst = true;
  domainsLast = true;
  domainsSearchTerm = '';
  readonly domainsSearch$ = new Subject<string>();
  domainsCount = 0;

  isDomainModalOpen = false;
  editingDomaine: EquipeDomaine | null = null;
  domainModalNom = '';
  domainSaving = false;
  domainModalError = '';

  deleteDomaineConfirmOpen = false;
  deleteDomaineAlertOpen = false;
  deleteDomaineAlertMessage = '';
  domainDeleting = false;
  domaineToDelete: EquipeDomaine | null = null;

  ngOnInit() {
    this.domainsSearch$
      .pipe(debounceTime(300), distinctUntilChanged(), takeUntil(this.destroy$))
      .subscribe((term) => {
        this.domainsSearchTerm = term;
        this.domainsPage = 0;
        this.loadDomaines();
      });
    this.loadDomainesCount();
    this.loadDomaines();
  }

  onDomainSearchInput(value: string): void {
    this.domainsSearch$.next(value);
  }

  openCreateDomaineModal(): void {
    this.editingDomaine = null;
    this.domainModalNom = '';
    this.domainModalError = '';
    this.isDomainModalOpen = true;
  }

  openEditDomaineModal(item: EquipeDomaine): void {
    this.editingDomaine = item;
    this.domainModalNom = item.nom;
    this.domainModalError = '';
    this.isDomainModalOpen = true;
  }

  closeDomainModal(): void {
    this.isDomainModalOpen = false;
    this.editingDomaine = null;
    this.domainModalNom = '';
    this.domainModalError = '';
  }

  saveDomaine(): void {
    const nom = this.domainModalNom.trim();
    if (!nom) {
      this.domainModalError = 'Le nom est obligatoire.';
      return;
    }

    this.domainSaving = true;
    this.domainModalError = '';

    const operation = this.editingDomaine
      ? this.domaineSvc.update(this.editingDomaine.id, nom)
      : this.domaineSvc.create(nom);

    operation.subscribe({
      next: () => {
        this.domainSaving = false;
        this.closeDomainModal();
        this.loadDomainesCount();
        this.loadDomaines();
        this.toast(this.editingDomaine ? 'Domaine mis à jour' : 'Domaine créé', 'succes');
      },
      error: (err) => {
        this.domainSaving = false;
        this.domainModalError = err?.error?.detail ?? err?.error?.message ?? 'Erreur lors de l\'enregistrement.';
        this.toast('Erreur lors de l\'enregistrement du domaine');
      },
    });
  }

  deleteDomaine(item: EquipeDomaine): void {
    this.domaineToDelete = item;
    this.deleteDomaineConfirmOpen = true;
  }

  cancelDeleteDomaine(): void {
    this.deleteDomaineConfirmOpen = false;
    this.domaineToDelete = null;
    this.domainDeleting = false;
  }

  confirmDeleteDomaine(): void {
    if (!this.domaineToDelete) return;

    this.domainDeleting = true;
    this.domaineSvc.delete(this.domaineToDelete.id).subscribe({
      next: () => {
        this.domainDeleting = false;
        this.deleteDomaineConfirmOpen = false;
        this.domaineToDelete = null;
        this.loadDomainesCount();
        if (this.domainItems.length === 1 && this.domainsPage > 0) {
          this.domainsPage--;
        }
        this.loadDomaines();
        this.toast('Domaine supprimé', 'succes');
      },
      error: () => {
        this.domainDeleting = false;
        this.deleteDomaineConfirmOpen = false;
        this.deleteDomaineAlertMessage = 'Impossible de supprimer ce domaine.';
        this.deleteDomaineAlertOpen = true;
        this.domaineToDelete = null;
        this.toast('Erreur lors de la suppression du domaine');
      },
    });
  }

  closeDeleteDomaineAlert(): void {
    this.deleteDomaineAlertOpen = false;
    this.deleteDomaineAlertMessage = '';
  }

  get deleteDomaineConfirmMessage(): string {
    return this.domaineToDelete
      ? `Voulez-vous vraiment supprimer « ${this.domaineToDelete.nom} » ? Cette action est irréversible.`
      : '';
  }

  goToDomainPage(newPage: number): void {
    if (newPage < 0 || newPage >= this.domainsTotalPages) return;
    this.domainsPage = newPage;
    this.loadDomaines();
  }

  getInitial(nom: string): string {
    return nom.charAt(0).toUpperCase();
  }

  private loadDomainesCount(): void {
    this.domaineSvc.getCount().subscribe({
      next: (count) => { this.domainsCount = count; },
      error: () => {},
    });
  }

  private loadDomaines(): void {
    this.domainsLoading = true;
    this.domainsLoadError = '';
    this.domaineSvc.getPage(this.domainsPage, this.domainsSize, this.domainsSearchTerm).subscribe({
      next: (res) => {
        this.domainItems = res.content;
        this.domainsPage = res.page;
        this.domainsTotalPages = res.totalPages;
        this.domainsTotalElements = res.totalElements;
        this.domainsFirst = res.first;
        this.domainsLast = res.last;
        this.domainsLoading = false;
      },
      error: () => {
        this.domainsLoading = false;
        this.domainsLoadError = 'Impossible de charger les données. Vérifiez que le backend est démarré.';
        this.toast('Erreur lors du chargement des domaines');
      },
    });
  }

  private toast(msg: string, type: 'succes' | 'erreur' = 'erreur') {
    this.snack.open(msg, '✕', {
      duration: 3500,
      panelClass: type === 'succes' ? ['snack-success'] : ['snack-error'],
    });
  }
}
