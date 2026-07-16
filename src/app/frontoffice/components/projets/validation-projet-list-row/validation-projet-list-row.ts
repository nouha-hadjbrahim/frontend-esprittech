import { Component, EventEmitter, Input, Output } from '@angular/core';
import { RouterLink } from '@angular/router';
import { ProjetCard } from '../../../../core/models/projet-catalogue.model';
import { STATUT_PROJET_LABELS } from '../../../constants/projet-catalogue.constants';

@Component({
  selector: 'app-validation-projet-list-row',
  imports: [RouterLink],
  templateUrl: './validation-projet-list-row.html',
  styleUrl: './validation-projet-list-row.css',
})
export class ValidationProjetListRow {
  @Input({ required: true }) projet!: ProjetCard;
  @Input() validating = false;
  @Input() rejecting = false;
  @Output() validate = new EventEmitter<void>();
  @Output() reject = new EventEmitter<void>();

  get primaryDomaine(): string {
    return this.projet.domaines[0] ?? '—';
  }

  get typeShortLabel(): string {
    const map: Record<string, string> = {
      PFE: 'PFE',
      RDI: 'RDI',
      STAGE_INGENIEUR: 'STAGE',
    };
    return map[this.projet.typeProjet] ?? 'PFE';
  }

  get statutBadge() {
    if (this.projet.statut === 'SOUMIS_EN_VALIDATION') {
      return { label: 'En attente', listClass: 'badge--statut-soumis', dotClass: 'dot--soumis' };
    }
    const info = STATUT_PROJET_LABELS[this.projet.statut];
    return {
      label: info?.label ?? 'En attente',
      listClass: 'badge--statut-attente',
      dotClass: 'dot--attente',
    };
  }

  get accentClass(): string {
    const map: Record<string, string> = {
      PFE: 'accent--pfe',
      STAGE_INGENIEUR: 'accent--stage',
      RDI: 'accent--rdi',
    };
    return map[this.projet.typeProjet] ?? 'accent--pfe';
  }

  get shortDescription(): string {
    const text = this.projet.description?.trim() ?? '';
    if (!text) return '—';
    return text.length > 110 ? `${text.slice(0, 107)}...` : text;
  }

  get formattedDate(): string {
    if (!this.projet.dateCreation) return '—';
    return new Date(this.projet.dateCreation).toLocaleDateString('fr-FR', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    });
  }

  get initials(): string {
    const name = this.projet.encadrantNom || '';
    const parts = name.trim().split(/\s+/).filter(Boolean);
    if (parts.length === 0) return '?';
    if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  }

  get timeAgo(): string {
    if (!this.projet.dateCreation) return '—';
    const date = new Date(this.projet.dateCreation);
    const days = Math.floor((Date.now() - date.getTime()) / (1000 * 60 * 60 * 24));
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
