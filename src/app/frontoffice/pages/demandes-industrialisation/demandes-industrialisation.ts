import { CommonModule } from '@angular/common';
import { Component, OnInit, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { CandidatureIndustrialisation, STATUT_INDUSTRIALISATION_LABELS, TYPE_INDUSTRIALISATION_LABELS } from '../../../core/models/industrialisation.model';
import { AuthService } from '../../../core/services/auth.service';
import { IndustrialisationService } from '../../../core/services/industrialisation.service';

@Component({
  selector: 'app-demandes-industrialisation',
  imports: [CommonModule, RouterLink],
  templateUrl: './demandes-industrialisation.html',
  styleUrl: './demandes-industrialisation.css',
})
export class DemandesIndustrialisation implements OnInit {
  private readonly service = inject(IndustrialisationService);
  private readonly authService = inject(AuthService);

  demandes = signal<CandidatureIndustrialisation[]>([]);
  loading = signal(false);
  error = signal('');
  readonly statutLabels = STATUT_INDUSTRIALISATION_LABELS;
  readonly typeLabels = TYPE_INDUSTRIALISATION_LABELS;

  ngOnInit(): void {
    if (this.isCi) {
      return;
    }
    this.loading.set(true);
    this.service.mesDemandes().subscribe({
      next: (demandes) => {
        this.demandes.set(demandes);
        this.loading.set(false);
      },
      error: () => {
        this.error.set('Impossible de charger vos demandes.');
        this.loading.set(false);
      },
    });
  }

  get isCi(): boolean {
    return this.authService.getRole() === 'ROLE_CI';
  }
}
