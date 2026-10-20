import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { map, Observable } from 'rxjs';

import { environment } from '../../../environments/environment';
import { ApiFactureBrute, Facture, NouvelleFacturePayload, StatutFacture } from '../../models/facture.model';

const BASE_URL = environment.apiUrl.replace(/\/$/, '');

/**
 * Factures (ROUTES-API-LIONEL §11, essais réels du 20/10/2026) :
 * POST /commandes/{id}/factures · GET /cabinets/{id}/factures (`statut`, `search`) · GET /factures/{id} ·
 * PUT /factures/{id}/paiement (`montant_paye` > 0). Le serveur renvoie les montants en chaînes (`"20000.00"`) :
 * ils sont convertis en nombres ; l'affichage est en francs CFA, sans décimales.
 */
@Injectable({
  providedIn: 'root',
})
export class FactureService {
  private readonly http = inject(HttpClient);

  /** GET /cabinets/{id}/factures (§11.2). */
  listerParCabinet(cabinetId: string, filtres: { statut?: StatutFacture; search?: string } = {}): Observable<Facture[]> {
    let params = new HttpParams();
    if (filtres.statut) params = params.set('statut', filtres.statut);
    if (filtres.search) params = params.set('search', filtres.search);
    return this.http
      .get<{ data: { factures: ApiFactureBrute[] } }>(`${BASE_URL}/cabinets/${cabinetId}/factures`, { params })
      .pipe(map(({ data }) => data.factures.map(FactureService.normaliser)));
  }

  /** GET /factures/{id} (§11.3). */
  obtenir(id: string): Observable<Facture> {
    return this.http
      .get<{ data: { facture: ApiFactureBrute } }>(`${BASE_URL}/factures/${id}`)
      .pipe(map(({ data }) => FactureService.normaliser(data.facture)));
  }

  /** POST /commandes/{commandeId}/factures (§11.1) — `type` et `montant` obligatoires ; 201, statut `impaye`. */
  creer(commandeId: string, payload: NouvelleFacturePayload): Observable<Facture> {
    return this.http
      .post<{ data: { facture: ApiFactureBrute } }>(`${BASE_URL}/commandes/${commandeId}/factures`, payload)
      .pipe(map(({ data }) => FactureService.normaliser(data.facture)));
  }

  /** PUT /factures/{id}/paiement (§11.4) — `montant_paye` supérieur à 0 ; la réponse porte le cumul, le solde et le statut. */
  enregistrerPaiement(id: string, montantPaye: number): Observable<Facture> {
    return this.http
      .put<{ data: { facture: ApiFactureBrute } }>(`${BASE_URL}/factures/${id}/paiement`, { montant_paye: montantPaye })
      .pipe(map(({ data }) => FactureService.normaliser(data.facture)));
  }

  private static normaliser(brute: ApiFactureBrute): Facture {
    const nombre = (v: string | number | null | undefined) => Number(v ?? 0) || 0;
    const patient = [brute.patient?.prenom, brute.patient?.nom].filter(Boolean).join(' ').trim();
    return {
      id: String(brute.id),
      numero: brute.numero,
      commandeId: String(brute.commande_id),
      patientId: String(brute.patient_id),
      patientNom: patient || null,
      type: brute.type,
      montant: nombre(brute.montant),
      montantPaye: nombre(brute.montant_paye),
      soldeRestant: nombre(brute.solde_restant),
      statut: brute.statut,
      dateEmission: brute.date_emission?.slice(0, 10) ?? null,
      dateEcheance: brute.date_echeance?.slice(0, 10) ?? null,
      datePaiement: brute.date_paiement?.slice(0, 10) ?? null,
      description: brute.description ?? '',
    };
  }
}
