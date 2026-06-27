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

    expandedGroups: Record<string, boolean> = {
        Sujets: true,
        'Évaluations': false,
    };

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
        { label: 'Équipes de recherche', icon: 'users', route: '/backoffice/research-teams' },
        { label: 'Encadrants', icon: 'award', route: '/backoffice/supervisors' },
        { label: 'Utilisateurs', icon: 'users-group', route: '/backoffice/users' },
        { label: 'Historique', icon: 'clock', route: '/backoffice/history' },
        { label: 'Paramètres', icon: 'settings', route: '/backoffice/settings' },
        {
            label: 'Évaluations',
            icon: 'clipboard-check',
            children: [
                { label: 'Évaluations', route: '/backoffice/admin/evaluations' },
                { label: 'Critères Evaluation Projets', route: '/backoffice/criteres' },
                { label: 'Questions industrialisation', route: '/backoffice/admin/industrialisation/questions' },
                { label: 'Livrables', route: '/backoffice/admin/livrables' },
            ],
        },
    ];

    isProfileOpen = false;

    constructor() {
        this.expandActiveGroups();

        this.router.events
            .pipe(filter((e): e is NavigationEnd => e instanceof NavigationEnd))
            .subscribe(() => this.expandActiveGroups());
    }

    toggleProfileMenu(): void {
        this.isProfileOpen = !this.isProfileOpen;
    }

    toggleNavGroup(item: NavItem): void {
        this.expandedGroups[item.label] = !this.isNavGroupExpanded(item);
    }

    isNavGroupExpanded(item: NavItem): boolean {
        return !!this.expandedGroups[item.label];
    }

    isNavGroupActive(item: NavItem): boolean {
        return item.children?.some((child) => this.isChildActive(child.route)) ?? false;
    }

    isChildActive(route: string): boolean {
        if (route === '/backoffice/subjects') {
            return this.router.url === '/backoffice/subjects';
        }
        return this.router.url === route || this.router.url.startsWith(route + '?');
    }

    isNavItemActive(item: NavItem): boolean {
        if (item.children) {
            return this.isNavGroupActive(item);
        }
        return item.route ? this.router.url.startsWith(item.route) : false;
    }

    private expandActiveGroups(): void {
        this.navItems
            .filter((item) => item.children?.length)
            .forEach((item) => {
                if (this.isNavGroupActive(item)) {
                    this.expandedGroups[item.label] = true;
                }
            });
    }

    logout(): void {
        this.authService.logout();
    }
}
