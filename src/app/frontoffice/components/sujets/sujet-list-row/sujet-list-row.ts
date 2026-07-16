import { Component, EventEmitter, Input, Output } from '@angular/core';
import { RouterLink } from '@angular/router';
import { SujetProjet } from '../../../../core/models/sujet-projet.model';
import { CATEGORIE_LABELS, MES_SUJETS_STATUT_STYLES, STATUT_LABELS } from '../../../constants/sujet-projet.constants';

@Component({
  selector: 'app-sujet-list-row',
  imports: [RouterLink],
  templateUrl: './sujet-list-row.html',
  styleUrl: './sujet-list-row.css',
})
export class SujetListRow {
  @Input({ required: true }) sujet!: SujetProjet;
  @Input() isOwner = false;
  @Output() edit = new EventEmitter<void>();
  @Output() delete = new EventEmitter<void>();
  @Output() gererCandidatures = new EventEmitter<void>();

  get primaryDomaine(): string {
    return this.sujet.domaines[0] ?? '—';
  }

  get categorieBadge() {
    return CATEGORIE_LABELS[this.sujet.categorie] ?? { label: this.sujet.categorie, cssClass: 'badge--pfe' };
  }

  get categorieShortLabel(): string {
    const map: Record<string, string> = {
      PFE: 'PFE',
      RDI: 'RDI',
      STAGE_INGENIEUR: 'STAGE',
    };
    return map[this.sujet.categorie] ?? 'PFE';
  }

  get statutBadge() {
    return STATUT_LABELS[this.sujet.statut] ?? { label: this.sujet.statut, cssClass: 'badge--neutral' };
  }

  get statutListClass(): string {
    return MES_SUJETS_STATUT_STYLES[this.sujet.statut]?.listClass ?? 'badge--neutral';
  }

  get statusDotClass(): string {
    const map: Record<string, string> = {
      SOUMIS_EN_VALIDATION: 'dot--soumis',
      EN_ATTENTE: 'dot--attente',
      INVALIDE: 'dot--invalide',
      VALIDE: 'dot--valide',
      CANDIDATURE_OUVERTE: 'dot--cand-ouverte',
      CANDIDATURE_FERMEE: 'dot--cand-fermee',
      REALISATION_EN_COURS: 'dot--realisation',
      REALISATION_TERMINEE: 'dot--terminee',
      CANDIDAT_INDUSTRIALISATION_INTERNE: 'dot--indust-interne',
      CANDIDAT_INDUSTRIALISATION_EXTERNE: 'dot--indust-externe',
      INDUSTRIALISE_DSI: 'dot--indus-dsi',
      INDUSTRIALISE_EXTERNE: 'dot--indus-externe',
    };
    return map[this.sujet.statut] ?? '';
  }

  get accentClass(): string {
    const map: Record<string, string> = {
      PFE: 'accent--pfe',
      STAGE_INGENIEUR: 'accent--stage',
      RDI: 'accent--rdi',
    };
    return map[this.sujet.categorie] ?? 'accent--pfe';
  }

  get shortDescription(): string {
    const text = this.sujet.description?.trim() ?? '';
    if (!text) return '—';
    return text.length > 110 ? `${text.slice(0, 107)}...` : text;
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

  get placesLabel(): string {
    const taken = this.sujet.nombreMembresActifs ?? 0;
    const restantes = Math.max(0, this.sujet.capaciteAccueil - taken);
    if (restantes === 0) return 'Complet';
    if (restantes === 1) return '1 place restante';
    return `${restantes} places restantes`;
  }

  get initials(): string {
    const name = this.sujet.encadrantNom || '';
    const parts = name.trim().split(/\s+/).filter(Boolean);
    if (parts.length === 0) return '?';
    if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  }

  get showCandidaturesAction(): boolean {
    return this.sujet.statut === 'VALIDE' || this.sujet.statut === 'CANDIDATURE_OUVERTE';
  }

  onEdit(event: Event): void {
    event.stopPropagation();
    event.preventDefault();
    this.edit.emit();
  }

  onDelete(event: Event): void {
    event.stopPropagation();
    event.preventDefault();
    this.delete.emit();
  }

  onGererCandidatures(event: Event): void {
    event.stopPropagation();
    event.preventDefault();
    this.gererCandidatures.emit();
  }
}
