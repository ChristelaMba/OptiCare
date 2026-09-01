import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

import { environment } from '../../../environments/environment';
import {
  FicheConsultation,
  FicheConsultationHistorique,
  NouvelleFicheConsultationPayload
} from '../../models/fiche-consultation.model';

const BASE_URL = environment.apiUrl.replace(/\/$/, '');

/**
 * Ajoutée le 2026-09-01 : ce service était un stub vide (`export class
 * FicheConsultationService {}`) alors que nouvelle-fiche-consultation.ts
 * n'a jamais réellement envoyé de fiche — enregistrer() faisait juste un
 * console.log(). `POST /consultations` est confirmée au §8 du cahier des
 * charges — voir JOURNAL-MODIFICATIONS-PARTAGEES.md pour le détail du
 * branchement dans nouvelle-fiche-consultation.ts.
 */
@Injectable({
  providedIn: 'root'
})
export class FicheConsultationService {

  private readonly http = inject(HttpClient);

  /** POST /consultations — confirmé au §8 du cahier des charges. */
  creer(payload: NouvelleFicheConsultationPayload): Observable<FicheConsultation> {
    return this.http.post<FicheConsultation>(`${BASE_URL}/consultations`, payload);
  }

  /**
   * TODO : route NON confirmée avec le back-end — §8 ne liste que
   * `GET /patients/{id}/consultations` (clé patientId), pas de route
   * indexée par dossierVisuelId. `dossierVisuelId` choisi ici par
   * cohérence avec B1 (dossier-visuel-patient.ts ne connaît plus de
   * patientId) — décision assumée, à confirmer avec Lionel avant
   * utilisation réelle. Voir POINTS-A-CONFIRMER-BACKEND.md.
   */
  listerParDossierVisuel(dossierVisuelId: string): Observable<FicheConsultationHistorique[]> {
    return this.http.get<FicheConsultationHistorique[]>(`${BASE_URL}/dossiers-visuels/${dossierVisuelId}/consultations`);
  }
}
