import { Service, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

import { environment } from '../../../environments/environment';
import { PriseEnCharge as PriseEnChargeModel } from '../../models/prise-en-charge.model';

const BASE_URL = environment.apiUrl.replace(/\/$/, '');

/**
 * Même pattern que cabinet.ts/rendez-vous.ts : @Service(), Observable en
 * retour, aucune logique de state ici. Consommé par
 * nouvelle-fiche-consultation.ts (voir JOURNAL-MODIFICATIONS-PARTAGEES.md).
 *
 * Correction du 2026-09-01 : `POST /prise-en-charge` (singulier) est en
 * fait CONFIRMÉ au §8 du cahier des charges — contrairement à ce que
 * disait ce commentaire jusqu'ici. creer() a été corrigée en conséquence
 * (elle appelait `/prises-en-charge`, au pluriel, une route inventée).
 * obtenirParId() et mettreAJourStatut() restent des hypothèses : aucune
 * route GET/PATCH PriseEnCharge n'apparaît au §8 — voir
 * POINTS-A-CONFIRMER-BACKEND.md, point 0.
 */
@Service()
export class PriseEnCharge {
  private readonly http = inject(HttpClient);

  /** POST /prise-en-charge — confirmé au §8 du cahier des charges. */
  creer(payload: Omit<PriseEnChargeModel, 'id'>): Observable<PriseEnChargeModel> {
    return this.http.post<PriseEnChargeModel>(`${BASE_URL}/prise-en-charge`, payload);
  }

  /**
   * TODO : route NON confirmée avec le back-end — §8 ne liste aucune route
   * de lecture pour PriseEnCharge. `GET /prise-en-charge/{id}` est une
   * hypothèse provisoire, posée par symétrie avec creer().
   */
  obtenirParId(id: string): Observable<PriseEnChargeModel> {
    return this.http.get<PriseEnChargeModel>(`${BASE_URL}/prise-en-charge/${id}`);
  }

  /**
   * TODO : route NON confirmée avec le back-end — §8 ne liste aucune route
   * de mise à jour pour PriseEnCharge. `PATCH /prise-en-charge/{id}` est
   * une hypothèse provisoire, posée par symétrie avec
   * RendezVousService.mettreAJourStatut(). C'est cette transition
   * (notamment vers `terminee`) qui est censée déclencher le verrouillage
   * définitif de FicheConsultation.modifiable côté back (§5 du cahier des
   * charges) — voir POINTS-A-CONFIRMER-BACKEND.md.
   */
  mettreAJourStatut(id: string, statut: PriseEnChargeModel['statut']): Observable<PriseEnChargeModel> {
    return this.http.patch<PriseEnChargeModel>(`${BASE_URL}/prise-en-charge/${id}`, { statut });
  }
}
