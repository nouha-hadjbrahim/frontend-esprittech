import { DatePipe } from '@angular/common';
import { Component, EventEmitter, Input, Output } from '@angular/core';
import { RouterLink } from '@angular/router';
import { SujetProjet } from '../../../../core/models/sujet-projet.model';
import { CATEGORIE_LABELS, STATUT_LABELS } from '../../../constants/sujet-projet.constants';

@Component({
  selector: 'app-sujet-card',
  imports: [DatePipe, RouterLink],
  templateUrl: './sujet-card.html',
  styleUrl: './sujet-card.css',
})
export class SujetCard {
  @Input({ required: true }) sujet!: SujetProjet;
  @Input() showActions = true;
  @Input() detailsOnly = false;
  @Input() isOwner = false;
  @Input() dejaPostule = false;
  @Output() edit = new EventEmitter<void>();
  @Output() delete = new EventEmitter<void>();
  @Output() gererCandidatures = new EventEmitter<void>();
  @Output() postuler = new EventEmitter<void>();

  get domainesLabel(): string {
    return this.sujet.domaines?.length ? this.sujet.domaines.join(', ') : '—';
  }

  get categorieBadge() {
    return CATEGORIE_LABELS[this.sujet.categorie] ?? { label: this.sujet.categorie, cssClass: 'badge--pfe' };
  }

  get statutBadge() {
    return STATUT_LABELS[this.sujet.statut] ?? { label: this.sujet.statut, cssClass: 'badge--neutral' };
  }

  onEditClick(event: Event): void {
    event.stopPropagation();
    event.preventDefault();
    this.edit.emit();
  }

  get showCandidaturesAction(): boolean {
    const statutsConcernes = [
      'VALIDE',
      'CANDIDATURE_OUVERTE',
      'CANDIDATURE_FERMEE',
      'REALISATION_EN_COURS',
      'REALISATION_TERMINEE',
    ];
    return statutsConcernes.includes(this.sujet.statut);
  }

  onDeleteClick(event: Event): void {
    event.stopPropagation();
    event.preventDefault();
    this.delete.emit();
  }

  onGererCandidaturesClick(): void {
    this.gererCandidatures.emit();
  }

  onPostulerClick(): void {
    this.postuler.emit();
  }
}
