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
}

interface ApiPatientBrut {
  id: number;
  nom: string;
  prenom: string;
  telephone: string;
  email?: string | null;
  ville?: string | null;
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
      .pipe(
        map(({ data }) =>
          data.patients.map((p) => ({
            id: String(p.id),
            nom: p.nom,
            prenom: p.prenom,
            nomComplet: `${p.prenom} ${p.nom}`.trim(),
            telephone: p.telephone,
            email: p.email ?? null,
            ville: p.ville ?? null,
          })),
        ),
      );
  }
}
