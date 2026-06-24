import { Routes } from '@angular/router';
import { BackofficeLayoutComponent } from './backoffice-layout/backoffice-layout.component';
import { UsersComponent } from './users/users.component';
import { EquipesRechercheComponent } from './equipes-recherche/equipes-recherche.component';
import { DashboardComponent } from './dashboard/dashboard.component';
import { SubjectsComponent } from './subjects/subjects.component';
import { CatalogComponent } from './catalog/catalog.component';
import { ApplicationsComponent } from './applications/applications.component';
import { SupervisorsComponent } from './supervisors/supervisors.component';
import { HistoryComponent } from './history/history.component';
import { SettingsComponent } from './settings/settings.component';
import { ProfileComponent } from './profile/profile.component';

export const backofficeRoutes: Routes = [
    {
        path: '',
        component: BackofficeLayoutComponent,
        children: [
            { path: 'dashboard', component: DashboardComponent },
            { path: 'subjects', component: SubjectsComponent },
            { path: 'catalog', component: CatalogComponent },
            { path: 'applications', component: ApplicationsComponent },
            { path: 'equipes-recherche', component: EquipesRechercheComponent },
            { path: 'supervisors', component: SupervisorsComponent },
            { path: 'users', component: UsersComponent },
            { path: 'history', component: HistoryComponent },
            { path: 'settings', component: SettingsComponent },
            { path: 'profile', component: ProfileComponent },
            { path: '', redirectTo: 'dashboard', pathMatch: 'full' }
        ]
    }
];
