import { DatePipe } from '@angular/common';
import { Component, Input } from '@angular/core';
import { RouterLink } from '@angular/router';
import { SujetProjet } from '../../../../core/models/sujet-projet.model';
import { CATEGORIE_LABELS, STATUT_LABELS } from '../../../constants/sujet-projet.constants';

@Component({
  selector: 'app-sujet-catalog-card',
  imports: [DatePipe, RouterLink],
  templateUrl: './sujet-catalog-card.html',
  styleUrl: './sujet-catalog-card.css',
})
export class SujetCatalogCard {
  @Input({ required: true }) sujet!: SujetProjet;

  get categorieBadge() {
    return CATEGORIE_LABELS[this.sujet.categorie] ?? { label: this.sujet.categorie, cssClass: 'badge--pfe' };
  }

  get statutBadge() {
    return STATUT_LABELS[this.sujet.statut] ?? { label: this.sujet.statut, cssClass: 'badge--neutral' };
  }

  get subtitle(): string {
    const parts = [this.sujet.encadrantNom, this.sujet.equipeNom].filter(Boolean);
    return parts.join(' · ');
  }

  get tags(): string[] {
    const domaines = this.sujet.domaines.slice(0, 2);
    const techs = this.sujet.technologies.slice(0, 2);
    return [...domaines, ...techs];
  }
}
