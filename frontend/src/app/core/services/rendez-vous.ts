import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { NouveauRendezVousPayload, RendezVous } from '../../models/rendez-vous.model';

const BASE_URL = environment.apiUrl.replace(/\/$/, '');

@Injectable({
  providedIn: 'root'
})
export class RendezVousService {

  private readonly http = inject(HttpClient);

  /** POST /rendezvous — §8 du cahier des charges (rôle Patient, y compris invité). */
  creer(payload: NouveauRendezVousPayload): Observable<RendezVous> {
    return this.http.post<RendezVous>(`${BASE_URL}/rendezvous`, payload);
  }

  /**
   * TODO : route non confirmée avec le back-end — le contrat §8 ne liste
   * que POST /rendezvous et PATCH /rendezvous/{id}, pas de route de listage
   * par cabinet. Nécessaire pour l'écran Propriétaire « Historique des
   * rendez-vous » (§9.6). Hypothèse provisoire, à confirmer.
   */
  listerParCabinet(cabinetId: string): Observable<RendezVous[]> {
    return this.http.get<RendezVous[]>(`${BASE_URL}/cabinets/${cabinetId}/rendezvous`);
  }

  /** PATCH /rendezvous/{id} — §8 du cahier des charges (rôle Secrétaire). */
  mettreAJourStatut(id: string, statut: RendezVous['statut']): Observable<RendezVous> {
    return this.http.patch<RendezVous>(`${BASE_URL}/rendezvous/${id}`, { statut });
  }

  /** Récupère les rendez-vous du patient connecté (écran 4.2). */
  getMesRendezVous(): Observable<RendezVous[]> {
    return this.http.get<RendezVous[]>(`${BASE_URL}/rendez-vous/mes-rendez-vous`);
  }

  /** Annule un rendez-vous depuis l'espace patient. */
  annulerRendezVous(id: string): Observable<RendezVous> {
    return this.http.patch<RendezVous>(`${BASE_URL}/rendezvous/${id}`, { statut: 'annule' });
  }
}