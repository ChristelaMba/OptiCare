import { HttpErrorResponse, HttpInterceptorFn, HttpResponse } from '@angular/common/http';
import { delay, Observable, of, throwError } from 'rxjs';

import { environment } from '../../../environments/environment';
import { commandesFactices } from '../mocks/commande-mock-data';
import { Commande, NouvelleCommandePayload, StatutCommande } from '../../models/commande.model';

const BASE_URL = environment.apiUrl.replace(/\/$/, '');
const LATENCE_MS = 400;

function reponse<T>(body: T, status = 200): Observable<HttpResponse<T>> {
  return of(new HttpResponse({ body, status })).pipe(delay(LATENCE_MS));
}

function erreur404(url: string): Observable<never> {
  return throwError(() => new HttpErrorResponse({ status: 404, url, error: { message: 'Commande introuvable' } })).pipe(
    delay(LATENCE_MS),
  );
}

/**
 * OUTIL DE DEV UNIQUEMENT — court-circuite les appels Commande avec le jeu
 * de données de `commande-mock-data.ts`. Même fonctionnement que
 * `mock-rendezvous-interceptor.ts`. `POST /commandes` et
 * `PATCH /commandes/{id}/statut` sont confirmées au §8 ; `GET /commandes/{id}`
 * (lire()) reste une hypothèse non confirmée — voir
 * POINTS-A-CONFIRMER-BACKEND.md. À retirer une fois l'API réelle
 * disponible.
 */
export const mockCommandeInterceptor: HttpInterceptorFn = (req, next) => {
  if (environment.production || !req.url.startsWith(BASE_URL)) {
    return next(req);
  }

  // POST /commandes
  if (req.method === 'POST' && req.url === `${BASE_URL}/commandes`) {
    const payload = req.body as NouvelleCommandePayload;
    const maintenant = new Date();

    const nouvelle: Commande = {
      ...payload,
      id: `cmd-${Date.now()}`,
      statut: 'initie',
      dateInitiation: maintenant,
      dateDerniereMiseAJour: maintenant,
      notificationEnvoyee: false,
    };

    commandesFactices.push(nouvelle);

    return reponse(nouvelle, 201);
  }

  // GET /commandes/{id}
  const matchDetail = req.url.match(new RegExp(`^${BASE_URL}/commandes/([^/]+)$`));
  if (req.method === 'GET' && matchDetail) {
    const commande = commandesFactices.find((c) => c.id === matchDetail[1]);
    if (!commande) return erreur404(req.url);
    return reponse(commande);
  }

  // PATCH /commandes/{id}/statut
  const matchStatut = req.url.match(new RegExp(`^${BASE_URL}/commandes/([^/]+)/statut$`));
  if (req.method === 'PATCH' && matchStatut) {
    const commande = commandesFactices.find((c) => c.id === matchStatut[1]);
    if (!commande) return erreur404(req.url);

    const { statut } = req.body as { statut: StatutCommande };

    commande.statut = statut;
    commande.dateDerniereMiseAJour = new Date();

    // §5 : passage à `termine` déclenche automatiquement la notification
    // patient côté back — reproduit ici pour que l'écran ait quelque
    // chose de réel à refléter, pas une simple supposition d'affichage.
    if (statut === 'termine') {
      commande.notificationEnvoyee = true;
    }

    return reponse(commande);
  }

  return next(req);
};
