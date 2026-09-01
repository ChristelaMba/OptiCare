import { ApplicationConfig, LOCALE_ID, provideBrowserGlobalErrorListeners } from '@angular/core';
import { provideRouter } from '@angular/router';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { registerLocaleData } from '@angular/common';
import localeFr from '@angular/common/locales/fr';

import { environment } from '../environments/environment';
import { routes } from './app.routes';
import { authInterceptor } from './core/interceptors/auth-interceptor';
import { errorInterceptor } from './core/interceptors/error-interceptor';
import { mockCabinetsInterceptor } from './core/interceptors/mock-cabinets-interceptor';
import { mockUtilisateursInterceptor } from './core/interceptors/mock-utilisateurs-interceptor';
import { mockRendezVousInterceptor } from './core/interceptors/mock-rendezvous-interceptor';
import { mockStatistiquesInterceptor } from './core/interceptors/mock-statistiques-interceptor';
import { mockPriseEnChargeInterceptor } from './core/interceptors/mock-prise-en-charge-interceptor';
import { mockPatientInterceptor } from './core/interceptors/mock-patient-interceptor';
import { mockFicheConsultationInterceptor } from './core/interceptors/mock-fiche-consultation-interceptor';

// OUTIL DE DEV UNIQUEMENT — court-circuite les appels /cabinets,
// /admin/cabinets, /admin/utilisateurs, /rendezvous, /statistiques et
// /prises-en-charge avec des données factices tant que le back-end n'est
// pas branché (cf. core/mocks/*.ts). Jamais actif en prod
// (environment.production === true fait passer chaque intercepteur en
// no-op). À retirer une fois l'API réelle disponible.
const interceptors = environment.production
  ? [authInterceptor, errorInterceptor]
  : [
      mockCabinetsInterceptor,
      mockUtilisateursInterceptor,
      mockRendezVousInterceptor,
      mockStatistiquesInterceptor,
      mockPriseEnChargeInterceptor,
      mockPatientInterceptor,
      mockFicheConsultationInterceptor,
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
