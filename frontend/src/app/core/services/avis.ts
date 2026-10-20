import { Service, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { map, Observable } from 'rxjs';

import { environment } from '../../../environments/environment';
import {
  ApiAvisCabinetData,
  ApiAvisPatientBrut,
  CreationAvisPayload,
  ModificationAvisPayload,
  RepartitionNotes,
} from '../../models/avis.model';

const BASE_URL = environment.apiUrl.replace(/\/$/, '');

/** Avis public d'un cabinet, tel que renvoyé par `GET /cabinets/{id}/avis` (ROUTES-API-LIONEL §14.1). */
export interface AvisPublic {
  id: number;
  note: number;
  commentaire: string | null;
  created_at: string;
  patient: { nom: string; prenom: string } | null;
}

/** Agrégat de `GET /cabinets/{id}/avis` : liste + moyenne + total + répartition par note. */
export interface AgregatAvisCabinet {
  avis: AvisPublic[];
  moyenne: number;
  total: number;
  repartition: RepartitionNotes;
}

interface ApiAvisEnveloppe {
  status: string;
  message: string;
  data: ApiAvisCabinetData;
}

/**
 * Service des avis (contrat officiel, ROUTES-API-LIONEL §14) : lecture publique pour la
 * vitrine d'un cabinet, puis parcours patient complet (lister les siens, créer, modifier,
 * supprimer). `DELETE /avis/{id}` sert aussi au Super Admin pour la modération.
 *
 * `POST /avis` exige une consultation **terminée** appartenant au patient et refuse un
 * second avis sur la même consultation ; le commentaire est borné à 1000 caractères. Ces
 * règles sont appliquées côté serveur (422 validation, 500 erreur métier) — le service ne
 * fait que transporter le corps et laisser remonter l'erreur brute.
 */
@Service()
export class Avis {
  private readonly http = inject(HttpClient);

  /**
   * GET /cabinets/{id}/avis — public, sans auth. Renvoie la liste **et** l'agrégat
   * (moyenne, total, répartition) attendu par la vitrine.
   */
  listerParCabinetAvecAgregat(cabinetId: string): Observable<AgregatAvisCabinet> {
    return this.http
      .get<ApiAvisEnveloppe>(`${BASE_URL}/cabinets/${cabinetId}/avis`)
      .pipe(map((enveloppe) => enveloppe.data));
  }

  /** GET /cabinets/{id}/avis — ne garde que la liste des avis (usage historique). */
  listerParCabinet(cabinetId: string): Observable<AvisPublic[]> {
    return this.listerParCabinetAvecAgregat(cabinetId).pipe(map((data) => data.avis));
  }

  /** GET /patient/avis (§14.3) — les avis publiés par le patient connecté, chacun avec son `cabinet`. */
  listerMesAvis(): Observable<ApiAvisPatientBrut[]> {
    return this.http
      .get<{ data: { avis: ApiAvisPatientBrut[] } }>(`${BASE_URL}/patient/avis`)
      .pipe(map(({ data }) => data.avis));
  }

  /** POST /avis (§14.2) — 201. 422 si validation (note hors 1–5, commentaire > 1000), 500 si règle métier. */
  creer(payload: CreationAvisPayload): Observable<ApiAvisPatientBrut> {
    return this.http
      .post<{ data: { avis: ApiAvisPatientBrut } }>(`${BASE_URL}/avis`, payload)
      .pipe(map(({ data }) => data.avis));
  }

  /** PATCH /avis/{id} (§14.4) — l'avis du patient connecté uniquement. */
  modifier(id: string, payload: ModificationAvisPayload): Observable<ApiAvisPatientBrut> {
    return this.http
      .patch<{ data: { avis: ApiAvisPatientBrut } }>(`${BASE_URL}/avis/${id}`, payload)
      .pipe(map(({ data }) => data.avis));
  }

  /** DELETE /avis/{id} (§14.5) — patient (son propre avis) ou super_admin (modération). */
  supprimer(id: string): Observable<void> {
    return this.http.delete<unknown>(`${BASE_URL}/avis/${id}`).pipe(map(() => undefined));
  }
}
