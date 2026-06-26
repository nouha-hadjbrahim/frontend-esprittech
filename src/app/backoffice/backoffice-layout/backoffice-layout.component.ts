import { CommonModule } from '@angular/common';
import { Component, computed, inject } from '@angular/core';
import { NavigationEnd, Router, RouterModule } from '@angular/router';
import { filter } from 'rxjs';
import { Role } from '../../core/models/user.model';
import { AuthService } from '../../core/services/auth.service';

interface NavChild {
    label: string;
    route: string;
}

interface NavItem {
    label: string;
    icon: string;
    route?: string;
    children?: NavChild[];
}

@Component({
    selector: 'app-backoffice-layout',
    standalone: true,
    imports: [CommonModule, RouterModule],
    templateUrl: './backoffice-layout.component.html',
    styleUrl: './backoffice-layout.component.css'
})
export class BackofficeLayoutComponent {
    private readonly authService = inject(AuthService);
    private readonly router = inject(Router);

    readonly user = this.authService.currentUser;

    sujetsExpanded = true;

    readonly initials = computed(() => {
        const u = this.user();
        return u ? `${u.prenom.charAt(0)}${u.nom.charAt(0)}`.toUpperCase() : 'AD';
    });

    readonly roleLabel = computed(() => {
        const role = this.user()?.role;
        return role ? BackofficeLayoutComponent.ROLE_LABELS[role] : '';
    });

    private static readonly ROLE_LABELS: Record<Role, string> = {
        ROLE_ADMIN: 'Super-administrateur',
        ROLE_ENSEIGNANT: 'Enseignant',
        ROLE_CHEF_EQUIPE: "Chef d'équipe",
        ROLE_ETUDIANT: 'Étudiant',
        ROLE_CI: 'Comité industriel',
    };

    navItems: NavItem[] = [
        { label: 'Tableau de bord', icon: 'grid', route: '/backoffice/dashboard' },
        {
            label: 'Sujets',
            icon: 'clipboard',
            children: [
                { label: 'Sujets', route: '/backoffice/subjects' },
                { label: 'Formulaires', route: '/backoffice/subjects/formulaires' },
            ],
        },
        { label: 'Catalogue applicatif', icon: 'layers', route: '/backoffice/catalog' },
        { label: 'Candidatures', icon: 'file-text', route: '/backoffice/applications' },
        { label: 'Équipes de recherche', icon: 'users', route: '/backoffice/equipes-recherche' },
        { label: 'Encadrants', icon: 'award', route: '/backoffice/supervisors' },
        { label: 'Utilisateurs', icon: 'users-group', route: '/backoffice/users' },
        { label: 'Historique', icon: 'clock', route: '/backoffice/history' },
        { label: 'Paramètres', icon: 'settings', route: '/backoffice/settings' },
        { label: 'Évaluations', icon: 'check-circle', route: '/backoffice/admin/evaluations' },
        { label: 'Critères Evaluation Projets', icon: 'check-square', route: '/backoffice/criteres' },
        { label: 'Questions industrialisation', icon: 'check-square', route: '/backoffice/admin/industrialisation/questions' },
        { label: 'Livrables', icon: 'file-text', route: '/backoffice/admin/livrables' }
    ];

    isProfileOpen = false;

    constructor() {
        this.router.events
            .pipe(filter((e): e is NavigationEnd => e instanceof NavigationEnd))
            .subscribe(() => {
                if (this.isSujetsSectionActive()) {
                    this.sujetsExpanded = true;
                }
            });
    }

    toggleProfileMenu(): void {
        this.isProfileOpen = !this.isProfileOpen;
    }

    toggleSujetsMenu(): void {
        this.sujetsExpanded = !this.sujetsExpanded;
    }

    isSujetsSectionActive(): boolean {
        return this.router.url.startsWith('/backoffice/subjects');
    }

    isChildActive(route: string): boolean {
        if (route === '/backoffice/subjects') {
            return this.router.url === '/backoffice/subjects';
        }
        return this.router.url === route || this.router.url.startsWith(route + '?');
    }

    isNavItemActive(item: NavItem): boolean {
        if (item.children) {
            return this.isSujetsSectionActive();
        }
        return item.route ? this.router.url.startsWith(item.route) : false;
    }

    logout(): void {
        this.authService.logout();
    }
}
