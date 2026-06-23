import { Routes } from '@angular/router';
import { roleGuard } from '../core/guards/role.guard';
import { FrontofficeLayout } from './frontoffice-layout/frontoffice-layout';

export const frontofficeRoutes: Routes = [
    {
        path: '',
        component: FrontofficeLayout,
        children: [
            {
                path: 'catalogue',
                canActivate: [roleGuard(['ROLE_ENSEIGNANT', 'ROLE_CHEF_EQUIPE', 'ROLE_CI'])],
                loadComponent: () => import('./pages/catalogue/catalogue').then(m => m.Catalogue)
            },
            {
                path: 'mes-projets',
                canActivate: [roleGuard(['ROLE_ENSEIGNANT'])],
                loadComponent: () => import('./pages/mes-projets/mes-projets').then(m => m.MesProjets)
            },
            {
                path: 'sujets-disponibles',
                canActivate: [roleGuard(['ROLE_ENSEIGNANT', 'ROLE_ETUDIANT', 'ROLE_CHEF_EQUIPE', 'ROLE_CI'])],
                loadComponent: () => import('./pages/sujets-disponibles/sujets-disponibles').then(m => m.SujetsDisponibles)
            },
            {
                path: 'equipes-recherche',
                canActivate: [roleGuard(['ROLE_ENSEIGNANT', 'ROLE_CHEF_EQUIPE'])],
                loadComponent: () => import('./pages/equipes-recherche/equipes-recherche').then(m => m.EquipesRecherche)
            },
            {
                path: 'mes-candidatures',
                canActivate: [roleGuard(['ROLE_ETUDIANT'])],
                loadComponent: () => import('./pages/mes-candidatures/mes-candidatures').then(m => m.MesCandidatures)
            },
            {
                path: 'tableau-de-bord',
                canActivate: [roleGuard(['ROLE_CHEF_EQUIPE', 'ROLE_CI'])],
                loadComponent: () => import('./pages/tableau-de-bord/tableau-de-bord').then(m => m.TableauDeBord)
            },
            {
                path: 'validation-sujets',
                canActivate: [roleGuard(['ROLE_CHEF_EQUIPE'])],
                loadComponent: () => import('./pages/validation-sujets/validation-sujets').then(m => m.ValidationSujets)
            },
            {
                path: 'demandes-industrialisation',
                canActivate: [roleGuard(['ROLE_CHEF_EQUIPE', 'ROLE_CI'])],
                loadComponent: () => import('./pages/demandes-industrialisation/demandes-industrialisation').then(m => m.DemandesIndustrialisation)
            },
            { path: '', redirectTo: 'sujets-disponibles', pathMatch: 'full' }
        ]
    }
];
