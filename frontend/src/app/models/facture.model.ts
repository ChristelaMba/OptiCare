/**
 * Facture (ROUTES-API-LIONEL §11), rattachée à une commande. Forme réelle observée le 20/10/2026 (facture 88) :
 * numéro `FAC-AAAA-NNNNN`, `montant` et `montant_paye` renvoyés en **chaînes avec décimales** (`"20000.00"`),
 * `solde_restant` en nombre. Montants en francs CFA : l'interface les affiche arrondis à l'entier, sans décimales inventées.
 */
export type TypeFacture = 'acompte' | 'solde' | 'unique';
export type StatutFacture = 'impaye' | 'partiel' | 'paye' | 'annule';

export const TYPES_FACTURE: TypeFacture[] = ['acompte', 'solde', 'unique'];
export const STATUTS_FACTURE: StatutFacture[] = ['impaye', 'partiel', 'paye', 'annule'];

export interface Facture {
  id: string;
  /** Ex. `FAC-2026-00088`, fourni par le serveur. */
  numero: string;
  commandeId: string;
  patientId: string;
  patientNom: string | null;
  type: TypeFacture;
  montant: number;
  montantPaye: number;
  soldeRestant: number;
  statut: StatutFacture;
  /** `YYYY-MM-DD` ou `null`. */
  dateEmission: string | null;
  dateEcheance: string | null;
  datePaiement: string | null;
  description: string;
}

export interface ApiFactureBrute {
  id: number;
  numero: string;
  commande_id: number;
  patient_id: number;
  type: TypeFacture;
  montant: string | number;
  montant_paye: string | number;
  solde_restant: string | number;
  statut: StatutFacture;
  date_emission?: string | null;
  date_echeance?: string | null;
  date_paiement?: string | null;
  description?: string | null;
  patient?: { id: number; nom?: string | null; prenom?: string | null } | null;
}

/** Corps de `POST /commandes/{id}/factures` : `type` et `montant` obligatoires. `montant_paye` omis = 0. */
export interface NouvelleFacturePayload {
  type: TypeFacture;
  montant: number;
  description?: string;
  date_echeance?: string;
}
