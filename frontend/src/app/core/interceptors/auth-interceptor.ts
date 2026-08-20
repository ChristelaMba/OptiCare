import { inject } from '@angular/core';
import { HttpInterceptorFn } from '@angular/common/http';

import { Auth } from '../services/auth';

// Routes publiques : jamais de token attaché, même si une session existe déjà.
const SEGMENTS_PUBLICS = ['/auth/login', '/auth/register'];

/**
 * Attache `Authorization: Bearer {token}` à chaque requête sortante,
 * sauf vers les routes publiques d'authentification.
 * Source de vérité unique : le signal `token` exposé par `auth.ts`.
 */
export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const auth = inject(Auth);
  const token = auth.token();

  const estRoutePublique = SEGMENTS_PUBLICS.some((segment) => req.url.includes(segment));

  if (!token || estRoutePublique) {
    return next(req);
  }

  const requeteAuthentifiee = req.clone({
    setHeaders: { Authorization: `Bearer ${token}` },
  });

  return next(requeteAuthentifiee);
};
