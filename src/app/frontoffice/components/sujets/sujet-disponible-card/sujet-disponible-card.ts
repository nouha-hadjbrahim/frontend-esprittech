import { DatePipe } from '@angular/common';
import { Component, Input } from '@angular/core';
import { RouterLink } from '@angular/router';
import { CategorieSujet, SujetProjet } from '../../../../core/models/sujet-projet.model';
import { CATEGORIE_LABELS, STATUT_LABELS } from '../../../constants/sujet-projet.constants';

@Component({
  selector: 'app-sujet-disponible-card',
  imports: [DatePipe, RouterLink],
  templateUrl: './sujet-disponible-card.html',
  styleUrl: './sujet-disponible-card.css',
})
export class SujetDisponibleCard {
  @Input({ required: true }) sujet!: SujetProjet;
  @Input() showPostuler = false;

  get categorieBadge() {
    return CATEGORIE_LABELS[this.sujet.categorie] ?? { label: this.sujet.categorie, cssClass: 'badge--pfe' };
  }

  get categorieClass(): string {
    const map: Record<CategorieSujet, string> = {
      PFE: 'dispo-card__categorie--pfe',
      RDI: 'dispo-card__categorie--rdi',
      STAGE_INGENIEUR: 'dispo-card__categorie--stage',
    };
    return map[this.sujet.categorie] ?? 'dispo-card__categorie--pfe';
  }

  get avatarClass(): string {
    const map: Record<CategorieSujet, string> = {
      PFE: 'dispo-card__avatar--pfe',
      RDI: 'dispo-card__avatar--rdi',
      STAGE_INGENIEUR: 'dispo-card__avatar--stage',
    };
    return map[this.sujet.categorie] ?? 'dispo-card__avatar--pfe';
  }

  get statutBadge() {
    return STATUT_LABELS[this.sujet.statut] ?? { label: this.sujet.statut, cssClass: 'badge--neutral' };
  }

  get statusLabel(): string {
    if (this.isComplet) return 'Complet';
    if (this.isOpen) return 'Ouvert';
    return this.statutBadge.label;
  }

  get primaryDomaine(): string {
    return this.sujet.domaines[0] ?? '—';
  }

  get shortDescription(): string {
    const text = this.sujet.description?.trim() ?? '';
    if (!text) return '—';
    return text.length > 130 ? `${text.slice(0, 127)}...` : text;
  }

  get initials(): string {
    const name = this.sujet.encadrantNom || '';
    const parts = name.trim().split(/\s+/).filter(Boolean);
    if (parts.length === 0) return '?';
    if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  }

  get placesTaken(): number {
    return 0;
  }

  get placesMeta(): string {
    return `${this.placesTaken}/${this.sujet.capaciteAccueil} places`;
  }

  get isComplet(): boolean {
    return this.sujet.statut === 'CANDIDATURE_FERMEE' || this.placesTaken >= this.sujet.capaciteAccueil;
  }

  get isOpen(): boolean {
    return this.sujet.statut === 'CANDIDATURE_OUVERTE' || this.sujet.statut === 'VALIDE';
  }

  get visibleTechs(): string[] {
    return this.sujet.technologies.slice(0, 3);
  }

  get extraTechCount(): number {
    return Math.max(0, this.sujet.technologies.length - 3);
  }
}
