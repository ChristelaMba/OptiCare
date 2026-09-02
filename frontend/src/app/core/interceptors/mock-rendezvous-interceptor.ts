import { HttpErrorResponse, HttpInterceptorFn, HttpResponse } from '@angular/common/http';
import { delay, Observable, of, throwError } from 'rxjs';

import { environment } from '../../../environments/environment';
import { rendezVousFactices, RendezVousAffichage } from '../mocks/rendez-vous-mock-data';
import { cabinetsFactices } from '../mocks/cabinets-mock-data';
import { NouveauRendezVousPayload } from '../../models/rendez-vous.model';

const BASE_URL = environment.apiUrl.replace(/\/$/, '');
const LATENCE_MS = 400;

/**
 * Le payload de création (NouveauRendezVousPayload) ne porte qu'une heure
 * de début, pas de durée — 30 min par défaut ici, cohérent avec la
 * majorité des créneaux du jeu de données existant. Purement un détail de
 * mock : le vrai back-end décidera lui-même de la durée du créneau.
 */
function ajouterMinutes(heure: string, minutes: number): string {
  const [h, m] = heure.split(':').map(Number);
  const total = h * 60 + m + minutes;
  const hh = Math.floor((total % (24 * 60)) / 60).toString().padStart(2, '0');
  const mm = (total % 60).toString().padStart(2, '0');
  return `${hh}:${mm}`;
}

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

  // POST /rendezvous
  if (req.method === 'POST' && req.url === `${BASE_URL}/rendezvous`) {
    const payload = req.body as NouveauRendezVousPayload;
    const cabinet = cabinetsFactices.find((c) => c.id === payload.cabinetId);

    const nouveau: RendezVousAffichage = {
      id: `rdv-${Date.now()}`,
      cabinetId: payload.cabinetId,
      cabinetNom: cabinet?.nom ?? 'Cabinet',
      cabinetAdresse: cabinet?.adresse,
      motif: payload.motif,
      date: payload.date,
      heureDebut: payload.heure,
      heureFin: ajouterMinutes(payload.heure, 30),
      // Un rendez-vous pris en ligne attend une confirmation par la
      // secrétaire — jamais confirmé d'office.
      statut: 'en_attente',
      nomPatientAffiche: payload.nomComplet,
    };

    rendezVousFactices.push(nouveau);

    return reponse(nouveau, 201);
  }

  // GET /rendez-vous/mes-rendez-vous
  if (req.method === 'GET' && req.url === `${BASE_URL}/rendez-vous/mes-rendez-vous`) {
    // Aucun patientId n'est transmis ici (hypothèse posée côté front :
    // le back le déduit du token JWT — voir POINTS-A-CONFIRMER-BACKEND.md,
    // point 8) et rendezVousFactices ne porte de toute façon aucun champ
    // patientId pour filtrer dessus. Sous-ensemble fixe plutôt qu'un
    // filtrage inventé qui ferait croire à une vraie logique d'identité
    // côté mock — juste de quoi peupler l'écran de façon plausible.
    return reponse(rendezVousFactices.slice(0, 5));
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
