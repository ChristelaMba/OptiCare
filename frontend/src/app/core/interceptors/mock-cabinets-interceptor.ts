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
 * ⚠️ DÉSACTIVÉ DEPUIS LE 11/09 — plus enregistré dans `app.config.ts`.
 * `/cabinets`, `/cabinets/{id}`, `/cabinets/{id}/profile`, `/admin/cabinets`
 * et `/admin/cabinets/{id}/{verify,reject}` tapent maintenant la vraie API
 * (routes confirmées et testées ce jour-là ; voir POINTS-A-CONFIRMER-BACKEND.md
 * et JOURNAL-MODIFICATIONS-PARTAGEES.md). Ce fichier et
 * `cabinets-mock-data.ts` sont conservés comme référence / filet de secours,
 * à jour du modèle `Cabinet` réel — noter que les réponses ici sont
 * enveloppées dans `{ data: { cabinet(s) } }` pour matcher exactement la
 * forme brute que `core/services/cabinet.ts` sait dénormaliser, au cas où
 * ce mock serait un jour réactivé pour un test hors-ligne.
 *
 * OUTIL DE DEV UNIQUEMENT — court-circuite les appels vers `/cabinets` et
 * `/admin/cabinets` avec le jeu de données de `cabinets-mock-data.ts`.
 * Mute `cabinetsFactices` en mémoire pour que profil/valider/refuser se
 * comportent comme un vrai backend le temps d'une session.
 */
export const mockCabinetsInterceptor: HttpInterceptorFn = (req, next) => {
  if (environment.production || !req.url.startsWith(BASE_URL)) {
    return next(req);
  }

  const segmentApres = (prefixe: string): string | null =>
    req.url.startsWith(prefixe) ? req.url.slice(prefixe.length) : null;

  // GET /admin/cabinets — tous les cabinets (Super Admin).
  if (req.method === 'GET' && req.url === `${BASE_URL}/admin/cabinets`) {
    return reponse({ data: { cabinets: cabinetsFactices } });
  }

  // PUT /admin/cabinets/{id}/verify
  const idVerify = segmentApres(`${BASE_URL}/admin/cabinets/`)?.match(/^([^/]+)\/verify$/)?.[1];
  if (req.method === 'PUT' && idVerify) {
    const cabinet = cabinetsFactices.find((c) => c.id === idVerify);
    if (!cabinet) return erreur404(req.url);
    cabinet.status = 'valide';
    return reponse({ data: { cabinet: { id: cabinet.id, status: cabinet.status, is_verified: true, valide_le: new Date().toISOString(), valide_par: 'dev-super-admin' } } });
  }

  // PUT /admin/cabinets/{id}/reject
  const idReject = segmentApres(`${BASE_URL}/admin/cabinets/`)?.match(/^([^/]+)\/reject$/)?.[1];
  if (req.method === 'PUT' && idReject) {
    const cabinet = cabinetsFactices.find((c) => c.id === idReject);
    if (!cabinet) return erreur404(req.url);
    const motif = (req.body as { motif_refus?: string } | null)?.motif_refus ?? '';
    cabinet.status = 'refuse';
    return reponse({ data: { cabinet: { id: cabinet.id, status: cabinet.status, is_verified: false, motif_refus: motif } } });
  }

  // PATCH /cabinets/{id}/profile
  const idProfil = segmentApres(`${BASE_URL}/cabinets/`)?.match(/^([^/]+)\/profile$/)?.[1];
  if (req.method === 'PATCH' && idProfil) {
    const cabinet = cabinetsFactices.find((c) => c.id === idProfil);
    if (!cabinet) return erreur404(req.url);
    const corps = (req.body ?? {}) as Record<string, unknown>;
    // Aplati → imbriqué, symétrique de Cabinet.construireCorpsProfil() côté service.
    if ('nom' in corps) cabinet.nom = corps['nom'] as string;
    if ('adresse' in corps) cabinet.adresse = corps['adresse'] as string;
    if ('ville' in corps) cabinet.ville = corps['ville'] as string;
    if ('quartier' in corps) cabinet.quartier = corps['quartier'] as string;
    if ('telephone' in corps) cabinet.telephone = corps['telephone'] as string;
    if ('email' in corps) cabinet.email = corps['email'] as string;
    if ('whatsapp_numero' in corps) cabinet.whatsappNumero = corps['whatsapp_numero'] as string;
    if ('slogan' in corps) cabinet.slogan = corps['slogan'] as string;
    if ('description' in corps) cabinet.description = corps['description'] as string;
    if ('logo_url' in corps) cabinet.logoUrl = corps['logo_url'] as string;
    if ('photos' in corps) cabinet.photos = corps['photos'] as string[];
    if ('site_web' in corps) cabinet.liensExternes.siteWeb = corps['site_web'] as string;
    if ('facebook' in corps) cabinet.liensExternes.facebook = corps['facebook'] as string;
    if ('instagram' in corps) cabinet.liensExternes.instagram = corps['instagram'] as string;
    if ('tiktok' in corps) cabinet.liensExternes.tiktok = corps['tiktok'] as string;
    if ('abonnement_premium' in corps) cabinet.abonnementPremium = corps['abonnement_premium'] as boolean;
    return reponse({ data: { cabinet } });
  }

  // GET /cabinets/{id}
  const idDetail = segmentApres(`${BASE_URL}/cabinets/`)?.match(/^([^/]+)$/)?.[1];
  if (req.method === 'GET' && idDetail) {
    const cabinet = cabinetsFactices.find((c) => c.id === idDetail);
    return cabinet ? reponse({ data: { cabinet } }) : erreur404(req.url);
  }

  // GET /cabinets — vitrine publique, cabinets validés uniquement.
  if (req.method === 'GET' && req.url.startsWith(`${BASE_URL}/cabinets`) && !req.url.includes('/cabinets/')) {
    return reponse({ data: { cabinets: cabinetsFactices.filter((c) => c.status === 'valide') } });
  }

  // POST /cabinets — création (hors périmètre confirmé, voir cabinet.ts).
  if (req.method === 'POST' && req.url === `${BASE_URL}/cabinets`) {
    const nouveauCabinet: Cabinet = {
      id: `cab-dev-${Date.now()}`,
      logoUrl: '',
      photos: [],
      liensExternes: {},
      horaires: [],
      status: 'en_attente',
      abonnementPremium: false,
      noteMoyenne: 0,
      nombreAvis: 0,
      dateInscription: new Date(),
      ...(req.body as CreerCabinetPayload),
    };
    cabinetsFactices.push(nouveauCabinet);
    return reponse({ data: { cabinet: nouveauCabinet } }, 201);
  }

  return next(req);
};
