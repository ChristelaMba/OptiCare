import { ApplicationConfig, LOCALE_ID, provideBrowserGlobalErrorListeners } from '@angular/core';
import { provideRouter } from '@angular/router';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { registerLocaleData } from '@angular/common';
import localeFr from '@angular/common/locales/fr';

import { environment } from '../environments/environment';
import { routes } from './app.routes';
import { authInterceptor } from './core/interceptors/auth-interceptor';
import { errorInterceptor } from './core/interceptors/error-interceptor';
import { mockUtilisateursInterceptor } from './core/interceptors/mock-utilisateurs-interceptor';
import { mockRendezVousInterceptor } from './core/interceptors/mock-rendezvous-interceptor';
import { mockStatistiquesInterceptor } from './core/interceptors/mock-statistiques-interceptor';
import { mockPriseEnChargeInterceptor } from './core/interceptors/mock-prise-en-charge-interceptor';
import { mockPatientInterceptor } from './core/interceptors/mock-patient-interceptor';
import { mockFicheConsultationInterceptor } from './core/interceptors/mock-fiche-consultation-interceptor';
import { mockCommandeInterceptor } from './core/interceptors/mock-commande-interceptor';

// OUTIL DE DEV UNIQUEMENT — court-circuite les appels encore sans route
// back-end confirmée (/admin/utilisateurs, /statistiques, /prises-en-charge,
// /commandes, /consultations, /patients, et la majeure partie du domaine
// rendez-vous — voir POINTS-A-CONFIRMER-BACKEND.md) avec des données
// factices (cf. core/mocks/*.ts). Jamais actif en prod
// (environment.production === true fait passer chaque intercepteur en no-op).
//
// 2026-09-07 : `mockAuthInterceptor` retiré — `/auth/login` et
// `/auth/register/{patient,cabinet}` tapent maintenant la vraie API
// (testé, voir JOURNAL-MODIFICATIONS-PARTAGEES.md, entrée du 07/09).
//
// 2026-09-11 : `mockCabinetsInterceptor` retiré à son tour — liste publique,
// détail, mise à jour de profil, liste admin, valider/refuser tapent
// maintenant la vraie API (routes confirmées et testées ce jour-là, voir
// JOURNAL-MODIFICATIONS-PARTAGEES.md).
//
// 2026-09-11 (suite) : `mockRendezVousInterceptor` reste actif, mais
// PARTIELLEMENT contourné — `RendezVousService.listerCreneaux()` et
// `.getMesRendezVous()` appellent désormais les vraies routes
// (`GET /cabinets/{id}/slots`, `GET /patients/{id}/rdv`, confirmées
// fonctionnelles) et ne passent donc plus par ce mock (URLs différentes).
// Le reste (créer un RDV, confirmer/terminer/annuler/non-honore/modifier,
// lister par cabinet — utilisé par `agenda`/`historique-rdv`) reste
// entièrement mocké : leurs routes réelles renvoient `500` (même bug de
// middleware que Cabinets) ou n'ont jamais été testées en écriture réelle.
// Voir POINTS-A-CONFIRMER-BACKEND.md §12.
const interceptors = environment.production
  ? [authInterceptor, errorInterceptor]
  : [
      mockUtilisateursInterceptor,
      mockRendezVousInterceptor,
      mockStatistiquesInterceptor,
      mockPriseEnChargeInterceptor,
      mockPatientInterceptor,
      mockFicheConsultationInterceptor,
      mockCommandeInterceptor,
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
