import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { map, Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import {
  ApiCreneauxEnveloppe,
  ApiRdvsEnveloppe,
  NouveauRendezVousPayload,
  RendezVous,
} from '../../models/rendez-vous.model';

const BASE_URL = environment.apiUrl.replace(/\/$/, '');

/**
 * 2026-09-11 : connectivité testée route par route sur les vrais noms
 * transmis par Lionel (voir POINTS-A-CONFIRMER-BACKEND.md §12). Résultat
 * MIXTE — seules `listerCreneaux()` et `getMesRendezVous()` tapent l'API
 * réelle. Le reste de ce service (`creer`, `listerParCabinet`,
 * `mettreAJourStatut`, `annulerRendezVous`) continue d'appeler les
 * anciennes routes `/rendezvous`, `/cabinets/{id}/rendezvous`,
 * `/rendez-vous/mes-rendez-vous` — volontairement inchangées, toujours
 * servies par `mock-rendezvous-interceptor.ts` (encore actif dans
 * `app.config.ts`) — parce que leurs équivalents réels sont soit cassés
 * côté back (`PUT /rdv/{id}/confirmer|terminer|non-honore` → 500,
 * `GET /cabinets/{id}/rdv` → 500, même bug de middleware que Cabinets),
 * soit non testés en écriture réelle sur consigne explicite
 * (`POST /rdv` : sondé en validation seulement, 422 propre sur corps
 * vide — jamais testé avec un vrai payload).
 */
@Injectable({
  providedIn: 'root'
})
export class RendezVousService {

  private readonly http = inject(HttpClient);

  /** POST /rendezvous — mock, voir commentaire de tête. À rebrancher sur POST /rdv une fois l'écriture réelle validée. */
  creer(payload: NouveauRendezVousPayload): Observable<RendezVous> {
    return this.http.post<RendezVous>(`${BASE_URL}/rendezvous`, payload);
  }

  /**
   * GET /cabinets/{id}/rendezvous — mock, voir commentaire de tête. Le
   * vrai équivalent (`GET /cabinets/{id}/rdv`, utilisé par `agenda` et
   * `historique-rdv`) renvoie `500` (bug de middleware `CheckRole`),
   * confirmé le 11/09 avec un token valide — pas de route de repli.
   */
  listerParCabinet(cabinetId: string): Observable<RendezVous[]> {
    return this.http.get<RendezVous[]>(`${BASE_URL}/cabinets/${cabinetId}/rendezvous`);
  }

  /** PATCH /rendezvous/{id} — mock, voir commentaire de tête. Les vraies routes d'action (`PUT /rdv/{id}/confirmer|terminer|non-honore`) renvoient 500 pour tout le monde. */
  mettreAJourStatut(id: string, statut: RendezVous['statut']): Observable<RendezVous> {
    return this.http.patch<RendezVous>(`${BASE_URL}/rendezvous/${id}`, { statut });
  }

  /** PATCH /rendezvous/{id} — mock, voir commentaire de tête (même route mock que ci-dessus, statut 'annule'). */
  annulerRendezVous(id: string): Observable<RendezVous> {
    return this.http.patch<RendezVous>(`${BASE_URL}/rendezvous/${id}`, { statut: 'annule' });
  }

  /**
   * GET /cabinets/{id}/slots?date=YYYY-MM-DD — ✅ RÉEL, confirmé le 11/09
   * (200, enveloppe `{ data: { date, slots } }`). `slots` toujours vide
   * dans tous les tests (aucun cabinet n'a de disponibilités configurées)
   * — la forme d'un créneau individuel reste une hypothèse, voir
   * `ApiCreneauxEnveloppe` (rendez-vous.model.ts). Pas encore consommée
   * par un écran (voir `prise-rdv.ts`, laissé inchangé pour cette raison).
   */
  listerCreneaux(cabinetId: string, date: string): Observable<string[]> {
    const params = new HttpParams().set('date', date);
    return this.http
      .get<ApiCreneauxEnveloppe>(`${BASE_URL}/cabinets/${cabinetId}/slots`, { params })
      .pipe(map((enveloppe) => enveloppe.data.slots));
  }

  /**
   * GET /patients/{patientId}/rdv — ✅ RÉEL, confirmé le 11/09 (200,
   * enveloppe `{ data: { rdvs: [...] } }`). `rdvs` toujours vide dans tous
   * les tests, y compris avec un id manifestement inexistant — forte
   * présomption que `{patientId}` n'est pas utilisé pour filtrer (le back
   * déduirait le patient du token), mais non prouvé faute de données
   * réelles. `patientId` fourni par l'appelant (`this.auth.utilisateur()?.id`
   * dans `mes-rendez-vous.ts`, même convention que les autres écrans qui
   * résolvent l'identité côté composant).
   *
   * ⚠️ Aucune normalisation de champs : la forme exacte d'un `Rdv` réel
   * n'a jamais été observée peuplée. Le cast `as RendezVous[]` ci-dessous
   * est donc **non vérifié** — fonctionne aujourd'hui uniquement parce que
   * la liste est toujours vide. À remplacer par un vrai mapping
   * (`normaliserRdv()`, même pattern que `Cabinet.normaliserCabinet()`)
   * dès qu'un RDV réel existera pour en inspecter la forme.
   */
  getMesRendezVous(patientId: string): Observable<RendezVous[]> {
    return this.http
      .get<ApiRdvsEnveloppe>(`${BASE_URL}/patients/${patientId}/rdv`)
      .pipe(map((enveloppe) => enveloppe.data.rdvs as RendezVous[]));
  }
}
