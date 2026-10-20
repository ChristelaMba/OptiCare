import { ApplicationConfig, LOCALE_ID, isDevMode, provideBrowserGlobalErrorListeners } from '@angular/core';
import { provideRouter } from '@angular/router';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { registerLocaleData } from '@angular/common';
import localeFr from '@angular/common/locales/fr';
import { provideServiceWorker } from '@angular/service-worker';

import { routes } from './app.routes';
import { authInterceptor } from './core/interceptors/auth-interceptor';
import { errorInterceptor } from './core/interceptors/error-interceptor';

// 20/10/2026 : plus aucun intercepteur mock — tous les écrans tapent l'API réelle (le dernier, `mockStatistiquesInterceptor`,
// a disparu avec le branchement du tableau de bord du propriétaire sur `GET /cabinets/{id}/statistiques`).
const interceptors = [authInterceptor, errorInterceptor];

// Toute l'app est en français (Cameroun) : dates et nombres doivent suivre
// ce format par défaut, pas l'anglais US implicite d'Angular. Sans ceci,
// `date` s'affichait avec des mois en anglais (« Aug » au lieu d'« août »)
// et tout DecimalPipe/CurrencyPipe appelé avec un argument de locale
// explicite plante avec NG0701.
registerLocaleData(localeFr);

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    { provide: LOCALE_ID, useValue: 'fr' },
    provideRouter(routes),
    provideHttpClient(withInterceptors(interceptors)),
    provideServiceWorker('ngsw-worker.js', {
      enabled: !isDevMode(),
      registrationStrategy: 'registerWhenStable:30000'
    })
  ]
};