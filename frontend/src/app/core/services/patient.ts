import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

import { Patient } from '../../models/patient.model';

@Injectable({
  providedIn: 'root'
})
export class PatientService {

  private readonly http = inject(HttpClient);

  private readonly apiUrl = '/api/patients';

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