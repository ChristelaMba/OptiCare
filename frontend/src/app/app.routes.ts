import { Routes } from '@angular/router';

import { authGuard } from './core/guards/auth-guard';
import { roleGuard } from './core/guards/role-guard';
import { environment } from '../environments/environment';

// OUTIL DE DEV UNIQUEMENT — permet de simuler une session pour n'importe quel
// rôle sans backend réel. Exclue du tableau de routes en production, même
// convention que les intercepteurs mock dans app.config.ts : `environment`
// est un objet importé (pas une constante inlinée par le bundler), donc ce
// ternaire est évalué à l'exécution dans le navigateur, pas éliminé à la
// compilation. Vérifié sur un vrai `ng build` (pas --configuration
// development) : le chunk `connexion-simulee` (lazy, via loadComponent) est
// bien généré dans dist/ — Angular ne peut pas éliminer statiquement un
// import() dynamique conditionné par une valeur runtime — mais avec
// `environment.production === true` ce tableau vaut `[]`, donc la route
// `dev/connexion-simulee` n'est jamais enregistrée, et le chunk n'est donc
// jamais demandé au navigateur : testé en servant le build prod et en
// naviguant directement sur l'URL → redirection vers `''` (route
// catch-all), aucune requête réseau vers ce chunk. À retirer une fois
// l'authentification réelle branchée.
const routesDev: Routes = environment.production
  ? []
  : [
      {
        path: 'dev/connexion-simulee',
        loadComponent: () =>
          import('./features/dev/connexion-simulee/connexion-simulee')
            .then(m => m.ConnexionSimulee),
      },
    ];

export const routes: Routes = [

  // =====================================================
  // ESPACE PUBLIC
  // =====================================================

  {
    path: '',

    loadChildren: () =>
      import('./features/public/public.routes')
        .then(m => m.PUBLIC_ROUTES)
  },


  // =====================================================
  // AUTHENTIFICATION
  // =====================================================

  {
    path: 'auth',

    loadChildren: () =>
      import('./features/auth/auth.routes')
        .then(m => m.AUTH_ROUTES)
  },


  // =====================================================
  // OUTIL DE DEV — voir routesDev ci-dessus
  // =====================================================

  ...routesDev,


  // =====================================================
  // ESPACE PATIENT
  // =====================================================

  {
    path: 'patient',

    canActivate: [
      authGuard,
      roleGuard
    ],

    data: {
      role: 'Patient'
    },

    loadChildren: () =>
      import('./features/patient/patient.routes')
        .then(m => m.PATIENT_ROUTES)
  },


  // =====================================================
  // ESPACE SECRÉTAIRE
  // =====================================================

  {
    path: 'secretaire',

    canActivate: [
      authGuard,
      roleGuard
    ],

    data: {
      role: 'Secretaire'
    },

    loadChildren: () =>
      import('./features/secretaire/secretaire.routes')
        .then(m => m.SECRETAIRE_ROUTES)
  },


  // =====================================================
  // ESPACE OPTICIEN
  // =====================================================

  {
    path: 'opticien',

    canActivate: [
      authGuard,
      roleGuard
    ],

    data: {
      role: 'Opticien'
    },

    loadChildren: () =>
      import('./features/opticien/opticien.routes')
        .then(m => m.OPTICIEN_ROUTES)
  },


  // =====================================================
  // ESPACE PROPRIÉTAIRE
  // =====================================================

  {
    path: 'proprietaire',

    canActivate: [
      authGuard,
      roleGuard
    ],

    data: {
      role: 'Proprietaire'
    },

    loadChildren: () =>
      import('./features/proprietaire/proprietaire.routes')
        .then(m => m.PROPRIETAIRE_ROUTES)
  },


  // =====================================================
  // SUPER ADMIN
  // =====================================================

  {
    path: 'super-admin',

    canActivate: [
      authGuard,
      roleGuard
    ],

    data: {
      role: 'SuperAdmin'
    },

    loadChildren: () =>
      import('./features/super-admin/super-admin.routes')
        .then(m => m.SUPER_ADMIN_ROUTES)
  },


  // =====================================================
  // ROUTE INCONNUE
  // =====================================================

  {
    path: '**',
    redirectTo: ''
  }
];