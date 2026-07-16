import { Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';

interface UniversCard {
  badge: string;
  title: string;
  description: string;
  image: string;
  link: string;
}

@Component({
  selector: 'app-accueil',
  standalone: true,
  imports: [RouterLink],
  templateUrl: './accueil.html',
  styleUrl: './accueil.css',
})
export class Accueil {
  private readonly auth = inject(AuthService);

  readonly partners = [
    'ESPRIT',
    'RDI Lab',
    'TIM',
    'Génie Civil',
    'IIA',
    'Data Science',
  ];

  readonly pourquoiFeatures = [
    {
      title: 'Dépôt & validation en 3 clics',
      description: 'Sujets guidés, validation chef d’équipe et catalogue synchronisé.',
      icon: 'flash' as const,
    },
    {
      title: 'Matching intelligent',
      description: 'Étudiants et sujets rapprochés par compétences et capacité d’accueil.',
      icon: 'target' as const,
    },
    {
      title: 'Catalogue public unifié',
      description: 'Projets terminés, scores et livrables visibles pour toute la communauté.',
      icon: 'globe' as const,
    },
    {
      title: 'Capitalisation continue',
      description: 'Chaque réalisation enrichit le patrimoine RDI et l’industrialisation.',
      icon: 'cycle' as const,
    },
  ];

  get showUnivers(): boolean {
    return this.auth.getRole() !== 'ROLE_ETUDIANT';
  }

  get exploreLink(): string {
    const role = this.auth.getRole();
    if (role === 'ROLE_ENSEIGNANT' || role === 'ROLE_CHEF_EQUIPE' || role === 'ROLE_CI') {
      return '/frontoffice/catalogue';
    }
    return '/frontoffice/sujets/disponibles';
  }

  get universCards(): UniversCard[] {
    const role = this.auth.getRole();
    const equipesLink =
      role === 'ROLE_CHEF_EQUIPE'
        ? '/frontoffice/equipes-recherche/mon-equipe'
        : '/frontoffice/equipes-recherche/equipes';

    const sujetsLink =
      role === 'ROLE_CI'
        ? '/frontoffice/sujets/disponibles'
        : this.auth.isAffilieToEquipe()
          ? '/frontoffice/sujets/mes-sujets'
          : '/frontoffice/sujets/disponibles';

    const induLink =
      role === 'ROLE_CI'
        ? '/ci/industrialisation'
        : '/frontoffice/demandes-industrialisation';

    return [
      {
        badge: 'Équipes',
        title: 'Équipe de recherche',
        description: 'Structurez, animez et collaborez au sein des équipes RDI.',
        image: '/assets/images/univers-equipe.png',
        link: equipesLink,
      },
      {
        badge: 'Sujets',
        title: 'Sujets et projets',
        description: 'De l’idée au livrable : dépôt, candidatures et réalisation.',
        image: '/assets/images/univers-industrialisation.png',
        link: sujetsLink,
      },
      {
        badge: 'Indus.',
        title: 'Industrialisation',
        description: 'Du prototype au produit livré, à grande échelle.',
        image: '/assets/images/univers-sujets.png',
        link: induLink,
      },
    ];
  }

  scrollDown(): void {
    this.scrollTo(this.showUnivers ? 'univers' : 'pourquoi');
  }

  scrollTo(id: string): void {
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }
}
