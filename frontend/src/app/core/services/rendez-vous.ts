import { Service, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

import { environment } from '../../../environments/environment';
import { RendezVous as RendezVousModel } from '../../models/rendez-vous.model';

const BASE_URL = environment.apiUrl.replace(/\/$/, '');

@Service()
export class RendezVous {
  private readonly http = inject(HttpClient);

  /**
   * TODO : route NON confirmée avec le back-end — le contrat §8 ne liste
   * que POST /rendezvous et PATCH /rendezvous/{id}, pas de route de listage
   * par cabinet. Nécessaire pour l'écran Propriétaire « Historique des
   * rendez-vous » (§9.6). Hypothèse provisoire, à confirmer.
   */
  listerParCabinet(cabinetId: string): Observable<RendezVousModel[]> {
    return this.http.get<RendezVousModel[]>(`${BASE_URL}/cabinets/${cabinetId}/rendezvous`);
  }

  /** PATCH /rendezvous/{id} — §8 du cahier des charges (rôle Secrétaire). */
  mettreAJourStatut(id: string, statut: RendezVousModel['statut']): Observable<RendezVousModel> {
    return this.http.patch<RendezVousModel>(`${BASE_URL}/rendezvous/${id}`, { statut });
  }
}
