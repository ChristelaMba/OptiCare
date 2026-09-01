import { HttpInterceptorFn, HttpResponse } from '@angular/common/http';
import { delay, Observable, of } from 'rxjs';

import { environment } from '../../../environments/environment';
import { FicheConsultation } from '../../models/fiche-consultation.model';

const BASE_URL = environment.apiUrl.replace(/\/$/, '');
const LATENCE_MS = 400;

function reponse<T>(body: T, status = 200): Observable<HttpResponse<T>> {
  return of(new HttpResponse({ body, status })).pipe(delay(LATENCE_MS));
}

/**
 * OUTIL DE DEV UNIQUEMENT — court-circuite `POST /consultations` (confirmée
 * au §8 du cahier des charges). Pas de tableau en mémoire ici : contrairement
 * à RendezVous/PriseEnCharge/Patient, aucun écran ne relit une
 * FicheConsultation créée pour l'instant (dossier-visuel-patient.ts a sa
 * propre FicheHistorique locale, non connectée à ce service — voir
 * POINTS-A-CORRIGER-NOELLY.md) ; on se contente d'un écho fidèle du payload
 * avec un id généré. À enrichir le jour où un écran lit vraiment cette
 * réponse. À retirer une fois l'API réelle disponible.
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

  return next(req);
};
