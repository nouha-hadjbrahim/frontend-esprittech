import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

@Component({
    selector: 'app-my-projects',
    standalone: true,
    imports: [CommonModule, FormsModule],
    templateUrl: './my-projects.component.html',
    styleUrl: './my-projects.component.css'
})
export class MyProjectsComponent {
    isModalOpen = false;

    projects = [
        {
            title: 'Tableau de bord RH',
            type: 'PFE',
            year: '2025',
            supervisors: 'Leila Mansouri',
            score: 80,
            status: 'Candidat industrialisation interne',
            cover: 'https://images.unsplash.com/photo-1542744173-8e7e53415bb0?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80',
            statusColor: '#60A5FA' // Blue
        },
        {
            title: 'Gestion des absences étudiantes',
            type: 'PFE',
            year: '2024',
            supervisors: 'Ahmed Ben Salem, Leila Mansouri',
            score: 88,
            status: 'Industrialisé DSI',
            cover: 'https://images.unsplash.com/photo-1461749280684-dccba630e2f6?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80',
            statusColor: '#34D399' // Green
        },
        {
            title: 'Application Mobile E-Commerce',
            type: 'Stage',
            year: '2025',
            supervisors: 'Karim Mansouri',
            score: 95,
            status: 'Réalisation terminée',
            cover: 'https://images.unsplash.com/photo-1551288049-bebda4e38f71?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80',
            statusColor: '#FBBF24' // Yellow
        },
        {
            title: 'Système IoT de Surveillance',
            type: 'RDI',
            year: '2025',
            supervisors: 'Ines Khaldi',
            score: 75,
            status: 'Candidat industrialisation externe',
            cover: 'https://images.unsplash.com/photo-1498050108023-c5249f4df085?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80',
            statusColor: '#60A5FA' // Blue
        }
    ];

    newProject = {
        type: 'PFE',
        title: '',
        description: '',
        objectives: '',
        startDate: '',
        endDate: ''
    };

    prerequisitesList = [
        { name: 'Autonomie', selected: false },
        { name: 'Communication', selected: false },
        { name: 'Gestion de projet', selected: false },
        { name: 'Hard skills', selected: false },
        { name: 'Soft skills', selected: false },
        { name: 'Travail en équipe', selected: false }
    ];

    domainsList = [
        { name: 'Cloud & DevOps', selected: false },
        { name: 'Cybersécurité', selected: false },
        { name: 'Data Science', selected: false },
        { name: 'Génie Logiciel', selected: false },
        { name: 'Intelligence Artificielle', selected: false },
        { name: 'IoT', selected: false },
        { name: 'Réseaux', selected: false },
        { name: 'Robotique', selected: false }
    ];

    technologiesList = [
        { name: 'Angular', selected: false },
        { name: 'Docker', selected: false },
        { name: 'Java', selected: false },
        { name: 'Kubernetes', selected: false },
        { name: 'Node.js', selected: false },
        { name: 'PostgreSQL', selected: false },
        { name: 'Python', selected: false },
        { name: 'React', selected: false },
        { name: 'Spring Boot', selected: false },
        { name: 'TensorFlow', selected: false }
    ];

    customPrerequisite = '';
    customDomain = '';
    customTech = '';

    openModal() {
        this.isModalOpen = true;
    }

    closeModal() {
        this.isModalOpen = false;
        this.resetForm();
    }

    setProjectType(type: string) {
        this.newProject.type = type;
    }

    addCustomItem(list: any[], inputField: 'customPrerequisite' | 'customDomain' | 'customTech') {
        const value = this[inputField].trim();
        if (value) {
            list.unshift({ name: value, selected: true });
            this[inputField] = '';
        }
    }

    resetForm() {
        this.newProject = { type: 'PFE', title: '', description: '', objectives: '', startDate: '', endDate: '' };
        this.prerequisitesList.forEach(item => item.selected = false);
        this.domainsList.forEach(item => item.selected = false);
        this.technologiesList.forEach(item => item.selected = false);
        this.customPrerequisite = '';
        this.customDomain = '';
        this.customTech = '';
    }

    submitProject() {
        console.log('Project Submitted:', this.newProject);
        const selectedPrereqs = this.prerequisitesList.filter(p => p.selected).map(p => p.name);
        const selectedDomains = this.domainsList.filter(d => d.selected).map(d => d.name);
        const selectedTechs = this.technologiesList.filter(t => t.selected).map(t => t.name);
        console.log('Selected:', { selectedPrereqs, selectedDomains, selectedTechs });
        this.closeModal();
    }
}
