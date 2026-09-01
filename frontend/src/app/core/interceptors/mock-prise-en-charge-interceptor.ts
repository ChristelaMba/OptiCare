import { HttpErrorResponse, HttpInterceptorFn, HttpResponse } from '@angular/common/http';
import { delay, Observable, of, throwError } from 'rxjs';

import { environment } from '../../../environments/environment';
import { prisesEnChargeFactices } from '../mocks/prise-en-charge-mock-data';
import { PriseEnCharge } from '../../models/prise-en-charge.model';

const BASE_URL = environment.apiUrl.replace(/\/$/, '');
const LATENCE_MS = 400;

function reponse<T>(body: T, status = 200): Observable<HttpResponse<T>> {
  return of(new HttpResponse({ body, status })).pipe(delay(LATENCE_MS));
}

function erreur404(url: string): Observable<never> {
  return throwError(() => new HttpErrorResponse({ status: 404, url, error: { message: 'Prise en charge introuvable' } })).pipe(
    delay(LATENCE_MS),
  );
}

/**
 * OUTIL DE DEV UNIQUEMENT — court-circuite les appels PriseEnCharge avec un
 * tableau en mémoire (`prise-en-charge-mock-data.ts`). Même fonctionnement
 * que `mock-rendezvous-interceptor.ts`. À retirer une fois l'API réelle
 * disponible. `POST /prise-en-charge` est confirmée au §8 ; GET et PATCH
 * restent des hypothèses non confirmées (voir POINTS-A-CONFIRMER-BACKEND.md,
 * point 0).
 */
export const mockPriseEnChargeInterceptor: HttpInterceptorFn = (req, next) => {
  if (environment.production || !req.url.startsWith(BASE_URL)) {
    return next(req);
  }

  const matchDetail = req.url.match(new RegExp(`^${BASE_URL}/prise-en-charge/([^/]+)$`));

  // POST /prise-en-charge
  if (req.method === 'POST' && req.url === `${BASE_URL}/prise-en-charge`) {
    const nouvelle: PriseEnCharge = {
      id: `pec-${Date.now()}`,
      ...(req.body as Omit<PriseEnCharge, 'id'>),
    };
    prisesEnChargeFactices.push(nouvelle);
    return reponse(nouvelle, 201);
  }

  // GET /prise-en-charge/{id}
  if (req.method === 'GET' && matchDetail) {
    const priseEnCharge = prisesEnChargeFactices.find((p) => p.id === matchDetail[1]);
    if (!priseEnCharge) return erreur404(req.url);
    return reponse(priseEnCharge);
  }

  // PATCH /prise-en-charge/{id}
  if (req.method === 'PATCH' && matchDetail) {
    const priseEnCharge = prisesEnChargeFactices.find((p) => p.id === matchDetail[1]);
    if (!priseEnCharge) return erreur404(req.url);
    Object.assign(priseEnCharge, req.body);
    return reponse(priseEnCharge);
  }

  return next(req);
};
