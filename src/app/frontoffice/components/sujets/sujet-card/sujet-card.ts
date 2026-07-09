import { Component, EventEmitter, Input, Output } from '@angular/core';
import { RouterLink } from '@angular/router';
import { CategorieSujet, SujetProjet } from '../../../../core/models/sujet-projet.model';
import { STATUT_LABELS, MES_SUJETS_STATUT_STYLES } from '../../../constants/sujet-projet.constants';

@Component({
  selector: 'app-sujet-card',
  imports: [RouterLink],
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

  get categorieShortLabel(): string {
    const map: Record<CategorieSujet, string> = {
      PFE: 'PFE',
      RDI: 'RDI',
      STAGE_INGENIEUR: 'STAGE',
    };
    return map[this.sujet.categorie] ?? 'PFE';
  }

  get equipeLabel(): string {
    return this.sujet.equipeNom?.trim() || 'Équipe recherche';
  }

  get statutBadge() {
    return STATUT_LABELS[this.sujet.statut] ?? { label: this.sujet.statut, cssClass: 'badge--neutral' };
  }

  get statusLabel(): string {
    return this.statutBadge.label;
  }

  get statusTagClass(): string {
    return MES_SUJETS_STATUT_STYLES[this.sujet.statut]?.cardTagClass ?? 'dispo-card__status-tag--muted';
  }

  get statusDotClass(): string {
    return MES_SUJETS_STATUT_STYLES[this.sujet.statut]?.cardDotClass ?? 'dispo-card__status-dot--muted';
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

  get avatarClass(): string {
    const map: Record<CategorieSujet, string> = {
      PFE: 'dispo-card__avatar--pfe',
      RDI: 'dispo-card__avatar--rdi',
      STAGE_INGENIEUR: 'dispo-card__avatar--stage',
    };
    return map[this.sujet.categorie] ?? 'dispo-card__avatar--pfe';
  }

  get placesTaken(): number {
    return this.sujet.nombreMembresActifs ?? 0;
  }

  get capacityPercent(): number {
    if (!this.sujet.capaciteAccueil) return 0;
    return Math.min(100, Math.round((this.placesTaken / this.sujet.capaciteAccueil) * 100));
  }

  get formattedDate(): string {
    const dateStr = this.sujet.dateSoumission || this.sujet.dateCreation;
    if (!dateStr) return '—';
    return new Date(dateStr).toLocaleDateString('fr-FR', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });
  }

  get metaSecondaryLabel(): string {
    const restantes = Math.max(0, this.sujet.capaciteAccueil - this.placesTaken);
    if (restantes === 0) return 'Complet';
    if (restantes === 1) return '1 place restante';
    return `${restantes} places restantes`;
  }

  get visibleTechs(): string[] {
    return this.sujet.technologies.slice(0, 3);
  }

  get extraTechCount(): number {
    return Math.max(0, this.sujet.technologies.length - 3);
  }

  get footerSingleColumn(): boolean {
    if (this.detailsOnly) return false;
    return !(this.isOwner && this.showCandidaturesAction);
  }

  get showCandidaturesAction(): boolean {
    return this.sujet.statut === 'VALIDE' || this.sujet.statut === 'CANDIDATURE_OUVERTE';
  }

  onEditClick(event: Event): void {
    event.stopPropagation();
    event.preventDefault();
    this.edit.emit();
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
