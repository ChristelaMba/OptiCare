import { HttpErrorResponse, HttpInterceptorFn, HttpResponse } from '@angular/common/http';
import { delay, Observable, of, throwError } from 'rxjs';

import { environment } from '../../../environments/environment';
import { Cabinet } from '../../models/cabinet.model';
import { cabinetsFactices } from '../mocks/cabinets-mock-data';
import { CreerCabinetPayload } from '../services/cabinet';

// Doit rester identique au BASE_URL calculé dans core/services/cabinet.ts.
const BASE_URL = environment.apiUrl.replace(/\/$/, '');

/** Simule la latence réseau pour que les états de chargement des écrans restent visibles. */
const LATENCE_MS = 400;

function reponse<T>(body: T, status = 200): Observable<HttpResponse<T>> {
  return of(new HttpResponse({ body, status })).pipe(delay(LATENCE_MS));
}

function erreur404(url: string): Observable<never> {
  return throwError(() => new HttpErrorResponse({ status: 404, url, error: { message: 'Cabinet introuvable' } })).pipe(
    delay(LATENCE_MS),
  );
}

/**
 * OUTIL DE DEV UNIQUEMENT — court-circuite les appels vers `/cabinets` et
 * `/admin/cabinets` avec le jeu de données de `cabinets-mock-data.ts`, tant
 * que le back-end n'est pas branché. Actif seulement en environnement de
 * développement (voir enregistrement conditionnel dans `app.config.ts`).
 * Mute `cabinetsFactices` en mémoire pour que créer/valider/rejeter se
 * comportent comme un vrai backend le temps d'une session.
 * À retirer une fois l'API réelle disponible.
 */
export const mockCabinetsInterceptor: HttpInterceptorFn = (req, next) => {
  if (environment.production || !req.url.startsWith(BASE_URL)) {
    return next(req);
  }

  const segmentApres = (prefixe: string): string | null =>
    req.url.startsWith(prefixe) ? req.url.slice(prefixe.length) : null;

  // GET /admin/cabinets — tous les cabinets (Super Admin).
  if (req.method === 'GET' && req.url === `${BASE_URL}/admin/cabinets`) {
    return reponse(cabinetsFactices);
  }

  // PATCH /cabinets/{id}/valider
  const idValider = segmentApres(`${BASE_URL}/cabinets/`)?.match(/^([^/]+)\/valider$/)?.[1];
  if (req.method === 'PATCH' && idValider) {
    const cabinet = cabinetsFactices.find((c) => c.id === idValider);
    if (!cabinet) return erreur404(req.url);
    cabinet.statutValidation = 'valide';
    return reponse(cabinet);
  }

  // PATCH /cabinets/{id}/rejeter
  const idRejeter = segmentApres(`${BASE_URL}/cabinets/`)?.match(/^([^/]+)\/rejeter$/)?.[1];
  if (req.method === 'PATCH' && idRejeter) {
    const cabinet = cabinetsFactices.find((c) => c.id === idRejeter);
    if (!cabinet) return erreur404(req.url);
    cabinet.statutValidation = 'rejete';
    return reponse(cabinet);
  }

  // PATCH /cabinets/{id}/completer-profil
  const idCompleter = segmentApres(`${BASE_URL}/cabinets/`)?.match(/^([^/]+)\/completer-profil$/)?.[1];
  if (req.method === 'PATCH' && idCompleter) {
    const cabinet = cabinetsFactices.find((c) => c.id === idCompleter);
    if (!cabinet) return erreur404(req.url);
    Object.assign(cabinet, req.body, { statutValidation: 'enAttente' as const });
    return reponse(cabinet);
  }

  // PATCH /cabinets/{id} — édition continue depuis vitrine-edition. Distinct de
  // /completer-profil ci-dessus : ne touche PAS statutValidation.
  const idModifier = req.method === 'PATCH' ? segmentApres(`${BASE_URL}/cabinets/`)?.match(/^([^/]+)$/)?.[1] : null;
  if (req.method === 'PATCH' && idModifier) {
    const cabinet = cabinetsFactices.find((c) => c.id === idModifier);
    if (!cabinet) return erreur404(req.url);
    Object.assign(cabinet, req.body);
    return reponse(cabinet);
  }

  // GET /cabinets/{id}
  const idDetail = segmentApres(`${BASE_URL}/cabinets/`)?.match(/^([^/]+)$/)?.[1];
  if (req.method === 'GET' && idDetail) {
    const cabinet = cabinetsFactices.find((c) => c.id === idDetail);
    return cabinet ? reponse(cabinet) : erreur404(req.url);
  }

  // GET /cabinets — vitrine publique, cabinets validés uniquement.
  if (req.method === 'GET' && req.url === `${BASE_URL}/cabinets`) {
    return reponse(cabinetsFactices.filter((c) => c.statutValidation === 'valide'));
  }

  // POST /cabinets — création (statut initial : profil incomplet).
  if (req.method === 'POST' && req.url === `${BASE_URL}/cabinets`) {
    const nouveauCabinet: Cabinet = {
      id: `cab-dev-${Date.now()}`,
      logoUrl: '',
      photos: [],
      liensExternes: {},
      horaires: [],
      statutValidation: 'profilIncomplet',
      abonnementPremium: false,
      noteMoyenne: 0,
      qrCodeUrl: '',
      proprietaireId: 'dev-proprietaire',
      dateInscription: new Date(),
      ...(req.body as CreerCabinetPayload),
    };
    cabinetsFactices.push(nouveauCabinet);
    return reponse(nouveauCabinet, 201);
  }

  return next(req);
};
