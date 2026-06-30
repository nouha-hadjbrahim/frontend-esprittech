import { provideHttpClient, withInterceptors } from '@angular/common/http';
import {
  ApplicationConfig,
  provideAppInitializer,
  provideZoneChangeDetection,
  inject,
} from '@angular/core';
import { provideRouter } from '@angular/router';
import { provideAnimations } from '@angular/platform-browser/animations';

import { authInterceptor } from './core/interceptors/auth.interceptor';
import { csrfInterceptor } from './core/interceptors/csrf.interceptor';
import { AuthService } from './core/services/auth.service';
import { routes } from './app.routes';

export const appConfig: ApplicationConfig = {
  providers: [
    provideZoneChangeDetection({ eventCoalescing: true }),
    provideRouter(routes),
    provideHttpClient(
      withInterceptors([authInterceptor, csrfInterceptor]),
    ),
    provideAnimations(),
    // Au démarrage, tente de restaurer la session via le cookie HttpOnly (/auth/me).
    // Les gardes de route s'appuient ensuite sur l'utilisateur en mémoire.
    provideAppInitializer(() => inject(AuthService).restoreSession()),
  ],
};
