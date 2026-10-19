import { Service, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { map, Observable } from 'rxjs';

import { environment } from '../../../environments/environment';

const BASE_URL = environment.apiUrl.replace(/\/$/, '');

/** Avis public d'un cabinet, tel que renvoyé par `GET /cabinets/{id}/avis` (ROUTES-API-LIONEL §12.1). */
export interface AvisPublic {
  id: number;
  note: number;
  commentaire: string | null;
  created_at: string;
  patient: { nom: string; prenom: string } | null;
}

interface ApiAvisEnveloppe {
  status: string;
  message: string;
  data: {
    avis: AvisPublic[];
    moyenne: number;
    total: number;
    repartition: Record<string, number>;
  };
}

@Service()
export class Avis {
  private readonly http = inject(HttpClient);

  /** GET /cabinets/{id}/avis — public, sans auth (200 testé le 18/10/2026, liste vide tant qu'aucun avis n'existe). */
  listerParCabinet(cabinetId: string): Observable<AvisPublic[]> {
    return this.http
      .get<ApiAvisEnveloppe>(`${BASE_URL}/cabinets/${cabinetId}/avis`)
      .pipe(map((enveloppe) => enveloppe.data.avis));
  }
}
