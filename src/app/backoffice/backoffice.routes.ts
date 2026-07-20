import { Routes } from '@angular/router';
import { BackofficeLayoutComponent } from './backoffice-layout/backoffice-layout.component';
import { UsersComponent } from './users/users.component';
import { ProjectDetailsComponent } from './project-details/project-details.component';
import { EquipesRechercheComponent } from './equipes-recherche/equipes-recherche.component';
import { DomainesComponent } from './equipes-recherche/domaines/domaines.component';
import { DemandesAffiliationComponent } from './equipes-recherche/demandes-affiliation/demandes-affiliation.component';
import { DashboardComponent } from './dashboard/dashboard.component';
import { SubjectsComponent } from './subjects/subjects.component';
import { SubjectDetailComponent } from './subjects/subject-detail/subject-detail.component';
import { FormulairesComponent } from './subjects/formulaires/formulaires.component';
import { CatalogComponent } from './catalog/catalog.component';
import { SupervisorsComponent } from './supervisors/supervisors.component';
import { HistoryComponent } from './history/history.component';
import { ProfileComponent } from './profile/profile.component';

export const backofficeRoutes: Routes = [
  {
    path: '',
    component: BackofficeLayoutComponent,
    children: [
      { path: 'dashboard', component: DashboardComponent },
      { path: 'project-details', component: ProjectDetailsComponent },
      { path: 'subjects', component: SubjectsComponent },
      { path: 'subjects/formulaires', component: FormulairesComponent },
      { path: 'subjects/:id/edit', redirectTo: 'subjects/:id', pathMatch: 'full' },
      { path: 'subjects/:id', component: SubjectDetailComponent },
      { path: 'subjects/domaines', redirectTo: 'subjects/formulaires', pathMatch: 'full' },
      { path: 'subjects/prerequis', redirectTo: 'subjects/formulaires', pathMatch: 'full' },
      { path: 'subjects/technologies', redirectTo: 'subjects/formulaires', pathMatch: 'full' },
      { path: 'catalog', component: CatalogComponent },
      {
        path: 'catalog/:id',
        loadComponent: () =>
          import('../frontoffice/pages/projet-detail-enseignant/projet-detail-enseignant')
            .then(m => m.ProjetDetailEnseignant)
      },
      { path: 'applications', redirectTo: 'subjects', pathMatch: 'full' },
      { path: 'equipes-recherche', component: EquipesRechercheComponent },
      { path: 'equipes-recherche/domaines', component: DomainesComponent },
      { path: 'equipes-recherche/demandes', component: DemandesAffiliationComponent },
      { path: 'supervisors', component: SupervisorsComponent },
      { path: 'users', component: UsersComponent },
      { path: 'history', component: HistoryComponent },
      { path: 'profile', component: ProfileComponent },
      {
        path: 'admin/evaluations',
        loadComponent: () =>
          import('./evaluations/evaluation-page.component')
            .then(m => m.EvaluationPageComponent)
      },
      {
        path: 'criteres',
        loadComponent: () =>
          import('./criteresEvaluationAdmin/admin-criteres-page.component')
            .then(m => m.AdminCriteresPageComponent)
      },
      {
        path: 'admin/industrialisation/questions',
        loadComponent: () =>
          import('./industrialisation-questions/industrialisation-questions.component')
            .then(m => m.IndustrialisationQuestionsComponent)
      },
      {
        path: 'admin/livrables',
        loadComponent: () =>
          import('./livrables-admin/livrables-admin.component')
            .then(m => m.LivrablesAdminComponent)
      },
      { path: '', redirectTo: 'dashboard', pathMatch: 'full' }
    ]
  }
];
