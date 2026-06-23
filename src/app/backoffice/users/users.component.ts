import { CommonModule } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { Component, OnDestroy, OnInit, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Subject, debounceTime, distinctUntilChanged, takeUntil } from 'rxjs';
import { Role, User } from '../../core/models/user.model';
import { AdminService } from '../../core/services/admin.service';

/** Ligne d'utilisateur telle qu'affichée dans le tableau. */
interface UserRow {
    id: number;
    name: string;
    email: string;
    role: string;
    status: string;
    joined: string;
    initials: string;
    color: string;
}

@Component({
    selector: 'app-users',
    standalone: true,
    imports: [CommonModule, FormsModule],
    templateUrl: './users.component.html',
    styleUrl: './users.component.css'
})
export class UsersComponent implements OnInit, OnDestroy {
    private readonly adminService = inject(AdminService);
    private readonly destroy$ = new Subject<void>();
    private readonly search$ = new Subject<string>();

    // Correspondance rôle backend <-> libellé affiché
    private static readonly ROLE_TO_LABEL: Record<Role, string> = {
        ROLE_ETUDIANT: 'Étudiant',
        ROLE_ENSEIGNANT: 'Enseignant',
        ROLE_CHEF_EQUIPE: "Chef d'équipe",
        ROLE_ADMIN: 'Administrateur',
        ROLE_CI: 'CI',
    };
    private static readonly LABEL_TO_ROLE: Record<string, Role> = {
        'Étudiant': 'ROLE_ETUDIANT',
        'Enseignant': 'ROLE_ENSEIGNANT',
        "Chef d'équipe": 'ROLE_CHEF_EQUIPE',
        'Administrateur': 'ROLE_ADMIN',
        'CI': 'ROLE_CI',
    };
    private static readonly AVATAR_COLORS = [
        '#E23E3E', '#3B82F6', '#10B981', '#F59E0B', '#8B5CF6', '#EC4899', '#6366F1', '#14B8A6',
    ];

    // Import du référentiel CSV
    readonly selectedFile = signal<File | null>(null);
    readonly importing = signal(false);
    readonly importMessage = signal<string | null>(null);
    readonly importError = signal<string | null>(null);

    // Données et états de la table
    users: UserRow[] = [];
    readonly loading = signal(false);
    readonly loadError = signal<string | null>(null);

    // Pagination
    page = 0;
    size = 8;
    totalPages = 0;
    totalElements = 0;
    first = true;
    last = true;

    // Recherche
    searchTerm = '';

    roles = ['Étudiant', 'Enseignant', 'CI', "Chef d'équipe", 'Administrateur'];
    statuses = ['Actif', 'Suspendu'];

    isDetailsModalOpen = false;
    isEditModalOpen = false;
    isCreateModalOpen = false;
    saving = signal(false);
    creating = signal(false);
    editError = signal<string | null>(null);
    createError = signal<string | null>(null);
    selectedUser: UserRow | null = null;
    editUserForm: { name: string; email: string; role: string; status: string } = {
        name: '', email: '', role: '', status: '',
    };
    createUserForm: { name: string; email: string; identifiant: string; password: string; role: string; status: string } = {
        name: '', email: '', identifiant: '', password: '', role: '', status: 'Actif',
    };

    ngOnInit(): void {
        this.search$
            .pipe(debounceTime(300), distinctUntilChanged(), takeUntil(this.destroy$))
            .subscribe((term) => {
                this.searchTerm = term;
                this.page = 0;
                this.loadUsers();
            });
        this.loadUsers();
    }

    ngOnDestroy(): void {
        this.destroy$.next();
        this.destroy$.complete();
    }

    loadUsers(): void {
        this.loading.set(true);
        this.loadError.set(null);
        this.adminService.getUsers(this.page, this.size, this.searchTerm).subscribe({
            next: (res) => {
                this.users = res.content.map((u) => this.toRow(u));
                this.totalPages = res.totalPages;
                this.totalElements = res.totalElements;
                this.first = res.first;
                this.last = res.last;
                this.loading.set(false);
            },
            error: (err: HttpErrorResponse) => {
                this.loading.set(false);
                this.loadError.set(err.error?.detail ?? 'Impossible de charger les utilisateurs.');
            },
        });
    }

    onSearchInput(value: string): void {
        this.search$.next(value);
    }

    nextPage(): void {
        if (!this.last) {
            this.page++;
            this.loadUsers();
        }
    }

    prevPage(): void {
        if (!this.first) {
            this.page--;
            this.loadUsers();
        }
    }

    getStatusClass(status: string): string {
        switch (status.toLowerCase()) {
            case 'actif': return 'status-active';
            case 'suspendu': return 'status-suspended';
            case 'en attente': return 'status-pending';
            default: return '';
        }
    }

    onFileSelected(event: Event): void {
        const input = event.target as HTMLInputElement;
        this.selectedFile.set(input.files?.[0] ?? null);
        this.importMessage.set(null);
        this.importError.set(null);
    }

    importReferentiel(): void {
        const file = this.selectedFile();
        if (!file) {
            return;
        }
        this.importing.set(true);
        this.importMessage.set(null);
        this.importError.set(null);

        this.adminService.importCsv(file).subscribe({
            next: (res) => {
                this.importing.set(false);
                this.importMessage.set(res.message);
                this.selectedFile.set(null);
                // Le référentiel n'ajoute pas de comptes, mais on rafraîchit par cohérence
                this.loadUsers();
            },
            error: (err: HttpErrorResponse) => {
                this.importing.set(false);
                this.importError.set(err.error?.detail ?? 'Échec de l\'import du référentiel.');
            },
        });
    }

    // --- Actions Methods ---

    openCreateModal(): void {
        this.createUserForm = { name: '', email: '', identifiant: '', password: '', role: '', status: 'Actif' };
        this.createError.set(null);
        this.isCreateModalOpen = true;
    }

    closeCreateModal(): void {
        this.isCreateModalOpen = false;
        this.createError.set(null);
    }

    createUser(): void {
        const f = this.createUserForm;
        if (!f.name || !f.email || !f.identifiant || !f.password || !f.role) {
            return;
        }
        const { prenom, nom } = this.splitName(f.name);
        this.creating.set(true);
        this.createError.set(null);
        this.adminService
            .createUser({
                nom,
                prenom,
                email: f.email,
                identifiant: f.identifiant,
                password: f.password,
                role: UsersComponent.LABEL_TO_ROLE[f.role] ?? 'ROLE_ETUDIANT',
                enabled: f.status === 'Actif',
            })
            .subscribe({
                next: () => {
                    this.creating.set(false);
                    this.closeCreateModal();
                    this.page = 0;
                    this.loadUsers();
                },
                error: (err: HttpErrorResponse) => {
                    this.creating.set(false);
                    this.createError.set(this.extractError(err));
                },
            });
    }

    openDetailsModal(user: UserRow): void {
        this.selectedUser = user;
        this.isDetailsModalOpen = true;
    }

    closeDetailsModal(): void {
        this.isDetailsModalOpen = false;
        this.selectedUser = null;
    }

    openEditModal(user: UserRow): void {
        this.isDetailsModalOpen = false;
        this.selectedUser = user;
        this.editUserForm = {
            name: user.name,
            email: user.email,
            role: user.role,
            status: user.status,
        };
        this.editError.set(null);
        this.isEditModalOpen = true;
    }

    closeEditModal(): void {
        this.isEditModalOpen = false;
        this.selectedUser = null;
        this.editError.set(null);
    }

    saveUser(): void {
        if (!this.selectedUser || !this.editUserForm.name || !this.editUserForm.email) {
            return;
        }
        const { prenom, nom } = this.splitName(this.editUserForm.name);
        this.saving.set(true);
        this.editError.set(null);
        this.adminService
            .updateUser(this.selectedUser.id, {
                nom,
                prenom,
                email: this.editUserForm.email,
                role: UsersComponent.LABEL_TO_ROLE[this.editUserForm.role] ?? 'ROLE_ETUDIANT',
                enabled: this.editUserForm.status === 'Actif',
            })
            .subscribe({
                next: () => {
                    this.saving.set(false);
                    this.closeEditModal();
                    this.loadUsers();
                },
                error: (err: HttpErrorResponse) => {
                    this.saving.set(false);
                    this.editError.set(err.error?.detail ?? 'Échec de la mise à jour.');
                },
            });
    }

    deleteUser(user: UserRow): void {
        if (!confirm(`Voulez-vous vraiment supprimer l'utilisateur ${user.name} ?`)) {
            return;
        }
        this.adminService.deleteUser(user.id).subscribe({
            next: () => {
                // Si on supprime le dernier élément d'une page, revenir en arrière
                if (this.users.length === 1 && this.page > 0) {
                    this.page--;
                }
                this.loadUsers();
            },
            error: (err: HttpErrorResponse) => {
                alert(err.error?.detail ?? 'Échec de la suppression.');
            },
        });
    }

    private toRow(u: User): UserRow {
        const name = `${u.prenom} ${u.nom}`.trim();
        return {
            id: u.id,
            name,
            email: u.email,
            role: UsersComponent.ROLE_TO_LABEL[u.role] ?? u.role,
            status: u.enabled ? 'Actif' : 'Suspendu',
            joined: u.createdAt ? u.createdAt.substring(0, 10) : '—',
            initials: this.initialsOf(u.prenom, u.nom),
            color: UsersComponent.AVATAR_COLORS[u.id % UsersComponent.AVATAR_COLORS.length],
        };
    }

    private initialsOf(prenom: string, nom: string): string {
        return `${prenom.charAt(0)}${nom.charAt(0)}`.toUpperCase();
    }

    /** Message lisible à partir d'une erreur backend (409 doublon, 400 validation, etc.). */
    private extractError(err: HttpErrorResponse): string {
        if (err.status === 0) {
            return 'Serveur injoignable.';
        }
        const fieldErrors = err.error?.errors as Record<string, string> | undefined;
        if (err.status === 400 && fieldErrors) {
            return Object.values(fieldErrors).join(' ');
        }
        return err.error?.detail ?? 'Une erreur est survenue. Veuillez réessayer.';
    }

    private splitName(fullName: string): { prenom: string; nom: string } {
        const tokens = fullName.trim().split(/\s+/);
        const prenom = tokens[0];
        const nom = tokens.length > 1 ? tokens.slice(1).join(' ') : prenom;
        return { prenom, nom };
    }
}
