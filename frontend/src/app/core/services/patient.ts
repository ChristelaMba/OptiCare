import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

import { environment } from '../../../environments/environment';
import { Patient } from '../../models/patient.model';

@Injectable({
  providedIn: 'root'
})
export class PatientService {

  private readonly http = inject(HttpClient);

  /**
   * Correction du 2026-09-01 : ce champ valait `/api/patients`, une URL
   * relative résolue contre l'origine du front — jamais contre
   * `environment.apiUrl` comme tous les autres services. En prod, ça
   * aurait appelé le serveur qui héberge le front lui-même, pas l'API
   * réelle ; en dev, ça ne matchait aucun intercepteur mock (tous
   * filtrent sur `environment.apiUrl`). Découvert en câblant
   * nouvelle-fiche-consultation.ts sur getPatientById() — voir
   * JOURNAL-MODIFICATIONS-PARTAGEES.md.
   *
   * TODO : `GET /patients/{id}` (utilisée par getPatientById) n'apparaît
   * pas au §8 du cahier des charges — seule `GET /patients/{id}/consultations`
   * y figure. Route hypothèse, à confirmer (voir POINTS-A-CONFIRMER-BACKEND.md).
   */
  private readonly apiUrl = `${environment.apiUrl.replace(/\/$/, '')}/patients`;

  /**
   * Récupérer tous les patients
   */
  getPatients(): Observable<Patient[]> {
    return this.http.get<Patient[]>(this.apiUrl);
  }

  /**
   * Récupérer un patient par son identifiant
   */
  getPatientById(id: string): Observable<Patient> {
    return this.http.get<Patient>(`${this.apiUrl}/${id}`);
  }

  /**
   * Créer un nouveau patient
   */
  createPatient(patient: Omit<Patient, 'id'>): Observable<Patient> {
    return this.http.post<Patient>(this.apiUrl, patient);
  }

  /**
   * Modifier un patient
   */
  updatePatient(
    id: string,
    patient: Partial<Patient>
  ): Observable<Patient> {
    return this.http.patch<Patient>(
      `${this.apiUrl}/${id}`,
      patient
    );
  }

  /**
   * Supprimer un patient
   */
  deletePatient(id: string): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${id}`);
  }
}