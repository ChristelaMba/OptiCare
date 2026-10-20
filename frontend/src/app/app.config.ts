import { ApplicationConfig, LOCALE_ID, provideBrowserGlobalErrorListeners } from '@angular/core';
import { provideRouter } from '@angular/router';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { registerLocaleData } from '@angular/common';
import localeFr from '@angular/common/locales/fr';

import { environment } from '../environments/environment';
import { routes } from './app.routes';
import { authInterceptor } from './core/interceptors/auth-interceptor';
import { errorInterceptor } from './core/interceptors/error-interceptor';
import { mockStatistiquesInterceptor } from './core/interceptors/mock-statistiques-interceptor';

// OUTIL DE DEV UNIQUEMENT (jamais actif en prod : `environment.production === true` retire tout intercepteur mock).
// Seul mock encore enregistré (20/10/2026) : `mockStatistiquesInterceptor`, pour `GET /cabinets/{id}/statistiques`
// (tableau de bord du comptable, écran du propriétaire hors périmètre des derniers lots). Tous les autres mocks
// (auth, cabinets, utilisateurs, rendez-vous, patients, consultations, prises en charge, commandes) ont été supprimés :
// leurs écrans tapent l'API réelle. Voir Docs/JOURNAL-MODIFICATIONS.md.
const interceptors = environment.production
  ? [authInterceptor, errorInterceptor]
  : [
      mockStatistiquesInterceptor,
      authInterceptor,
      errorInterceptor,
    ];

// Toute l'app est en français (Cameroun) : dates et nombres doivent suivre
// ce format par défaut, pas l'anglais US implicite d'Angular. Sans ceci,
// `date` s'affichait avec des mois en anglais (« Aug » au lieu d'« août »)
// et tout DecimalPipe/CurrencyPipe appelé avec un argument de locale
// explicite (ex. dashboard-comptable) plante avec NG0701.
registerLocaleData(localeFr);

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    { provide: LOCALE_ID, useValue: 'fr' },
    provideRouter(routes),
    provideHttpClient(withInterceptors(interceptors))
  ]
};
