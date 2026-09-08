import { HttpErrorResponse, HttpInterceptorFn, HttpResponse } from '@angular/common/http';
import { delay, Observable, of, throwError } from 'rxjs';

import { environment } from '../../../environments/environment';
import { FicheConsultation } from '../../models/fiche-consultation.model';
import { fichesHistoriqueFactices } from '../mocks/fiche-consultation-mock-data';

const BASE_URL = environment.apiUrl.replace(/\/$/, '');
const LATENCE_MS = 400;

function reponse<T>(body: T, status = 200): Observable<HttpResponse<T>> {
  return of(new HttpResponse({ body, status })).pipe(delay(LATENCE_MS));
}

function erreur404(url: string): Observable<never> {
  return throwError(() => new HttpErrorResponse({ status: 404, url, error: { message: 'Aucune fiche pour ce dossier visuel' } })).pipe(
    delay(LATENCE_MS),
  );
}

/**
 * OUTIL DE DEV UNIQUEMENT — court-circuite `POST /consultations`
 * (confirmée au §8 du cahier des charges — pas de tableau en mémoire,
 * juste un écho fidèle du payload avec un id généré, aucun écran ne
 * relit une FicheConsultation complète pour l'instant) et
 * `GET /dossiers-visuels/{id}/consultations` (hypothèse non confirmée,
 * voir POINTS-A-CONFIRMER-BACKEND.md et fiche-consultation-mock-data.ts).
 * À retirer une fois l'API réelle disponible.
 */
export const mockFicheConsultationInterceptor: HttpInterceptorFn = (req, next) => {
  if (environment.production || !req.url.startsWith(BASE_URL)) {
    return next(req);
  }

  if (req.method === 'POST' && req.url === `${BASE_URL}/consultations`) {
    const nouvelle: Partial<FicheConsultation> = {
      id: `fc-${Date.now()}`,
      ...(req.body as object),
    };
    return reponse(nouvelle, 201);
  }

  const matchHistorique = req.url.match(new RegExp(`^${BASE_URL}/dossiers-visuels/([^/]+)/consultations$`));
  if (req.method === 'GET' && matchHistorique) {
    const fiches = fichesHistoriqueFactices[matchHistorique[1]];
    if (!fiches) return erreur404(req.url);
    return reponse(fiches);
  }

  return next(req);
};
