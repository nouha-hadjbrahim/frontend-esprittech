import { Routes } from '@angular/router';
import { mesSujetsGuard } from '../core/guards/mes-sujets.guard';
import { roleGuard } from '../core/guards/role.guard';
import { FrontofficeLayout } from './frontoffice-layout/frontoffice-layout';

const AUTHENTICATED_ROLES = ['ROLE_ENSEIGNANT', 'ROLE_ETUDIANT', 'ROLE_CHEF_EQUIPE', 'ROLE_CI'] as const;

export const frontofficeRoutes: Routes = [
    {
        path: '',
        component: FrontofficeLayout,
        children: [
            {
                path: 'accueil',
                canActivate: [roleGuard([...AUTHENTICATED_ROLES])],
                loadComponent: () => import('./pages/accueil/accueil').then(m => m.Accueil)
            },
            {
                path: 'catalogue',
                canActivate: [roleGuard(['ROLE_ENSEIGNANT', 'ROLE_CHEF_EQUIPE', 'ROLE_CI'])],
                loadComponent: () => import('./pages/catalogue/catalogue').then(m => m.Catalogue)
            },
            {
                path: 'catalogue/:id',
                canActivate: [roleGuard(['ROLE_ENSEIGNANT', 'ROLE_CHEF_EQUIPE', 'ROLE_CI'])],
                loadComponent: () => import('./pages/projet-detail-catalogue/projet-detail-catalogue').then(m => m.ProjetDetailCatalogue)
            },
            {
                path: 'mes-projets',
                canActivate: [roleGuard(['ROLE_ENSEIGNANT'])],
                loadComponent: () => import('./pages/mes-projets/mes-projets').then(m => m.MesProjets)
            },
            {
                path: 'mes-projets/:id',
                canActivate: [roleGuard(['ROLE_ENSEIGNANT'])],
                loadComponent: () => import('./pages/projet-detail-enseignant/projet-detail-enseignant').then(m => m.ProjetDetailEnseignant)
            },
            {
                path: 'validation-projets',
                canActivate: [roleGuard(['ROLE_CHEF_EQUIPE'])],
                loadComponent: () => import('./pages/validation-projets/validation-projets').then(m => m.ValidationProjets)
            },
            {
                path: 'validation-projets/:id',
                canActivate: [roleGuard(['ROLE_CHEF_EQUIPE'])],
                loadComponent: () => import('./pages/projet-detail-enseignant/projet-detail-enseignant').then(m => m.ProjetDetailEnseignant)
            },
            {
                path: 'sujets',
                children: [
                    {
                        path: 'mes-sujets',
                        canActivate: [roleGuard(['ROLE_ENSEIGNANT', 'ROLE_CHEF_EQUIPE']), mesSujetsGuard],
                        loadComponent: () => import('./pages/sujets/mes-sujets/mes-sujets').then(m => m.MesSujets)
                    },
                    {
                        path: 'disponibles',
                        canActivate: [roleGuard([...AUTHENTICATED_ROLES])],
                        loadComponent: () => import('./pages/sujets/sujets-disponibles/sujets-disponibles').then(m => m.SujetsDisponibles)
                    },
                    {
                        path: ':id',
                        canActivate: [roleGuard([...AUTHENTICATED_ROLES])],
                        loadComponent: () => import('./pages/sujets/sujet-detail/sujet-detail').then(m => m.SujetDetail)
                    }
                ]
            },
            {
                path: 'sujets-disponibles',
                redirectTo: 'sujets/disponibles',
                pathMatch: 'full'
            },
            {
                path: 'equipes-recherche',
                canActivate: [roleGuard(['ROLE_ENSEIGNANT', 'ROLE_CHEF_EQUIPE'])],
                children: [
                    {
                        path: '',
                        redirectTo: 'equipes',
                        pathMatch: 'full'
                    },
                    {
                        path: 'toutes-les-equipes',
                        loadComponent: () => import('./pages/equipes-recherche/equipes-recherche').then(m => m.EquipesRecherche),
                        data: { tab: 2 }
                    },
                    {
                        path: 'equipes',
                        loadComponent: () => import('./pages/equipes-recherche/equipes-recherche').then(m => m.EquipesRecherche),
                        data: { tab: 0 }
                    },
                    {
                        path: 'mes-demandes',
                        loadComponent: () => import('./pages/equipes-recherche/equipes-recherche').then(m => m.EquipesRecherche),
                        data: { tab: 1 }
                    },
                    {
                        path: 'mon-equipe',
                        loadComponent: () => import('./pages/equipes-recherche/equipes-recherche').then(m => m.EquipesRecherche),
                        data: { tab: 0 }
                    },
                    {
                        path: 'demandes',
                        loadComponent: () => import('./pages/equipes-recherche/equipes-recherche').then(m => m.EquipesRecherche),
                        data: { tab: 1 }
                    },
                    {
                        path: ':id',
                        loadComponent: () => import('./pages/equipes-recherche/equipe-detail/equipe-detail').then(m => m.EquipeDetail)
                    }
                ]
            },
            {
                path: 'mes-candidatures',
                canActivate: [roleGuard(['ROLE_ETUDIANT'])],
                loadComponent: () => import('./pages/mes-candidatures/mes-candidatures').then(m => m.MesCandidatures)
            },
            {
                path: 'validation-sujets',
                canActivate: [roleGuard(['ROLE_CHEF_EQUIPE'])],
                loadComponent: () => import('./pages/validation-sujets/validation-sujets').then(m => m.ValidationSujets)
            },
            {
                path: 'demandes-industrialisation',
                canActivate: [roleGuard(['ROLE_ENSEIGNANT', 'ROLE_CHEF_EQUIPE', 'ROLE_CI'])],
                loadComponent: () => import('./pages/demandes-industrialisation/demandes-industrialisation').then(m => m.DemandesIndustrialisation)
            },
            {
                path: 'profil',
                loadComponent: () => import('./pages/mon-profil/mon-profil').then(m => m.MonProfil)
            },
            { path: '', redirectTo: 'accueil', pathMatch: 'full' }
        ]
    }
];
