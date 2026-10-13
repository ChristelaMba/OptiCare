import { Routes } from '@angular/router';

export const OPTICIEN_ROUTES: Routes = [

  {
    path: '',

    loadComponent: () =>
      import('./opticien-layout/opticien-layout')
        .then(m => m.OpticienLayout),

    children: [

      // =====================================================
      // PAGE PAR DÉFAUT
      // =====================================================

      {
        path: '',
        redirectTo: 'dossier-visuel-patient/dv1',
        pathMatch: 'full'
      },

      // =====================================================
      // DOSSIER VISUEL DU PATIENT
      // =====================================================

      {
        path: 'dossier-visuel-patient',

        loadComponent: () =>
          import('./dossier-visuel-patient/dossier-visuel-patient')
            .then(m => m.DossierVisuelPatient)
      },

      // =====================================================
      // NOUVELLE FICHE DE CONSULTATION
      // =====================================================

      {
        path: 'nouvelle-fiche-consultation',

        loadComponent: () =>
          import('./nouvelle-fiche-consultation/nouvelle-fiche-consultation')
            .then(m => m.NouvelleFicheConsultation)
      },

      // =====================================================
      // SUIVI DE COMMANDE
      // =====================================================

      {
        path: 'suivi-commande',

        loadComponent: () =>
          import('./suivi-commande/suivi-commande')
            .then(m => m.SuiviCommande)
      },

      // =====================================================
      // FACTURE & ORDONNANCE
      // =====================================================

      {
        path: 'facture-ordonnance',

        loadComponent: () =>
          import('./facture-ordonnance/facture-ordonnance')
            .then(m => m.FactureOrdonnance)
      },
       {
        path: 'mes-patients',

        loadComponent: () =>
          import('./mes-patients/mes-patients')
            .then(m => m.MesPatients)
      }

    ]
  }

];