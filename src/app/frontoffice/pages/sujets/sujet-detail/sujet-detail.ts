import { DatePipe } from '@angular/common';
import { Component, OnInit, inject } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { SujetProjet } from '../../../../core/models/sujet-projet.model';
import { AuthService } from '../../../../core/services/auth.service';
import { SujetProjetService } from '../../../../core/services/sujet-projet.service';
import { CATEGORIE_LABELS, STATUT_LABELS } from '../../../constants/sujet-projet.constants';

@Component({
  selector: 'app-sujet-detail',
  imports: [RouterLink, DatePipe],
  templateUrl: './sujet-detail.html',
  styleUrl: './sujet-detail.css',
})
export class SujetDetail implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly sujetProjetService = inject(SujetProjetService);
  private readonly authService = inject(AuthService);

  sujet: SujetProjet | null = null;
  isLoading = true;
  error = false;

  readonly tabs = [
    { label: 'Informations', icon: 'info', active: true },
    { label: 'Candidatures', icon: 'candidatures', active: false },
    { label: 'Livrables', icon: 'livrables', active: false },
    { label: 'Progression', icon: 'progression', active: false },
    { label: 'Historique', icon: 'historique', active: false },
    { label: 'Commentaires', icon: 'commentaires', active: false },
  ];

  private readonly techColorClasses = [
    'tag--green',
    'tag--purple',
    'tag--yellow',
    'tag--teal',
    'tag--green',
    'tag--purple',
    'tag--yellow',
    'tag--teal',
  ];

  ngOnInit(): void {
    const id = Number(this.route.snapshot.paramMap.get('id'));
    this.sujetProjetService.getSujetById(id).subscribe({
      next: (sujet) => {
        this.sujet = sujet;
        this.isLoading = false;
      },
      error: () => {
        this.error = true;
        this.isLoading = false;
      },
    });
  }

  get backLink(): string {
    return this.authService.getRole() === 'ROLE_ENSEIGNANT'
      ? '/frontoffice/sujets/mes-sujets'
      : '/frontoffice/sujets/disponibles';
  }

  get backLabel(): string {
    return this.authService.getRole() === 'ROLE_ENSEIGNANT'
      ? 'Retour à mes sujets'
      : 'Retour aux sujets disponibles';
  }

  get categorieLabel(): string {
    if (!this.sujet) return '';
    return CATEGORIE_LABELS[this.sujet.categorie]?.label ?? this.sujet.categorie;
  }

  get statutLabel(): string {
    if (!this.sujet) return '';
    return STATUT_LABELS[this.sujet.statut]?.label ?? this.sujet.statut;
  }

  get statutClass(): string {
    if (!this.sujet) return 'badge--neutral';
    return STATUT_LABELS[this.sujet.statut]?.cssClass ?? 'badge--neutral';
  }

  get techColors(): string[] {
    return this.sujet?.technologies.map((_, i) => this.techColorClasses[i % this.techColorClasses.length]) ?? [];
  }

  get objectifLines(): string[] {
    if (!this.sujet) return [];
    const lines = this.sujet.objectifs.split('\n').map((l) => l.trim()).filter(Boolean);
    return lines.length > 0 ? lines : [this.sujet.objectifs];
  }

  get keywordTags(): string[] {
    return this.sujet?.technologies.slice(0, 4) ?? [];
  }
}
