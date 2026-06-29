import { DatePipe } from '@angular/common';
import { Component, EventEmitter, Input, Output } from '@angular/core';
import { RouterLink } from '@angular/router';
import { SujetProjet } from '../../../../core/models/sujet-projet.model';
import { CATEGORIE_LABELS, STATUT_LABELS } from '../../../constants/sujet-projet.constants';

@Component({
  selector: 'app-validation-sujet-list-row',
  imports: [DatePipe, RouterLink],
  templateUrl: './validation-sujet-list-row.html',
  styleUrl: './validation-sujet-list-row.css',
})
export class ValidationSujetListRow {
  @Input({ required: true }) sujet!: SujetProjet;
  @Input() validating = false;
  @Input() rejecting = false;
  @Output() validate = new EventEmitter<void>();
  @Output() reject = new EventEmitter<void>();

  get primaryDomaine(): string {
    return this.sujet.domaines[0] ?? '—';
  }

  get categorieBadge() {
    return CATEGORIE_LABELS[this.sujet.categorie] ?? { label: this.sujet.categorie, cssClass: 'badge--pfe' };
  }

  get statutBadge() {
    if (this.sujet.statut === 'SOUMIS_EN_VALIDATION' || this.sujet.statut === 'EN_ATTENTE') {
      return { label: 'En attente', cssClass: 'badge--progress' };
    }
    return STATUT_LABELS[this.sujet.statut] ?? { label: 'En attente', cssClass: 'badge--progress' };
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

  get initials(): string {
    const name = this.sujet.encadrantNom || '';
    const parts = name.trim().split(/\s+/).filter(Boolean);
    if (parts.length === 0) return '?';
    if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  }

  get timeAgo(): string {
    const dateStr = this.sujet.dateSoumission || this.sujet.dateCreation;
    if (!dateStr) return '—';
    const date = new Date(dateStr);
    const diffMs = Date.now() - date.getTime();
    const days = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    if (days <= 0) return "Aujourd'hui";
    if (days === 1) return 'Il y a 1 jour';
    if (days < 7) return `Il y a ${days} jours`;
    const weeks = Math.floor(days / 7);
    if (weeks === 1) return 'Il y a 1 semaine';
    if (weeks < 5) return `Il y a ${weeks} semaines`;
    const months = Math.floor(days / 30);
    return months <= 1 ? 'Il y a 1 mois' : `Il y a ${months} mois`;
  }

  onValidate(event: Event): void {
    event.stopPropagation();
    event.preventDefault();
    if (!this.validating && !this.rejecting) {
      this.validate.emit();
    }
  }

  onReject(event: Event): void {
    event.stopPropagation();
    event.preventDefault();
    if (!this.validating && !this.rejecting) {
      this.reject.emit();
    }
  }
}
