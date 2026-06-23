import { CommonModule } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Equipe } from '../../core/models/equipe.model';
import { AdminService } from '../../core/services/admin.service';
import { EquipeService } from '../../core/services/equipe.service';

/** Ligne d'équipe telle qu'affichée dans le tableau. */
interface TeamRow {
    name: string;
    lead: string;
    description: string;
    members: number;
    created: string;
    status: string;
}

@Component({
    selector: 'app-research-teams',
    standalone: true,
    imports: [CommonModule, FormsModule],
    templateUrl: './research-teams.component.html',
    styleUrl: './research-teams.component.css'
})
export class ResearchTeamsComponent implements OnInit {
    private readonly equipeService = inject(EquipeService);
    private readonly adminService = inject(AdminService);

    isModalOpen = false;

    readonly loading = signal(false);
    readonly loadError = signal<string | null>(null);
    readonly creating = signal(false);
    readonly createError = signal<string | null>(null);

    readonly teams = signal<TeamRow[]>([]);

    readonly stats = computed(() => {
        const rows = this.teams();
        const chefs = rows.filter((t) => t.lead !== 'Aucun chef désigné').length;
        const membres = rows.reduce((sum, t) => sum + t.members, 0);
        return [
            { label: 'Équipes actives', count: rows.length, icon: 'users', color: '#10B981', bgColor: '#ecfdf5' },
            { label: 'Membres totaux', count: membres, icon: 'user-plus', color: '#3B82F6', bgColor: '#eff6ff' },
            { label: 'Chefs désignés', count: chefs, icon: 'user-check', color: '#E23E3E', bgColor: '#fef2f2' },
        ];
    });

    newTeam = {
        nom: '',
        description: '',
        chefId: null as number | null,
    };

    ngOnInit(): void {
        this.loadTeams();
    }

    loadTeams(): void {
        this.loading.set(true);
        this.loadError.set(null);
        this.equipeService.getAll().subscribe({
            next: (equipes) => {
                this.teams.set(equipes.map((e) => this.toRow(e)));
                this.loading.set(false);
            },
            error: (err: HttpErrorResponse) => {
                this.loading.set(false);
                this.loadError.set(err.error?.detail ?? 'Impossible de charger les équipes.');
            },
        });
    }

    openModal(): void {
        this.isModalOpen = true;
    }

    closeModal(): void {
        this.isModalOpen = false;
        this.resetForm();
    }

    resetForm(): void {
        this.newTeam = { nom: '', description: '', chefId: null };
        this.createError.set(null);
    }

    createTeam(): void {
        if (!this.newTeam.nom || this.newTeam.chefId == null) {
            return;
        }
        this.creating.set(true);
        this.createError.set(null);
        this.adminService
            .createEquipe({
                nom: this.newTeam.nom,
                description: this.newTeam.description || undefined,
                chefId: Number(this.newTeam.chefId),
            })
            .subscribe({
                next: () => {
                    this.creating.set(false);
                    this.closeModal();
                    this.loadTeams();
                },
                error: (err: HttpErrorResponse) => {
                    this.creating.set(false);
                    this.createError.set(err.error?.detail ?? 'Échec de la création de l\'équipe.');
                },
            });
    }

    private toRow(e: Equipe): TeamRow {
        const lead = e.chef ? `${e.chef.prenom} ${e.chef.nom}` : 'Aucun chef désigné';
        return {
            name: e.nom,
            lead,
            description: e.description ?? '—',
            members: e.nbMembres,
            created: e.createdAt ? e.createdAt.substring(0, 10) : '—',
            status: e.chef ? 'Active' : 'Inactive',
        };
    }
}
