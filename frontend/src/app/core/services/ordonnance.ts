import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { map, Observable } from 'rxjs';

import { environment } from '../../../environments/environment';
import {
  ApiOrdonnanceBrute,
  NouvelleOrdonnancePayload,
  Ordonnance,
  PrescriptionOeilOrdonnance,
} from '../../models/ordonnance.model';

const BASE_URL = environment.apiUrl.replace(/\/$/, '');

const OEIL_VIDE: PrescriptionOeilOrdonnance = { sphere: null, cylindre: null, axe: null, addition: null };

/**
 * Ordonnances (ROUTES-API-LIONEL §10, essais réels du 20/10/2026) :
 * POST /consultations/{id}/ordonnances · GET /cabinets/{id}/ordonnances · GET /ordonnances/{id}.
 * Écriture à plat, valeurs de prescription en chaînes ; le numéro `ORD-…` est attribué par le serveur.
 * 422 si la consultation n'est pas terminée ou si elle a déjà une ordonnance.
 */
@Injectable({
  providedIn: 'root',
})
export class OrdonnanceService {
  private readonly http = inject(HttpClient);

  /** GET /cabinets/{id}/ordonnances (§10.2), `search` facultatif. */
  listerParCabinet(cabinetId: string, search?: string): Observable<Ordonnance[]> {
    let params = new HttpParams();
    if (search) params = params.set('search', search);
    return this.http
      .get<{ data: { ordonnances: ApiOrdonnanceBrute[] } }>(`${BASE_URL}/cabinets/${cabinetId}/ordonnances`, { params })
      .pipe(map(({ data }) => data.ordonnances.map(OrdonnanceService.normaliser)));
  }

  /** GET /ordonnances/{id} (§10.3). */
  obtenir(id: string): Observable<Ordonnance> {
    return this.http
      .get<{ data: { ordonnance: ApiOrdonnanceBrute } }>(`${BASE_URL}/ordonnances/${id}`)
      .pipe(map(({ data }) => OrdonnanceService.normaliser(data.ordonnance)));
  }

  /** POST /consultations/{consultationId}/ordonnances (§10.1) — 201. */
  creer(consultationId: string, payload: NouvelleOrdonnancePayload): Observable<Ordonnance> {
    return this.http
      .post<{ data: { ordonnance: ApiOrdonnanceBrute } }>(`${BASE_URL}/consultations/${consultationId}/ordonnances`, payload)
      .pipe(map(({ data }) => OrdonnanceService.normaliser(data.ordonnance)));
  }

  private static normaliser(brute: ApiOrdonnanceBrute): Ordonnance {
    const nom = (p?: { prenom?: string | null; nom?: string | null } | null) =>
      [p?.prenom, p?.nom].filter(Boolean).join(' ').trim() || null;
    return {
      id: String(brute.id),
      numero: brute.numero,
      consultationId: String(brute.consultation_id),
      patientId: String(brute.patient_id),
      patientNom: nom(brute.patient),
      opticienNom: nom(brute.opticien),
      od: { ...OEIL_VIDE, ...(brute.prescription?.od ?? {}) },
      og: { ...OEIL_VIDE, ...(brute.prescription?.og ?? {}) },
      ecartPupillaire: brute.prescription?.ecart_pupillaire ?? '',
      recommandations: brute.recommandations ?? '',
      dateEmission: brute.date_emission?.slice(0, 10) ?? null,
      dateValidite: brute.date_validite?.slice(0, 10) ?? null,
    };
  }
}
