import { CommonModule } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { Component, HostListener, OnDestroy, OnInit, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Subject, debounceTime, distinctUntilChanged, takeUntil } from 'rxjs';
import { Role, User } from '../../core/models/user.model';
import { AdminService } from '../../core/services/admin.service';
import { ConfirmDialog } from '../../shared/components/confirm-dialog/confirm-dialog';

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
    imports: [CommonModule, FormsModule, ConfirmDialog],
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
    selectedRole = '';
    readonly openFilter = signal<'role' | null>(null);

    readonly roleOptions = [
        { label: 'Tous les rôles', value: '' },
        { label: 'Étudiant', value: 'Étudiant' },
        { label: 'Enseignant', value: 'Enseignant' },
        { label: 'CI', value: 'CI' },
        { label: "Chef d'équipe", value: "Chef d'équipe" },
        { label: 'Administrateur', value: 'Administrateur' },
    ];

    roles = ['Étudiant', 'Enseignant', 'CI', "Chef d'équipe", 'Administrateur'];
    statuses = ['Actif', 'Suspendu'];

    isDetailsModalOpen = false;
    isEditModalOpen = false;
    isCreateModalOpen = false;
    saving = signal(false);

    deleteConfirmOpen = false;
    deleteAlertOpen = false;
    deleteAlertMessage = '';
    deleting = false;
    userToDelete: UserRow | null = null;
    creating = signal(false);
    editError = signal<string | null>(null);
    createError = signal<string | null>(null);
    selectedUser: UserRow | null = null;
    editUserForm: { name: string; email: string; role: string; status: string } = {
        name: '', email: '', role: '', status: '',
    };
    createUserForm: { name: string; email: string; password: string; role: string; status: string } = {
        name: '', email: '', password: '', role: '', status: 'Actif',
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

    goToPage(newPage: number): void {
        if (newPage < 0 || newPage >= this.totalPages || newPage === this.page) return;
        this.page = newPage;
        this.loadUsers();
    }

    get pageDisplayCount(): number {
        return this.filteredUsers.length;
    }

    get filteredUsers(): UserRow[] {
        if (!this.selectedRole) {
            return this.users;
        }
        return this.users.filter((user) => user.role === this.selectedRole);
    }

    get roleFilterLabel(): string {
        return this.roleOptions.find((opt) => opt.value === this.selectedRole)?.label ?? 'Tous les rôles';
    }

    @HostListener('document:click')
    closeFilters(): void {
        this.openFilter.set(null);
    }

    toggleFilter(event: Event): void {
        event.stopPropagation();
        this.openFilter.update((current) => (current === 'role' ? null : 'role'));
    }

    selectRoleFilter(value: string): void {
        this.selectedRole = value;
        this.openFilter.set(null);
    }

    getRoleClass(role: string): string {
        switch (role) {
            case 'Étudiant': return 'badge--role-etudiant';
            case 'Enseignant': return 'badge--role-enseignant';
            case "Chef d'équipe": return 'badge--role-chef';
            case 'Administrateur': return 'badge--role-admin';
            case 'CI': return 'badge--role-ci';
            default: return 'badge--role-default';
        }
    }

    getStatusClass(status: string): string {
        switch (status.toLowerCase()) {
            case 'actif': return 'badge--statut-actif';
            case 'suspendu': return 'badge--statut-suspendu';
            default: return 'badge--statut-neutral';
        }
    }

    getStatusDotClass(status: string): string {
        switch (status.toLowerCase()) {
            case 'actif': return 'dot-actif';
            case 'suspendu': return 'dot-suspendu';
            default: return 'dot-neutral';
        }
    }

    get pageNumbers(): number[] {
        return Array.from({ length: Math.max(this.totalPages, 1) }, (_, i) => i + 1);
    }

    // --- Actions Methods ---

    openCreateModal(): void {
        this.createUserForm = { name: '', email: '', password: '', role: '', status: 'Actif' };
        this.createError.set(null);
        this.isCreateModalOpen = true;
    }

    closeCreateModal(): void {
        this.isCreateModalOpen = false;
        this.createError.set(null);
    }

    createUser(): void {
        const f = this.createUserForm;
        if (!f.name || !f.email || !f.password || !f.role) {
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

    /**
     * Ferme la modale uniquement si le clic provient de l'overlay lui-même
     * (et non d'un élément interne). Retourne `void` volontairement : si un
     * handler d'événement Angular retourne `false`, Angular appelle
     * `preventDefault()` sur l'événement, ce qui bloquerait la soumission du
     * formulaire quand le clic vient du bouton « submit ».
     */
    onOverlayClick(event: Event, modal: 'details' | 'edit' | 'create'): void {
        if (event.target !== event.currentTarget) {
            return;
        }
        switch (modal) {
            case 'details': this.closeDetailsModal(); break;
            case 'edit': this.closeEditModal(); break;
            case 'create': this.closeCreateModal(); break;
        }
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
        this.userToDelete = user;
        this.deleteConfirmOpen = true;
        this.deleteAlertOpen = false;
        this.deleteAlertMessage = '';
    }

    cancelDelete(): void {
        this.deleteConfirmOpen = false;
        this.userToDelete = null;
        this.deleting = false;
    }

    confirmDelete(): void {
        const user = this.userToDelete;
        if (!user || this.deleting) { return; }

        this.deleting = true;
        this.adminService.deleteUser(user.id).subscribe({
            next: () => {
                if (this.users.length === 1 && this.page > 0) {
                    this.page--;
                }
                this.deleting = false;
                this.deleteConfirmOpen = false;
                this.userToDelete = null;
                this.loadUsers();
            },
            error: (err: HttpErrorResponse) => {
                this.deleting = false;
                this.deleteConfirmOpen = false;
                this.userToDelete = null;
                this.deleteAlertMessage = err.error?.detail ?? 'Échec de la suppression.';
                this.deleteAlertOpen = true;
            },
        });
    }

    closeDeleteAlert(): void {
        this.deleteAlertOpen = false;
        this.deleteAlertMessage = '';
    }

    get deleteConfirmMessage(): string {
        return this.userToDelete
            ? `Voulez-vous vraiment supprimer l'utilisateur ${this.userToDelete.name} ? Cette action est irréversible.`
            : '';
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
