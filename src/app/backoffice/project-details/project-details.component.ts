import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';

@Component({
    selector: 'app-project-details',
    standalone: true,
    imports: [CommonModule, RouterModule],
    templateUrl: './project-details.component.html',
    styleUrl: './project-details.component.css'
})
export class ProjectDetailsComponent {
    project = {
        title: 'Énergie renouvelable — micro-grid campus',
        type: 'PFE',
        status: 'Validé',
        supervisor: 'Dr. Frikha Anis',
        domains: 'EM',
        equipe: 'REEE',
        startDate: '2026-02-10',
        endDate: '2026-03-20',
        score: 80,
        description: 'Étude de faisabilité d\'un micro-grid solaire.',
        objectives: 'Étude de faisabilité d\'un micro-grid solaire.',
        livrablesAttendus: 'Étude, simulation, prototype.',
        technologies: [
            { name: 'Matlab', color: '#10B981', bgColor: '#ecfdf5' },
            { name: 'Simulink', color: '#3B82F6', bgColor: '#eff6ff' }
        ],
        prerequisites: ['4GE'],
        keywords: ['Énergie', 'Smart Grid']
    };

    activeTab = 'Informations';
    tabs = ['Informations', 'Candidatures (0)', 'Livrables', 'Progression', 'Historique', 'Commentaires'];

    setActiveTab(tab: string) {
        this.activeTab = tab;
    }
}
