import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { map, Observable } from 'rxjs';

import { environment } from '../../../environments/environment';
import {
  ApiCommandeBrute,
  Commande,
  DiagnosticOeil,
  NouvelleCommandePayload,
  StatutCommande,
} from '../../models/commande.model';

const BASE_URL = environment.apiUrl.replace(/\/$/, '');

const OEIL_VIDE: DiagnosticOeil = { sphere: null, cylindre: null, axe: null, addition: null };

/**
 * Commandes (ROUTES-API-LIONEL §9, essais réels du 20/10/2026) :
 * POST /commandes · GET /commandes/{id} · PATCH /commandes/{id} · GET /consultations/{id}/commandes ·
 * GET /cabinets/{id}/commandes. Écriture à plat ; `statut` ∈ initie | en_cours | en_verification | termine.
 * Remplace l'ancien `PATCH /commandes/{id}/statut` (route inexistante).
 */
@Injectable({
  providedIn: 'root',
})
export class CommandeService {
  private readonly http = inject(HttpClient);

  /** GET /cabinets/{id}/commandes (§9.5). */
  listerParCabinet(cabinetId: string): Observable<Commande[]> {
    return this.http
      .get<{ data: { commandes: ApiCommandeBrute[] } }>(`${BASE_URL}/cabinets/${cabinetId}/commandes`)
      .pipe(map(({ data }) => data.commandes.map(CommandeService.normaliser)));
  }

  /** GET /consultations/{id}/commandes (§9.4). */
  listerParConsultation(consultationId: string): Observable<Commande[]> {
    return this.http
      .get<{ data: { commandes: ApiCommandeBrute[] } }>(`${BASE_URL}/consultations/${consultationId}/commandes`)
      .pipe(map(({ data }) => data.commandes.map(CommandeService.normaliser)));
  }

  /** GET /commandes/{id} (§9.2). */
  obtenir(id: string): Observable<Commande> {
    return this.http
      .get<{ data: { commande: ApiCommandeBrute } }>(`${BASE_URL}/commandes/${id}`)
      .pipe(map(({ data }) => CommandeService.normaliser(data.commande)));
  }

  /** POST /commandes (§9.1) — `consultation_id` obligatoire ; 201 avec `statut: initie`. */
  creer(payload: NouvelleCommandePayload): Observable<Commande> {
    return this.http
      .post<{ data: { commande: ApiCommandeBrute } }>(`${BASE_URL}/commandes`, payload)
      .pipe(map(({ data }) => CommandeService.normaliser(data.commande)));
  }

  /** PATCH /commandes/{id} avec `{ statut }` (§9.3). 422 si la commande est terminée. */
  changerStatut(id: string, statut: StatutCommande): Observable<Commande> {
    return this.http
      .patch<{ data: { commande: ApiCommandeBrute } }>(`${BASE_URL}/commandes/${id}`, { statut })
      .pipe(map(({ data }) => CommandeService.normaliser(data.commande)));
  }

  private static normaliser(brute: ApiCommandeBrute): Commande {
    const oeil = (o?: Partial<DiagnosticOeil> | null): DiagnosticOeil => ({ ...OEIL_VIDE, ...(o ?? {}) });
    const opticien = [brute.opticien?.prenom, brute.opticien?.nom].filter(Boolean).join(' ').trim();
    return {
      id: String(brute.id),
      consultationId: String(brute.consultation_id),
      numeroMonture: brute.numero_monture ?? '',
      typeVerre: brute.type_verre ?? '',
      teinte: brute.teinte ?? '',
      descriptionFoyers: brute.description_foyers ?? '',
      port: brute.port ?? '',
      antireflet: brute.antireflet ?? null,
      od: oeil(brute.diagnostic?.od),
      og: oeil(brute.diagnostic?.og),
      statut: brute.statut,
      notes: brute.notes ?? '',
      dateCreation: brute.created_at.slice(0, 10),
      consultationMotif: brute.consultation?.motif ?? '',
      opticienNom: opticien || null,
      modifiable: brute.statut !== 'termine',
    };
  }
}
