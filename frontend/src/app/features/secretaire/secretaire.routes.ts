import { Routes } from '@angular/router';

export const SECRETAIRE_ROUTES: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./secretaire-layout/secretaire-layout')
        .then(m => m.SecretaireLayout),

    children: [

      {
        path: '',
        redirectTo: 'agenda',
        pathMatch: 'full'
      },

      {
        path: 'agenda',
        loadComponent: () =>
          import('./agenda/agenda')
            .then(m => m.Agenda)
      },

      {
        path: 'enregistrement-patient',
        loadComponent: () =>
          import('./enregistrement-patient/enregistrement-patient')
            .then(m => m.EnregistrementPatient)
      }

    ]
  }
];