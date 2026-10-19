import { Service, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { map, Observable } from 'rxjs';

import { environment } from '../../../environments/environment';
import {
  ApiCompteBrut,
  ApiComptesEnveloppe,
  CompteAdmin,
  RoleUtilisateur,
  StatsComptes,
  Utilisateur as UtilisateurModel,
} from '../../models/utilisateur.model';

const BASE_URL = environment.apiUrl.replace(/\/$/, '');

// §6.3 du cahier des charges : champs exacts attendus par POST /cabinets/{id}/personnel.
export interface CreerPersonnelPayload {
  nom: string;
  prenom: string;
  telephone: string;
  ville: string;
  email: string;
  role: Extract<RoleUtilisateur, 'opticien' | 'secretaire'>;
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
   * GET /admin/users (ROUTES-API-LIONEL §18.1) — tous les comptes, super admin uniquement. `role` et `search`
   * sont des paramètres facultatifs du serveur ; `stats` porte toujours sur l'ensemble des comptes.
   */
  listerComptes(filtres: { role?: RoleUtilisateur; search?: string } = {}): Observable<{ comptes: CompteAdmin[]; stats: StatsComptes }> {
    let params = new HttpParams();
    if (filtres.role) params = params.set('role', filtres.role);
    if (filtres.search) params = params.set('search', filtres.search);
    return this.http.get<ApiComptesEnveloppe>(`${BASE_URL}/admin/users`, { params }).pipe(
      map(({ data }) => ({
        comptes: data.users.map(Utilisateur.normaliserCompte),
        stats: {
          total: data.stats.total,
          superAdmin: data.stats.super_admin,
          proprietaire: data.stats.proprietaire,
          opticien: data.stats.opticien,
          secretaire: data.stats.secretaire,
          patient: data.stats.patient,
          actifs: data.stats.actifs,
          inactifs: data.stats.inactifs,
        },
      })),
    );
  }

  /** PUT /admin/users/{id}/toggle-active (§18.4) — bascule actif/inactif ; la réponse (`data.user`) donne le nouvel état. */
  basculerActivation(id: string): Observable<{ id: string; actif: boolean }> {
    return this.http
      .put<{ data: { user: { id: number; is_active: boolean } } }>(`${BASE_URL}/admin/users/${id}/toggle-active`, {})
      .pipe(map(({ data }) => ({ id: String(data.user.id), actif: data.user.is_active })));
  }

  /** PUT /admin/users/{id}/reset-password (§18.5) — `password` et `password_confirmation` (min 8) requis. */
  reinitialiserMotDePasse(id: string, motDePasse: string, confirmation: string): Observable<void> {
    return this.http
      .put<unknown>(`${BASE_URL}/admin/users/${id}/reset-password`, { password: motDePasse, password_confirmation: confirmation })
      .pipe(map(() => undefined));
  }

  /**
   * TODO (lot 2b-2b, écran « Gestion des employés ») : ces deux méthodes appellent des routes qui n'existent pas
   * (`PATCH /admin/utilisateurs/{id}/activer|desactiver`) ; la route du propriétaire est
   * `PUT /cabinets/{id}/personnel/{pid}` (§12.4). Conservées uniquement pour que `gestion-employes` compile.
   */
  activer(id: string): Observable<UtilisateurModel> {
    return this.http.patch<UtilisateurModel>(`${BASE_URL}/admin/utilisateurs/${id}/activer`, {});
  }

  desactiver(id: string): Observable<UtilisateurModel> {
    return this.http.patch<UtilisateurModel>(`${BASE_URL}/admin/utilisateurs/${id}/desactiver`, {});
  }

  private static normaliserCompte(brut: ApiCompteBrut): CompteAdmin {
    return {
      id: String(brut.id),
      nom: brut.nom,
      prenom: brut.prenom,
      email: brut.email,
      telephone: brut.telephone,
      ville: brut.ville,
      role: brut.role,
      actif: !!brut.is_active,
      cabinetNom: brut.cabinet?.nom ?? null,
    };
  }
}
