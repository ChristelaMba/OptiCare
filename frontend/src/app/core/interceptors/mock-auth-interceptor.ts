import { HttpErrorResponse, HttpInterceptorFn, HttpResponse } from '@angular/common/http';
import { delay, Observable, of, throwError } from 'rxjs';

import { environment } from '../../../environments/environment';
import { utilisateursFactices } from '../mocks/auth-mock-data';
import {
  AuthResponse,
  ConnexionPayload,
  InscriptionCabinetPayload,
  InscriptionPatientPayload,
} from '../../models/auth.model';
import { Utilisateur } from '../../models/utilisateur.model';

const BASE_URL = environment.apiUrl.replace(/\/$/, '');
const LATENCE_MS = 400;

function reponse<T>(body: T, status = 200): Observable<HttpResponse<T>> {
  return of(new HttpResponse({ body, status })).pipe(delay(LATENCE_MS));
}
function erreurIdentifiantsIncorrects(url: string): Observable<never> {
  return throwError(
    () =>
      new HttpErrorResponse({
        status: 401,
        url,
        error: {
          status: 'error',
          message: 'Erreur de connexion',
          errors: { telephone: ['Les identifiants sont incorrects.'] },
        },
      }),
  ).pipe(delay(LATENCE_MS));
}
export const mockAuthInterceptor: HttpInterceptorFn = (req, next) => {
  if (environment.production || !req.url.startsWith(BASE_URL)) {
    return next(req);
  }
  if (req.method === 'POST' && req.url === `${BASE_URL}/auth/login`) {
    const payload = req.body as ConnexionPayload;
    const utilisateur = utilisateursFactices.find((u) => u.telephone === payload.telephone);

    if (!utilisateur || utilisateur.motDePasse !== payload.password) {
      return erreurIdentifiantsIncorrects(req.url);
    }

    const { motDePasse, ...utilisateurSansMotDePasse } = utilisateur;
    const corps: AuthResponse = {
      token: `mock-token-${utilisateur.id}`,
      utilisateur: utilisateurSansMotDePasse,
    };
    return reponse(corps);
  }
  if (req.method === 'POST' && req.url === `${BASE_URL}/auth/register/patient`) {
    const payload = req.body as InscriptionPatientPayload;
    const nouveau: Utilisateur = {
      id: `user-${Date.now()}`,
      role: 'patient',
      nom: payload.nom,
      prenom: payload.prenom,
      email: payload.email,
      telephone: payload.telephone,
      ville: payload.ville,
      actif: true,
      dateCreation: new Date(),
    };
    utilisateursFactices.push({ ...nouveau, motDePasse: payload.password });

    const corps: AuthResponse = { token: `mock-token-${nouveau.id}`, utilisateur: nouveau };
    return reponse(corps, 201);
  }
  if (req.method === 'POST' && req.url === `${BASE_URL}/auth/register/cabinet`) {
    const payload = req.body as InscriptionCabinetPayload;
    const nouveau: Utilisateur = {
      id: `user-${Date.now()}`,
      role: 'proprietaire',
      nom: payload.nom,
      prenom: payload.prenom,
      email: payload.email,
      telephone: payload.telephone,
      ville: payload.ville,
      actif: true,
      dateCreation: new Date(),
    };

    utilisateursFactices.push({ ...nouveau, motDePasse: payload.password });

    const corps: AuthResponse = { token: `mock-token-${nouveau.id}`, utilisateur: nouveau };
    return reponse(corps, 201);
  }

  return next(req);
};
