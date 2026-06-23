import { Routes } from '@angular/router';
import { SignInComponent } from './sign-in/sign-in.component';
import { SignUpComponent } from './sign-up/sign-up.component';

import { backofficeRoutes } from './backoffice/backoffice.routes';
import { authGuard } from './core/guards/auth.guard';

import { frontofficeRoutes } from './frontoffice/frontoffice.routes';

export const routes: Routes = [
    { path: '', redirectTo: 'sign-in', pathMatch: 'full' },
    { path: 'sign-in', component: SignInComponent },
    { path: 'sign-up', component: SignUpComponent },
    { path: 'frontoffice', canActivate: [authGuard], children: frontofficeRoutes },
    { path: 'backoffice', canActivate: [authGuard], children: backofficeRoutes },
    { path: '**', redirectTo: 'sign-in' }
];
