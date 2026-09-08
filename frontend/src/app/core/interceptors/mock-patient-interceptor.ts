import { HttpErrorResponse, HttpInterceptorFn, HttpResponse } from '@angular/common/http';
import { delay, Observable, of, throwError } from 'rxjs';

import { environment } from '../../../environments/environment';
import { patientsFactices } from '../mocks/patient-mock-data';

const BASE_URL = `${environment.apiUrl.replace(/\/$/, '')}/patients`;
const LATENCE_MS = 400;

function reponse<T>(body: T, status = 200): Observable<HttpResponse<T>> {
  return of(new HttpResponse({ body, status })).pipe(delay(LATENCE_MS));
}

function erreur404(url: string): Observable<never> {
  return throwError(() => new HttpErrorResponse({ status: 404, url, error: { message: 'Patient introuvable' } })).pipe(
    delay(LATENCE_MS),
  );
}

/**
 * OUTIL DE DEV UNIQUEMENT — court-circuite `GET /patients/{id}` avec
 * `patient-mock-data.ts`, tant que la route (non confirmée au §8, voir
 * POINTS-A-CONFIRMER-BACKEND.md) n'est pas branchée sur un vrai back-end.
 * Même fonctionnement que `mock-rendezvous-interceptor.ts`. À retirer une
 * fois l'API réelle disponible.
 */
export const mockPatientInterceptor: HttpInterceptorFn = (req, next) => {
  if (environment.production || !req.url.startsWith(BASE_URL)) {
    return next(req);
  }

  const matchDetail = req.url.match(new RegExp(`^${BASE_URL}/([^/]+)$`));

  if (req.method === 'GET' && matchDetail) {
    const patient = patientsFactices.find((p) => p.id === matchDetail[1]);
    if (!patient) return erreur404(req.url);
    return reponse(patient);
  }

  return next(req);
};
