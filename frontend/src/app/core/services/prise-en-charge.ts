import { Service, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

import { environment } from '../../../environments/environment';
import { PriseEnCharge as PriseEnChargeModel } from '../../models/prise-en-charge.model';

const BASE_URL = environment.apiUrl.replace(/\/$/, '');

/**
 * Même pattern que cabinet.ts/rendez-vous.ts : @Service(), Observable en
 * retour, aucune logique de state ici. Périmètre volontairement limité au
 * modèle + service (voir POINTS-A-CONFIRMER-BACKEND.md, point 0) — aucun
 * écran ne consomme ce service pour l'instant, le branchement (notamment
 * sur nouvelle-fiche-consultation.ts et le calcul de
 * FicheConsultation.modifiable) reste à décider séparément.
 *
 * TODO : aucune route PriseEnCharge n'apparaît au §8 du cahier des charges
 * (contrairement à RendezVous ou Cabinet, qui y ont au moins quelques
 * routes listées) — les trois routes ci-dessous sont une hypothèse
 * complète, posée par symétrie avec les autres services CRUD du projet,
 * à confirmer intégralement avant toute utilisation réelle.
 */
@Service()
export class PriseEnCharge {
  private readonly http = inject(HttpClient);

  /**
   * TODO : route NON confirmée avec le back-end — §8 ne liste aucune route
   * PriseEnCharge. `POST /prises-en-charge` est une hypothèse provisoire,
   * à valider avant utilisation réelle.
   */
  creer(payload: Omit<PriseEnChargeModel, 'id'>): Observable<PriseEnChargeModel> {
    return this.http.post<PriseEnChargeModel>(`${BASE_URL}/prises-en-charge`, payload);
  }

  /**
   * TODO : route NON confirmée avec le back-end — même réserve que creer().
   * `GET /prises-en-charge/{id}` est une hypothèse provisoire.
   */
  obtenirParId(id: string): Observable<PriseEnChargeModel> {
    return this.http.get<PriseEnChargeModel>(`${BASE_URL}/prises-en-charge/${id}`);
  }

  /**
   * TODO : route NON confirmée avec le back-end — même réserve que creer().
   * `PATCH /prises-en-charge/{id}` est une hypothèse provisoire, posée par
   * symétrie avec RendezVousService.mettreAJourStatut(). C'est cette
   * transition (notamment vers `terminee`) qui est censée déclencher le
   * verrouillage définitif de FicheConsultation.modifiable côté back
   * (§5 du cahier des charges) — voir POINTS-A-CONFIRMER-BACKEND.md.
   */
  mettreAJourStatut(id: string, statut: PriseEnChargeModel['statut']): Observable<PriseEnChargeModel> {
    return this.http.patch<PriseEnChargeModel>(`${BASE_URL}/prises-en-charge/${id}`, { statut });
  }
}
