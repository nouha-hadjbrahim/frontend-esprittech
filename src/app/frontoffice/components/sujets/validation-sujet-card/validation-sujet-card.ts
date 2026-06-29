import { DatePipe } from '@angular/common';
import { Component, EventEmitter, Input, Output } from '@angular/core';
import { RouterLink } from '@angular/router';
import { SujetProjet } from '../../../../core/models/sujet-projet.model';
import { CATEGORIE_LABELS, STATUT_LABELS } from '../../../constants/sujet-projet.constants';

@Component({
  selector: 'app-validation-sujet-card',
  imports: [DatePipe, RouterLink],
  templateUrl: './validation-sujet-card.html',
  styleUrl: './validation-sujet-card.css',
})
export class ValidationSujetCard {
  @Input({ required: true }) sujet!: SujetProjet;
  @Input() validating = false;
  @Input() rejecting = false;
  @Output() validate = new EventEmitter<void>();
  @Output() reject = new EventEmitter<void>();

  get initials(): string {
    const parts = (this.sujet.encadrantNom || '').trim().split(/\s+/).filter(Boolean);
    if (parts.length === 0) return '?';
    if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  }

  get categorieBadge() {
    return CATEGORIE_LABELS[this.sujet.categorie] ?? { label: this.sujet.categorie, cssClass: 'tag--type' };
  }

  get statutBadge() {
    if (this.sujet.statut === 'SOUMIS_EN_VALIDATION' || this.sujet.statut === 'EN_ATTENTE') {
      return { label: 'En attente', cssClass: 'badge--progress' };
    }
    return STATUT_LABELS[this.sujet.statut] ?? { label: 'En attente', cssClass: 'badge--progress' };
  }

  get primaryDomaine(): string | null {
    return this.sujet.domaines[0] ?? null;
  }

  get shortDescription(): string {
    const text = this.sujet.description?.trim() ?? '';
    return text.length > 120 ? `${text.slice(0, 117)}...` : text;
  }

  onValidate(): void {
    if (!this.validating && !this.rejecting) {
      this.validate.emit();
    }
  }

  onReject(): void {
    if (!this.validating && !this.rejecting) {
      this.reject.emit();
    }
  }
}
