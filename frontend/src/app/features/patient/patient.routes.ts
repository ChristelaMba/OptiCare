import { Routes } from '@angular/router';
import { PriseRdv } from '../public/prise-rdv/prise-rdv';

export const PATIENT_ROUTES: Routes = [

  {
    path: '',

    loadComponent: () =>
      import('./patient-layout/patient-layout')
        .then(m => m.PatientLayout),

    children: [

      {
        path: '',
        redirectTo: 'dossier-visuel',
        pathMatch: 'full'
      },


      {
        path: 'dossier-visuel',

        loadComponent: () =>
          import('./dossier-visuel/dossier-visuel')
            .then(m => m.DossierVisuel)
      },


      {
        path: 'rendez-vous',

        loadComponent: () =>
          import('./mes-rendez-vous/mes-rendez-vous')
            .then(m => m.MesRendezVous)
      },


      {
        path: 'completer-dossier-visuel',

        loadComponent: () =>
          import('./completer-dossier-visuel/completer-dossier-visuel')
            .then(m => m.CompleterDossierVisuel)
      },


      {
        path: 'notifications',

        loadComponent: () =>
          import('./mes-notifications/mes-notifications')
            .then(m => m.MesNotifications)
      },


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
    component: PriseRdv
  }

];