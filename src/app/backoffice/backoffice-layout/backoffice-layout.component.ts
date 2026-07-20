import { CommonModule } from '@angular/common';
import { Component, computed, inject, signal } from '@angular/core';
import { NavigationEnd, Router, RouterModule } from '@angular/router';
import { filter } from 'rxjs';
import { Role } from '../../core/models/user.model';
import { AuthService } from '../../core/services/auth.service';
import { AffiliationService } from '../../core/services/affiliation.service';
import { NotificationService } from '../../core/services/notification.service';
import { NotificationBellComponent } from '../../shared/components/notification-bell/notification-bell.component';

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
    imports: [CommonModule, RouterModule, NotificationBellComponent],
    templateUrl: './backoffice-layout.component.html',
    styleUrl: './backoffice-layout.component.css'
})
export class BackofficeLayoutComponent {
    private readonly authService = inject(AuthService);
    private readonly router = inject(Router);
    private readonly affiliationSvc = inject(AffiliationService);
    private readonly notificationService = inject(NotificationService);

    readonly pendingDemandesCount = signal(0);

    readonly user = this.authService.currentUser;

    expandedGroups: Record<string, boolean> = {
        Sujets: true,
        'Équipes de recherche': true,
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
        {
            label: 'Équipes de recherche',
            icon: 'users',
            children: [
                { label: 'Équipes', route: '/backoffice/equipes-recherche' },
                { label: 'Domaines', route: '/backoffice/equipes-recherche/domaines' },
                { label: 'Demandes', route: '/backoffice/equipes-recherche/demandes' },
            ],
        },
        { label: 'Utilisateurs', icon: 'users-group', route: '/backoffice/users' },
        { label: 'Historique', icon: 'clock', route: '/backoffice/history' },
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

    private readonly groupBaseRoutes: Record<string, string> = {
        'Sujets': '/backoffice/subjects',
        'Équipes de recherche': '/backoffice/equipes-recherche',
        'Évaluations': '/backoffice/admin/evaluations',
    };

    constructor() {
        this.expandActiveGroups();
        this.loadPendingDemandes();
        this.notificationService.initialize();

        this.router.events
            .pipe(filter((e): e is NavigationEnd => e instanceof NavigationEnd))
            .subscribe(() => this.expandActiveGroups());
    }

    private loadPendingDemandes(): void {
        this.affiliationSvc.getAll().subscribe({
            next: (data) => this.pendingDemandesCount.set(data.filter((r) => r.statut === 'EN_ATTENTE').length),
        });
    }

    toggleProfileMenu(): void {
        this.isProfileOpen = !this.isProfileOpen;
    }

    toggleNavGroup(item: NavItem): void {
        this.expandedGroups[item.label] = !this.expandedGroups[item.label];
    }

    isNavGroupExpanded(item: NavItem): boolean {
        return !!this.expandedGroups[item.label];
    }

    isNavGroupActive(item: NavItem): boolean {
        if (item.children?.some((child) => this.isChildActive(child.route))) {
            return true;
        }
        const baseRoute = this.groupBaseRoutes[item.label];
        return baseRoute ? this.router.url.startsWith(baseRoute) : false;
    }

    isChildActive(route: string): boolean {
        const url = this.router.url.split('?')[0];
        if (route === '/backoffice/subjects') {
            return url === '/backoffice/subjects';
        }
        if (route === '/backoffice/subjects/formulaires') {
            return url.startsWith('/backoffice/subjects/formulaires');
        }
        // Exact match for parent "Équipes" so /domaines and /demandes don't also highlight it
        if (route === '/backoffice/equipes-recherche') {
            return url === '/backoffice/equipes-recherche';
        }
        if (route === '/backoffice/equipes-recherche/domaines') {
            return url.startsWith('/backoffice/equipes-recherche/domaines');
        }
        if (route === '/backoffice/equipes-recherche/demandes') {
            return url.startsWith('/backoffice/equipes-recherche/demandes');
        }
        return url === route || url.startsWith(route + '/');
    }

    isNavItemActive(item: NavItem): boolean {
        if (item.children) {
            return this.isNavGroupActive(item);
        }
        return item.route ? this.router.url.startsWith(item.route) : false;
    }

    private expandActiveGroups(): void {
        for (const item of this.navItems) {
            if (!item.children?.length) {
                continue;
            }
            this.expandedGroups[item.label] = this.isNavGroupActive(item);
        }
    }

    logout(): void {
        this.authService.logout();
    }
}
