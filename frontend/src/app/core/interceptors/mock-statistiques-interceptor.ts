import { HttpInterceptorFn, HttpResponse } from '@angular/common/http';
import { delay, of } from 'rxjs';

import { environment } from '../../../environments/environment';
import { genererStatistiques } from '../mocks/statistiques-mock-data';

const BASE_URL = environment.apiUrl.replace(/\/$/, '');
const LATENCE_MS = 400;

/**
 * OUTIL DE DEV UNIQUEMENT — court-circuite GET /cabinets/{id}/statistiques
 * avec des données générées (voir statistiques-mock-data.ts). Même
 * fonctionnement que `mock-cabinets-interceptor.ts`. À retirer une fois
 * l'API réelle disponible.
 */
export const mockStatistiquesInterceptor: HttpInterceptorFn = (req, next) => {
  if (environment.production || !req.url.startsWith(BASE_URL)) {
    return next(req);
  }

  const match = req.url.match(new RegExp(`^${BASE_URL}/cabinets/([^/]+)/statistiques`));
  if (req.method === 'GET' && match) {
    const periode = (req.params.get('periode') as 'jour' | 'semaine' | 'mois') ?? 'mois';
    return of(new HttpResponse({ body: genererStatistiques(periode), status: 200 })).pipe(delay(LATENCE_MS));
  }

  return next(req);
};
