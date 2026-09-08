import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

import { environment } from '../../../environments/environment';
import { Commande, NouvelleCommandePayload, StatutCommande } from '../../models/commande.model';

const BASE_URL = environment.apiUrl.replace(/\/$/, '');

/**
 * Écran construit de zéro le 2026-09-02 (`suivi-commande.ts`) — ce service
 * était un stub vide (`@Service() export class Commande {}`, qui en plus
 * entrait en collision de nom avec le modèle `Commande`). Repris avec le
 * pattern `@Injectable` + suffixe `Service` déjà utilisé pour les autres
 * services ajoutés cette session (fiche-consultation.ts, rendez-vous.ts),
 * précisément pour éviter cette collision. Voir
 * JOURNAL-MODIFICATIONS-PARTAGEES.md.
 */
@Injectable({
  providedIn: 'root'
})
export class CommandeService {

  private readonly http = inject(HttpClient);

  /** POST /commandes — confirmée au §8 du cahier des charges. */
  creer(payload: NouvelleCommandePayload): Observable<Commande> {
    return this.http.post<Commande>(`${BASE_URL}/commandes`, payload);
  }

  /**
   * TODO : route NON confirmée avec le back-end — §8 ne liste que
   * POST /commandes et PATCH /commandes/{id}/statut, aucune route de
   * lecture d'une commande existante. Nécessaire pour `suivi-commande.ts`
   * (affiche une commande déjà créée). Hypothèse posée par symétrie avec
   * PriseEnChargeService.obtenirParId() — voir POINTS-A-CONFIRMER-BACKEND.md.
   */
  lire(id: string): Observable<Commande> {
    return this.http.get<Commande>(`${BASE_URL}/commandes/${id}`);
  }

  /** PATCH /commandes/{id}/statut — confirmée au §8 du cahier des charges. */
  mettreAJourStatut(id: string, statut: StatutCommande): Observable<Commande> {
    return this.http.patch<Commande>(`${BASE_URL}/commandes/${id}/statut`, { statut });
  }
}
