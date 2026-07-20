import { Component, EventEmitter, Input, Output } from '@angular/core';
import { RouterLink } from '@angular/router';
import { CategorieSujet, SujetProjet } from '../../../../core/models/sujet-projet.model';
import { MES_SUJETS_STATUT_STYLES, STATUT_LABELS } from '../../../constants/sujet-projet.constants';

@Component({
  selector: 'app-sujet-disponible-card',
  imports: [RouterLink],
  templateUrl: './sujet-disponible-card.html',
  styleUrl: './sujet-disponible-card.css',
})
export class SujetDisponibleCard {
  @Input({ required: true }) sujet!: SujetProjet;
  @Input() showPostuler = false;
  @Input() dejaPostule = false;
  @Input() isAccepted = false;
  @Input() estAccepte = false;
  @Output() postuler = new EventEmitter<void>();

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

  get statusTagClass(): string {
    if (this.isComplet) return 'dispo-card__status-tag--full';
    return MES_SUJETS_STATUT_STYLES[this.sujet.statut]?.cardTagClass ?? 'dispo-card__status-tag--muted';
  }

  get statusDotClass(): string {
    if (this.isComplet) return 'dispo-card__status-dot--full';
    return MES_SUJETS_STATUT_STYLES[this.sujet.statut]?.cardDotClass ?? 'dispo-card__status-dot--muted';
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

  get candidaturesLabel(): string {
    const restantes = Math.max(0, this.sujet.capaciteAccueil - this.placesTaken);
    if (this.isComplet) return 'Complet';
    if (restantes === 1) return '1 place restante';
    return `${restantes} places restantes`;
  }

  get statutBadge() {
    return STATUT_LABELS[this.sujet.statut] ?? { label: this.sujet.statut, cssClass: 'badge--neutral' };
  }

  get statusLabel(): string {
    if (this.isComplet) return 'Complet';
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
    return this.sujet.nombreMembresActifs ?? 0;
  }

  get isComplet(): boolean {
    return this.placesTaken >= this.sujet.capaciteAccueil;
  }

  get isOpen(): boolean {
    return this.sujet.statut === 'CANDIDATURE_OUVERTE';
  }

  get canPostuler(): boolean {
    return this.sujet.statut === 'CANDIDATURE_OUVERTE' && !this.isComplet;
  }

  get visibleTechs(): string[] {
    return this.sujet.technologies.slice(0, 3);
  }

  get extraTechCount(): number {
    return Math.max(0, this.sujet.technologies.length - 3);
  }

  onPostulerClick(): void {
    this.postuler.emit();
  }
}
