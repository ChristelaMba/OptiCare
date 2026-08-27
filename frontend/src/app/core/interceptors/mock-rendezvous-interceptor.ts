import { HttpErrorResponse, HttpInterceptorFn, HttpResponse } from '@angular/common/http';
import { delay, Observable, of, throwError } from 'rxjs';

import { environment } from '../../../environments/environment';
import { rendezVousFactices } from '../mocks/rendez-vous-mock-data';

const BASE_URL = environment.apiUrl.replace(/\/$/, '');
const LATENCE_MS = 400;

function reponse<T>(body: T, status = 200): Observable<HttpResponse<T>> {
  return of(new HttpResponse({ body, status })).pipe(delay(LATENCE_MS));
}

function erreur404(url: string): Observable<never> {
  return throwError(() => new HttpErrorResponse({ status: 404, url, error: { message: 'Rendez-vous introuvable' } })).pipe(
    delay(LATENCE_MS),
  );
}

/**
 * OUTIL DE DEV UNIQUEMENT — court-circuite les appels rendez-vous avec le
 * jeu de données de `rendez-vous-mock-data.ts`. Même fonctionnement que
 * `mock-cabinets-interceptor.ts`. À retirer une fois l'API réelle
 * disponible.
 */
export const mockRendezVousInterceptor: HttpInterceptorFn = (req, next) => {
  if (environment.production || !req.url.startsWith(BASE_URL)) {
    return next(req);
  }

  // GET /cabinets/{id}/rendezvous
  const matchListerParCabinet = req.url.match(new RegExp(`^${BASE_URL}/cabinets/([^/]+)/rendezvous$`));
  if (req.method === 'GET' && matchListerParCabinet) {
    const cabinetId = matchListerParCabinet[1];
    return reponse(rendezVousFactices.filter((rdv) => rdv.cabinetId === cabinetId));
  }

  // PATCH /rendezvous/{id}
  const matchDetail = req.url.match(new RegExp(`^${BASE_URL}/rendezvous/([^/]+)$`));
  if (req.method === 'PATCH' && matchDetail) {
    const rdv = rendezVousFactices.find((r) => r.id === matchDetail[1]);
    if (!rdv) return erreur404(req.url);
    Object.assign(rdv, req.body);
    return reponse(rdv);
  }

  return next(req);
};
