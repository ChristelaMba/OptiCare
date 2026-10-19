import { Service, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { map, Observable } from 'rxjs';

import { environment } from '../../../environments/environment';
import { ApiEmployeBrut, Employe, RoleUtilisateur } from '../../models/utilisateur.model';

const BASE_URL = environment.apiUrl.replace(/\/$/, '');

/** POST /cabinets/{id}/personnel (ROUTES-API-LIONEL §12.1). `email`, `poste` et `embauche_le` sont facultatifs. */
export interface CreerEmployePayload {
  nom: string;
  prenom: string;
  telephone: string;
  ville: string;
  role: Extract<RoleUtilisateur, 'opticien' | 'secretaire'>;
  email?: string;
  poste?: string;
  embauche_le?: string;
  password: string;
  password_confirmation: string;
}

/** PUT /cabinets/{id}/personnel/{pid} (§12.4) : tous les champs sont facultatifs. */
export interface ModifierEmployePayload {
  nom?: string;
  prenom?: string;
  email?: string;
  telephone?: string;
  ville?: string;
  poste?: string;
  statut_employe?: string;
  is_active?: boolean;
  depart_le?: string;
}

interface EnveloppeEmploye {
  data: { employe: ApiEmployeBrut };
}

/** Personnel d'un cabinet (propriétaire uniquement) — ROUTES-API-LIONEL §12. Aucune logique d'état : chaque écran garde ses signals. */
@Service()
export class Personnel {
  private readonly http = inject(HttpClient);

  /** GET /cabinets/{id}/personnel (§12.2) — `data.employes[]`. */
  lister(cabinetId: string): Observable<Employe[]> {
    return this.http
      .get<{ data: { employes: ApiEmployeBrut[] } }>(`${BASE_URL}/cabinets/${cabinetId}/personnel`)
      .pipe(map(({ data }) => data.employes.map(Personnel.normaliser)));
  }

  /** POST /cabinets/{id}/personnel (§12.1) — `data.employe`. */
  creer(cabinetId: string, payload: CreerEmployePayload): Observable<Employe> {
    return this.http
      .post<EnveloppeEmploye>(`${BASE_URL}/cabinets/${cabinetId}/personnel`, payload)
      .pipe(map(({ data }) => Personnel.normaliser(data.employe)));
  }

  /** PUT /cabinets/{id}/personnel/{pid} (§12.4) — `data.employe`. Activer/désactiver = `{ is_active }`. */
  modifier(cabinetId: string, employeId: string, payload: ModifierEmployePayload): Observable<Employe> {
    return this.http
      .put<EnveloppeEmploye>(`${BASE_URL}/cabinets/${cabinetId}/personnel/${employeId}`, payload)
      .pipe(map(({ data }) => Personnel.normaliser(data.employe)));
  }

  /** DELETE /cabinets/{id}/personnel/{pid} (§12.5). */
  supprimer(cabinetId: string, employeId: string): Observable<void> {
    return this.http.delete<unknown>(`${BASE_URL}/cabinets/${cabinetId}/personnel/${employeId}`).pipe(map(() => undefined));
  }

  private static normaliser(brut: ApiEmployeBrut): Employe {
    return {
      id: String(brut.id),
      nom: brut.nom,
      prenom: brut.prenom,
      email: brut.email ?? null,
      telephone: brut.telephone,
      ville: brut.ville,
      role: brut.role,
      poste: brut.poste ?? null,
      statutEmploye: brut.statut_employe ?? null,
      actif: !!brut.is_active,
    };
  }
}
