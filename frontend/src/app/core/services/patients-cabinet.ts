import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { map, Observable } from 'rxjs';

import { environment } from '../../../environments/environment';

const BASE_URL = environment.apiUrl.replace(/\/$/, '');

/** Patient d'un cabinet (`GET /cabinets/{id}/patients`, ROUTES-API-LIONEL §7.1). */
export interface PatientCabinet {
  id: string;
  nom: string;
  prenom: string;
  nomComplet: string;
  telephone: string;
  email: string | null;
  ville: string | null;
  /**
   * Date d'ajout du patient au cabinet, `AAAA-MM-JJ` ou `null` si le serveur
   * ne renvoie pas `created_at`. Seule date disponible par patient : l'API ne
   * fournit ni dernière consultation, ni dernier rendez-vous.
   */
  dateInscription: string | null;
}

/** POST /cabinets/{id}/patients (§7.2) : `nom`, `prenom`, `telephone` obligatoires ; le reste est facultatif. */
export interface CreerPatientPayload {
  nom: string;
  prenom: string;
  telephone: string;
  email?: string;
  ville?: string;
  date_naissance?: string;
  adresse?: string;
}

interface ApiPatientBrut {
  id: number;
  nom: string;
  prenom: string;
  telephone: string;
  email?: string | null;
  ville?: string | null;
  created_at?: string | null;
}

/**
 * Patients d'un cabinet — lecture seule (opticien, propriétaire, secrétaire). L'API ne fournit ni âge, ni sexe,
 * ni quartier, ni nombre de consultations : ces données ne sont pas inventées.
 */
@Injectable({
  providedIn: 'root',
})
export class PatientsCabinet {
  private readonly http = inject(HttpClient);

  /** GET /cabinets/{id}/patients (§7.1), `search` facultatif. */
  lister(cabinetId: string, search?: string): Observable<PatientCabinet[]> {
    let params = new HttpParams();
    if (search) params = params.set('search', search);
    return this.http
      .get<{ data: { patients: ApiPatientBrut[] } }>(`${BASE_URL}/cabinets/${cabinetId}/patients`, { params })
      .pipe(map(({ data }) => data.patients.map(PatientsCabinet.normaliser)));
  }

  /** GET /cabinets/{id}/patients/{patientId} (§7.3). */
  obtenir(cabinetId: string, patientId: string): Observable<PatientCabinet> {
    return this.http
      .get<{ data: { patient: ApiPatientBrut } }>(`${BASE_URL}/cabinets/${cabinetId}/patients/${patientId}`)
      .pipe(map(({ data }) => PatientsCabinet.normaliser(data.patient)));
  }

  /** POST /cabinets/{id}/patients (§7.2) — 201, `data.patient` (testé le 20/10/2026 : `est_interne: true`, `user_id: null`). */
  creer(cabinetId: string, payload: CreerPatientPayload): Observable<PatientCabinet> {
    return this.http
      .post<{ data: { patient: ApiPatientBrut } }>(`${BASE_URL}/cabinets/${cabinetId}/patients`, payload)
      .pipe(map(({ data }) => PatientsCabinet.normaliser(data.patient)));
  }

  private static normaliser(p: ApiPatientBrut): PatientCabinet {
    return {
      id: String(p.id),
      nom: p.nom,
      prenom: p.prenom,
      nomComplet: `${p.prenom} ${p.nom}`.trim(),
      telephone: p.telephone,
      email: p.email ?? null,
      ville: p.ville ?? null,
      dateInscription: p.created_at?.slice(0, 10) ?? null,
    };
  }
}
