import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { map, Observable } from 'rxjs';

import { environment } from '../../../environments/environment';
import {
  ApiConsultation,
  ConsultationEcriture,
  ConsultationOpticien,
  PrescriptionOeilConsultation,
} from '../../models/consultation.model';

const BASE_URL = environment.apiUrl.replace(/\/$/, '');

const OEIL_VIDE: PrescriptionOeilConsultation = {
  sphere: null,
  cylindre: null,
  axe: null,
  addition: null,
  acuite_loin: null,
  acuite_pres: null,
};

/**
 * Consultations côté opticien (ROUTES-API-LIONEL §8, testé en écriture réelle le 20/10/2026, cabinet 6) :
 * POST /consultations · GET /consultations/{id} · PATCH /consultations/{id} · PUT /consultations/{id}/terminer ·
 * GET /cabinets/{id}/consultations · GET /patients/{id}/consultations.
 * Écriture à plat uniquement (voir `models/consultation.model.ts`). Remplace `FicheConsultationService`
 * et `PriseEnCharge` (routes inexistantes).
 */
@Injectable({
  providedIn: 'root',
})
export class ConsultationService {
  private readonly http = inject(HttpClient);

  /** POST /consultations (§8.1) — `patient_id`, `cabinet_id`, `date_consultation`, `motif` obligatoires. 201 → `en_cours`. */
  creer(corps: ConsultationEcriture): Observable<ConsultationOpticien> {
    return this.http
      .post<{ data: { consultation: ApiConsultation } }>(`${BASE_URL}/consultations`, corps)
      .pipe(map(({ data }) => ConsultationService.normaliser(data.consultation)));
  }

  /** GET /consultations/{id} (§8.2). */
  obtenir(id: string): Observable<ConsultationOpticien> {
    return this.http
      .get<{ data: { consultation: ApiConsultation } }>(`${BASE_URL}/consultations/${id}`)
      .pipe(map(({ data }) => ConsultationService.normaliser(data.consultation)));
  }

  /** PATCH /consultations/{id} (§8.3) — mise à jour partielle (seuls les champs envoyés changent). 422 `errors.consultation[0]` si verrouillée. */
  modifier(id: string, corps: ConsultationEcriture): Observable<ConsultationOpticien> {
    return this.http
      .patch<{ data: { consultation: ApiConsultation } }>(`${BASE_URL}/consultations/${id}`, corps)
      .pipe(map(({ data }) => ConsultationService.normaliser(data.consultation)));
  }

  /** PUT /consultations/{id}/terminer (§8.4) — verrouille définitivement. */
  terminer(id: string): Observable<ConsultationOpticien> {
    return this.http
      .put<{ data: { consultation: ApiConsultation } }>(`${BASE_URL}/consultations/${id}/terminer`, {})
      .pipe(map(({ data }) => ConsultationService.normaliser(data.consultation)));
  }

  /** GET /cabinets/{id}/consultations (§8.6) — `data.consultations[]` avec `patient`. */
  listerParCabinet(cabinetId: string): Observable<ConsultationOpticien[]> {
    return this.http
      .get<{ data: { consultations: ApiConsultation[] } }>(`${BASE_URL}/cabinets/${cabinetId}/consultations`)
      .pipe(map(({ data }) => data.consultations.map(ConsultationService.normaliser)));
  }

  /** GET /patients/{id}/consultations (§8.5). */
  listerParPatient(patientId: string): Observable<ConsultationOpticien[]> {
    return this.http
      .get<{ data: { consultations: ApiConsultation[] } }>(`${BASE_URL}/patients/${patientId}/consultations`)
      .pipe(map(({ data }) => data.consultations.map(ConsultationService.normaliser)));
  }

  private static normaliser(brute: ApiConsultation): ConsultationOpticien {
    const nom = (p?: { prenom?: string | null; nom?: string | null } | null) =>
      [p?.prenom, p?.nom].filter(Boolean).join(' ').trim() || null;
    return {
      id: String(brute.id),
      patientId: String(brute.patient_id),
      patientNom: nom(brute.patient),
      opticienNom: nom(brute.opticien),
      date: brute.date_consultation.slice(0, 10),
      motif: brute.motif ?? '',
      statut: brute.statut,
      modifiable: brute.is_modifiable && !brute.verrouillee && brute.statut === 'en_cours',
      plaintes: brute.plaintes ?? {
        vision_flou_loin: false,
        vision_flou_pres: false,
        vision_double: false,
        demangeaisons: false,
        larmoiement: false,
        autres: null,
      },
      ecartPupillaire: brute.ecart_pupillaire ?? '',
      od: brute.prescription?.od ?? OEIL_VIDE,
      og: brute.prescription?.og ?? OEIL_VIDE,
      observations: brute.observations ?? '',
    };
  }
}
