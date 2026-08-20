import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';

import { Auth } from '../services/auth';
import { RoleUtilisateur } from '../../models/utilisateur.model';

/**
 * Bloque l'accès à une route si le rôle de l'utilisateur connecté ne
 * correspond pas à celui attendu (route.data['role']).
 * Suppose normalement que authGuard s'est déjà exécuté avant (utilisateur
 * connecté), mais reste défensif si ce n'est pas le cas : un rôle `null`
 * (non connecté) renvoie vers la connexion, pas vers /acces-refuse — ce
 * dernier est réservé au cas "connecté mais mauvais rôle".
 * Source de vérité unique : le signal `role` exposé par `auth.ts`.
 */
export const roleGuard: CanActivateFn = (route, state) => {
  const auth = inject(Auth);
  const router = inject(Router);

  const roleAttendu = route.data['role'] as RoleUtilisateur | undefined;
  const roleActuel = auth.role();

  if (!roleAttendu || roleActuel === roleAttendu) {
    return true;
  }

  if (roleActuel === null) {
    console.warn(
      '[role-guard] Accès refusé : aucun utilisateur connecté (rôle requis =',
      roleAttendu,
      ') — redirection vers la connexion',
    );
    return router.createUrlTree(['/auth/connexion'], {
      queryParams: { returnUrl: state.url },
    });
  }

  console.warn('[role-guard] Accès refusé : rôle requis =', roleAttendu, '— rôle actuel =', roleActuel);

  return router.createUrlTree(['/acces-refuse']);
};
