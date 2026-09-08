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

/**
 * Corps d'erreur identique à celui confirmé en conditions réelles le 04/09
 * (voir le commentaire sur ConnexionPayload, auth.model.ts) : un vrai
 * POST /auth/login avec des identifiants invalides a renvoyé exactement
 * cette forme sur le serveur de Lionel — pas une supposition.
 */
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

/**
 * OUTIL DE DEV UNIQUEMENT — court-circuite /auth/login et /auth/register*
 * avec les comptes factices de `auth-mock-data.ts` (voir ce fichier pour
 * la liste des comptes de test disponibles). Seule route parmi tous les
 * domaines du projet à n'avoir eu aucun mock jusqu'ici (04/09) — ces 3
 * écrans n'avaient jamais été exercés de bout en bout, même en factice.
 * À retirer une fois l'authentification réelle disponible.
 */
export const mockAuthInterceptor: HttpInterceptorFn = (req, next) => {
  if (environment.production || !req.url.startsWith(BASE_URL)) {
    return next(req);
  }

  // POST /auth/login
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

  // POST /auth/register/patient
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

    // Poussé dans la liste factice pour pouvoir se reconnecter avec ce
    // compte tout de suite après, dans la même session de page.
    utilisateursFactices.push({ ...nouveau, motDePasse: payload.password });

    const corps: AuthResponse = { token: `mock-token-${nouveau.id}`, utilisateur: nouveau };
    return reponse(corps, 201);
  }

  // POST /auth/register/cabinet
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
      // Pas de cabinetId : ce mock simule uniquement la création du compte
      // (ce qui est demandé), pas la création d'un Cabinet complet dans
      // cabinets-mock-data.ts. Conséquence connue, pas cachée : l'écran
      // /proprietaire/completer-profil-cabinet vers lequel on redirige
      // ensuite (§6.2) n'aura pas de cabinet réel à compléter tant que ce
      // câblage plus large n'est pas fait séparément.
    };

    utilisateursFactices.push({ ...nouveau, motDePasse: payload.password });

    const corps: AuthResponse = { token: `mock-token-${nouveau.id}`, utilisateur: nouveau };
    return reponse(corps, 201);
  }

  return next(req);
};
