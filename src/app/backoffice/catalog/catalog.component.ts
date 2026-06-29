import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';

@Component({
  selector: 'app-catalog',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './catalog.component.html',
  styleUrl: './catalog.component.css'
})
export class CatalogComponent {
  activeType = 'Tous';

  projects = [
    {
      id: 1,
      title: 'Tableau de bord RH',
      description: 'Dashboard analytique des ressources humaines.',
      type: 'PFE',
      status: 'Candidat industrialisation interne',
      statusColor: '#60A5FA', // Blue-ish
      year: '2025',
      supervisor: 'Dr. Kanray Imen',
      domain: 'BI',
      porteurs: 1,
      score: 80,
      cover: 'https://images.unsplash.com/photo-1542744173-8e7e53415bb0?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80',
      labelise: false,
      technologies: [
        { name: 'Power BI', color: '#6b7280', bgColor: '#f3f4f6' },
        { name: 'Python', color: '#f59e0b', bgColor: '#fef3c7' },
        { name: 'SQL', color: '#e23e3e', bgColor: '#fef2f2' }
      ]
    },
    {
      id: 2,
      title: 'Gestion des absences étudiantes',
      description: 'Plateforme de suivi en temps réel des présences avec QR code et reconnaissance faciale.',
      type: 'PFE',
      status: 'Industrialisé DSI',
      statusColor: '#10B981', // Green-ish
      year: '2024',
      supervisor: 'Dr. Ben Ali Sami',
      domain: 'Informatique',
      porteurs: 2,
      score: 88,
      cover: 'https://images.unsplash.com/photo-1461749280684-dccba630e2f6?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80',
      labelise: true,
      technologies: [
        { name: 'React', color: '#e23e3e', bgColor: '#fef2f2' },
        { name: 'Node.js', color: '#f59e0b', bgColor: '#fef3c7' },
        { name: 'PostgreSQL', color: '#e23e3e', bgColor: '#fef2f2' }
      ]
    },
    {
      id: 3,
      title: 'Chatbot scolarité IA',
      description: 'Assistant conversationnel multilingue pour les questions étudiantes.',
      type: 'Stage',
      status: 'Réalisation terminée',
      statusColor: '#FBBF24', // Yellow-ish
      year: '2024',
      supervisor: 'Dr. Mrad Fatma',
      domain: 'Data Science',
      porteurs: 1,
      score: 72,
      cover: 'https://images.unsplash.com/photo-1620121692029-d088224ddc74?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80',
      labelise: false,
      technologies: [
        { name: 'Python', color: '#f59e0b', bgColor: '#fef3c7' },
        { name: 'LangChain', color: '#4b5563', bgColor: '#f3f4f6' },
        { name: 'Next.js', color: '#f59e0b', bgColor: '#fef3c7' }
      ]
    },
    {
      id: 4,
      title: 'Application Web E-commerce',
      description: 'Plateforme B2B pour les entreprises.',
      type: 'Stage',
      status: 'Candidat industrialisation externe',
      statusColor: '#60A5FA', // Blue-ish
      year: '2024',
      supervisor: 'Dr. Frikha Anis',
      domain: 'Génie Logiciel',
      porteurs: 1,
      score: 85,
      cover: 'https://images.unsplash.com/photo-1551288049-bebda4e38f71?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80',
      labelise: false,
      technologies: [
        { name: 'Angular', color: '#e23e3e', bgColor: '#fef2f2' },
        { name: 'Spring Boot', color: '#10B981', bgColor: '#ecfdf5' }
      ]
    },
    {
      id: 5,
      title: 'Système IoT de Surveillance',
      description: 'Capteurs de température et d\'humidité en temps réel.',
      type: 'PFE',
      status: 'Labelisé',
      statusColor: '#e23e3e', // Red
      year: '2025',
      supervisor: 'Dr. Ines Khaldi',
      domain: 'IoT',
      porteurs: 3,
      score: 92,
      cover: 'https://images.unsplash.com/photo-1498050108023-c5249f4df085?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80',
      labelise: true,
      technologies: [
        { name: 'C++', color: '#6b7280', bgColor: '#f3f4f6' },
        { name: 'AWS IoT', color: '#f59e0b', bgColor: '#fef3c7' }
      ]
    }
  ];

  setType(type: string) {
    this.activeType = type;
  }
}
