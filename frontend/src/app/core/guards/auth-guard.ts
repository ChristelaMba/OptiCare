import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';

import { Auth } from '../services/auth';

/**
 * Bloque l'accès à une route si aucun utilisateur n'est connecté.
 * Source de vérité unique : le signal `estConnecte` exposé par `auth.ts`.
 */
export const authGuard: CanActivateFn = (_route, state) => {
  const auth = inject(Auth);
  const router = inject(Router);

  if (auth.estConnecte()) {
    return true;
  }

  console.warn('[auth-guard] Accès refusé : aucun utilisateur connecté — redirection vers', state.url);

  return router.createUrlTree(['/auth/connexion'], {
    queryParams: { returnUrl: state.url },
  });
};
