import { inject } from '@angular/core';
import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { Router } from '@angular/router';
import { catchError, throwError } from 'rxjs';

import { Auth } from '../services/auth';

/**
 * Gestion centralisée des erreurs API : sur une réponse 401 (token invalide
 * ou expiré), déconnecte l'utilisateur et le renvoie vers la connexion.
 * Source de vérité unique : `auth.logout()` dans `auth.ts`.
 */
export const errorInterceptor: HttpInterceptorFn = (req, next) => {
  const auth = inject(Auth);
  const router = inject(Router);

  return next(req).pipe(
    catchError((erreur: HttpErrorResponse) => {
      if (erreur.status === 401 && auth.estConnecte()) {
        console.warn('[error-interceptor] 401 reçu sur', req.url, '→ déconnexion automatique');
        auth.logout();
        router.navigateByUrl('/auth/connexion');
      }
      return throwError(() => erreur);
    }),
  );
};
