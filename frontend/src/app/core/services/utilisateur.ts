import { Service, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

import { environment } from '../../../environments/environment';
import { RoleUtilisateur, Utilisateur as UtilisateurModel } from '../../models/utilisateur.model';

const BASE_URL = environment.apiUrl.replace(/\/$/, '');

// §6.3 du cahier des charges : champs exacts attendus par POST /cabinets/{id}/personnel.
export interface CreerPersonnelPayload {
  nom: string;
  prenom: string;
  telephone: string;
  ville: string;
  email: string;
  role: Extract<RoleUtilisateur, 'Opticien' | 'Secretaire'>;
}

/**
 * Même pattern que cabinet.ts : un service par ressource, Observable en
 * retour, aucune logique de state (chaque écran garde son propre signal).
 */
@Service()
export class Utilisateur {
  private readonly http = inject(HttpClient);

  /** GET /cabinets/{id}/personnel — employés (Opticien/Secretaire) d'un cabinet (Propriétaire → gestion-employes). */
  listerParCabinet(cabinetId: string): Observable<UtilisateurModel[]> {
    return this.http.get<UtilisateurModel[]>(`${BASE_URL}/cabinets/${cabinetId}/personnel`);
  }

  /**
   * POST /cabinets/{id}/personnel — §8 du cahier des charges : « c'est ici,
   * et uniquement ici, que sont créés les comptes Opticien/Secrétaire » (§9.6).
   */
  creerPersonnel(cabinetId: string, payload: CreerPersonnelPayload): Observable<UtilisateurModel> {
    return this.http.post<UtilisateurModel>(`${BASE_URL}/cabinets/${cabinetId}/personnel`, payload);
  }

  /**
   * TODO : route NON confirmée avec le back-end — absente du contrat d'API
   * §8 (seules les routes liées à un cabinet précis y figurent). Nécessaire
   * pour l'écran Super Admin « Gestion globale des comptes » (§9.7), qui
   * liste TOUS les utilisateurs tous cabinets confondus. Hypothèse
   * provisoire par symétrie avec `/admin/cabinets`, à confirmer.
   */
  listerTous(): Observable<UtilisateurModel[]> {
    return this.http.get<UtilisateurModel[]>(`${BASE_URL}/admin/utilisateurs`);
  }

  /** TODO : route NON confirmée — même statut que listerTous() ci-dessus. */
  activer(id: string): Observable<UtilisateurModel> {
    return this.http.patch<UtilisateurModel>(`${BASE_URL}/admin/utilisateurs/${id}/activer`, {});
  }

  /** TODO : route NON confirmée — même statut que listerTous() ci-dessus. */
  desactiver(id: string): Observable<UtilisateurModel> {
    return this.http.patch<UtilisateurModel>(`${BASE_URL}/admin/utilisateurs/${id}/desactiver`, {});
  }

  /** TODO : route NON confirmée — même statut que listerTous() ci-dessus. */
  reinitialiserMotDePasse(id: string): Observable<void> {
    return this.http.post<void>(`${BASE_URL}/admin/utilisateurs/${id}/reinitialiser-mot-de-passe`, {});
  }
}
