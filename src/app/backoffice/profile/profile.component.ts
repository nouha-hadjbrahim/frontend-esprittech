import { CommonModule } from '@angular/common';
import { Component, computed, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../../core/services/auth.service';
import { Role } from '../../core/models/user.model';

@Component({
    selector: 'app-profile',
    standalone: true,
    imports: [CommonModule, FormsModule],
    templateUrl: './profile.component.html',
    styleUrl: './profile.component.css'
})
export class ProfileComponent {
    private readonly authService = inject(AuthService);
    readonly user = this.authService.currentUser;

    readonly initials = computed(() => {
        const u = this.user();
        return u ? `${u.prenom.charAt(0)}${u.nom.charAt(0)}`.toUpperCase() : 'AD';
    });

    readonly roleLabel = computed(() => {
        const role = this.user()?.role;
        return role ? this.ROLE_LABELS[role] : '';
    });

    private readonly ROLE_LABELS: Record<Role, string> = {
        ROLE_ADMIN: 'Super-administrateur',
        ROLE_ENSEIGNANT: 'Enseignant',
        ROLE_CHEF_EQUIPE: "Chef d'équipe",
        ROLE_ETUDIANT: 'Étudiant',
        ROLE_CI: 'Comité industriel',
    };

    // Mock data for the form based on screenshot
    profileData = {
        fullName: 'Admin EspritTECH',
        email: 'admin@esprit.tn',
        phone: '+216 71 000 000',
        role: 'Super-administrateur',
        department: 'RDI — Direction'
    };

    passwordData = {
        current: '',
        new: ''
    };
}
