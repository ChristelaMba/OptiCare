import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, map } from 'rxjs';

import { environment } from '../../../environments/environment';

import {
  FicheConsultation,
  FicheConsultationHistorique,
  NouvelleFicheConsultationPayload
} from '../../models/fiche-consultation.model';

const BASE_URL = environment.apiUrl.replace(/\/$/, '');

interface ApiResponse<T> {
  status: 'success' | 'error';
  message: string;
  data: T;
}

interface ConsultationsData {
  consultations: FicheConsultationHistorique[];
}

interface ConsultationData {
  consultation: FicheConsultation;
}

@Injectable({
  providedIn: 'root'
})
export class FicheConsultationService {

  private readonly http = inject(HttpClient);

  /**
   * POST /api/consultations
   */
  creer(
    payload: NouvelleFicheConsultationPayload
  ): Observable<FicheConsultation> {

    return this.http
      .post<ApiResponse<ConsultationData>>(
        `${BASE_URL}/consultations`,
        payload
      )
      .pipe(
        map(response => response.data.consultation)
      );
  }

  /**
   * GET /api/patients/{patientId}/consultations
   *
   * Route confirmée par le backend.
   */
  listerParPatient(
    patientId: string | number
  ): Observable<FicheConsultationHistorique[]> {

    return this.http
      .get<ApiResponse<ConsultationsData>>(
        `${BASE_URL}/patients/${patientId}/consultations`
      )
      .pipe(
        map(response => response.data.consultations ?? [])
      );
  }

  /**
   * GET /api/consultations/{id}
   */
  getById(
    consultationId: string | number
  ): Observable<FicheConsultation> {

    return this.http
      .get<ApiResponse<ConsultationData>>(
        `${BASE_URL}/consultations/${consultationId}`
      )
      .pipe(
        map(response => response.data.consultation)
      );
  }
}