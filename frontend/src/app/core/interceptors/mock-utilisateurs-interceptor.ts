import { HttpErrorResponse, HttpInterceptorFn, HttpResponse } from '@angular/common/http';
import { delay, Observable, of, throwError } from 'rxjs';

import { environment } from '../../../environments/environment';
import { Utilisateur } from '../../models/utilisateur.model';
import { utilisateursFactices } from '../mocks/utilisateurs-mock-data';
import { CreerPersonnelPayload } from '../services/utilisateur';

const BASE_URL = environment.apiUrl.replace(/\/$/, '');
const LATENCE_MS = 400;

function reponse<T>(body: T, status = 200): Observable<HttpResponse<T>> {
  return of(new HttpResponse({ body, status })).pipe(delay(LATENCE_MS));
}

function erreur404(url: string): Observable<never> {
  return throwError(() => new HttpErrorResponse({ status: 404, url, error: { message: 'Utilisateur introuvable' } })).pipe(
    delay(LATENCE_MS),
  );
}

/**
 * OUTIL DE DEV UNIQUEMENT — court-circuite les appels liés aux comptes
 * (employés d'un cabinet + gestion globale Super Admin) avec le jeu de
 * données de `utilisateurs-mock-data.ts`. Même fonctionnement que
 * `mock-cabinets-interceptor.ts`. À retirer une fois l'API réelle
 * disponible.
 */
export const mockUtilisateursInterceptor: HttpInterceptorFn = (req, next) => {
  if (environment.production || !req.url.startsWith(BASE_URL)) {
    return next(req);
  }

  // GET /admin/utilisateurs — tous les comptes (Super Admin).
  if (req.method === 'GET' && req.url === `${BASE_URL}/admin/utilisateurs`) {
    return reponse(utilisateursFactices);
  }

  // PATCH /admin/utilisateurs/{id}/activer|desactiver
  const matchStatut = req.url.match(new RegExp(`^${BASE_URL}/admin/utilisateurs/([^/]+)/(activer|desactiver)$`));
  if (req.method === 'PATCH' && matchStatut) {
    const [, id, action] = matchStatut;
    const utilisateur = utilisateursFactices.find((u) => u.id === id);
    if (!utilisateur) return erreur404(req.url);
    utilisateur.actif = action === 'activer';
    return reponse(utilisateur);
  }

  // POST /admin/utilisateurs/{id}/reinitialiser-mot-de-passe — pas d'effet en mock, juste un 200.
  const matchReinit = req.url.match(new RegExp(`^${BASE_URL}/admin/utilisateurs/([^/]+)/reinitialiser-mot-de-passe$`));
  if (req.method === 'POST' && matchReinit) {
    const utilisateur = utilisateursFactices.find((u) => u.id === matchReinit[1]);
    if (!utilisateur) return erreur404(req.url);
    return reponse(undefined);
  }

  // GET /cabinets/{id}/personnel — employés (Opticien/Secretaire) d'un cabinet.
  const matchListerPersonnel = req.url.match(new RegExp(`^${BASE_URL}/cabinets/([^/]+)/personnel$`));
  if (req.method === 'GET' && matchListerPersonnel) {
    const cabinetId = matchListerPersonnel[1];
    return reponse(
      utilisateursFactices.filter((u) => u.cabinetId === cabinetId && (u.role === 'Opticien' || u.role === 'Secretaire')),
    );
  }

  // POST /cabinets/{id}/personnel — création d'un compte Opticien/Secretaire.
  if (req.method === 'POST' && matchListerPersonnel) {
    const cabinetId = matchListerPersonnel[1];
    const payload = req.body as CreerPersonnelPayload;
    const nouvelUtilisateur: Utilisateur = {
      id: `user-dev-${Date.now()}`,
      cabinetId,
      actif: true,
      dateCreation: new Date(),
      ...payload,
    };
    utilisateursFactices.push(nouvelUtilisateur);
    return reponse(nouvelUtilisateur, 201);
  }

  return next(req);
};
