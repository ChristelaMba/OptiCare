import { Routes } from '@angular/router';
import { PriseRdv } from '../public/prise-rdv/prise-rdv';

export const PATIENT_ROUTES: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./patient-layout/patient-layout')
        .then(m => m.PatientLayout),
        

    children: [

      // /patient
      {
        path: '',
        redirectTo: 'dossier-visuel',
        pathMatch: 'full'
      },

      // /patient/dossier-visuel
      {
        path: 'dossier-visuel',
        loadComponent: () =>
          import('./dossier-visuel/dossier-visuel')
            .then(m => m.DossierVisuel)
      },

      // /patient/rendez-vous
      {
        path: 'rendez-vous',
        loadComponent: () =>
          import('./mes-rendez-vous/mes-rendez-vous')
            .then(m => m.MesRendezVous)
      },

      // /patient/completer-dossier-visuel
      {
        path: 'completer-dossier-visuel',
        loadComponent: () =>
          import('./completer-dossier-visuel/completer-dossier-visuel')
            .then(m => m.CompleterDossierVisuel)
      },

      // /patient/mes-notifications
      {
        path: 'notifications',
        loadComponent: () =>
          import('./mes-notifications/mes-notifications')
            .then(m => m.MesNotifications)
      },

      // /patient/mes-avis
      {
        path: 'mes-avis',
        loadComponent: () =>
          import('./mes-avis/mes-avis')
            .then(m => m.MesAvis)
      }
     

    ]
  },
  {
        path: 'prise-rdv',
        component:PriseRdv,
      }
];