import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';

import { Auth } from '../services/auth';
import { RoleUtilisateur } from '../../models/utilisateur.model';
export const roleGuard: CanActivateFn = (route, state) => {
  const auth = inject(Auth);
  const router = inject(Router);
  const roleAttendu: RoleUtilisateur | undefined = route.data['role'];
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
