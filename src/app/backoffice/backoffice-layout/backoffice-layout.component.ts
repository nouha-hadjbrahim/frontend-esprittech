import { CommonModule } from '@angular/common';
import { Component, computed, inject } from '@angular/core';
import { RouterModule } from '@angular/router';
import { Role } from '../../core/models/user.model';
import { AuthService } from '../../core/services/auth.service';

@Component({
    selector: 'app-backoffice-layout',
    standalone: true,
    imports: [CommonModule, RouterModule],
    templateUrl: './backoffice-layout.component.html',
    styleUrl: './backoffice-layout.component.css'
})
export class BackofficeLayoutComponent {
    private readonly authService = inject(AuthService);

    readonly user = this.authService.currentUser;

    /** Initiales affichées dans l'avatar (fallback "AD"). */
    readonly initials = computed(() => {
        const u = this.user();
        return u ? `${u.prenom.charAt(0)}${u.nom.charAt(0)}`.toUpperCase() : 'AD';
    });

    /** Libellé lisible du rôle courant. */
    readonly roleLabel = computed(() => {
        const role = this.user()?.role;
        return role ? BackofficeLayoutComponent.ROLE_LABELS[role] : '';
    });

    private static readonly ROLE_LABELS: Record<Role, string> = {
        ROLE_ADMIN: 'Administrateur',
        ROLE_ENSEIGNANT: 'Enseignant',
        ROLE_CHEF_EQUIPE: "Chef d'équipe",
        ROLE_ETUDIANT: 'Étudiant',
        ROLE_CI: 'Comité industriel',
    };

    navItems = [
        { label: 'Tableau de bord', icon: 'grid', route: '/backoffice/dashboard' },
        { label: 'Sujets', icon: 'book', route: '/backoffice/subjects' },
        { label: 'Catalogue applicatif', icon: 'layers', route: '/backoffice/catalog' },
        { label: 'Candidatures', icon: 'file-text', route: '/backoffice/applications' },
        { label: 'Équipes de recherche', icon: 'users', route: '/backoffice/research-teams' },
        { label: 'Encadrants', icon: 'award', route: '/backoffice/supervisors' },
        { label: 'Utilisateurs', icon: 'users-group', route: '/backoffice/users' },
        { label: 'Historique', icon: 'clock', route: '/backoffice/history' },
        { label: 'Paramètres', icon: 'settings', route: '/backoffice/settings' },
        { label: 'Critères Evaluation Projets', icon: 'check-square', route: '/backoffice/criteres' }
    ];

    isProfileOpen = false;

    toggleProfileMenu(): void {
        this.isProfileOpen = !this.isProfileOpen;
    }

    logout(): void {
        this.authService.logout();
    }
}
