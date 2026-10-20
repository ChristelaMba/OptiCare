/**
 * Commande de verres de l'opticien (ROUTES-API-LIONEL §9). Forme réelle observée le 20/10/2026 (cabinet 6, commande 65) :
 * `POST /commandes` et `PATCH /commandes/{id}` en **format à plat** (`diag_od_sphere`… pour le diagnostic), `antireflet`
 * **booléen**, valeurs de diagnostic en **chaînes** ; en lecture, le diagnostic est imbriqué (`diagnostic.od/og`).
 * L'objet renvoyé ne contient **pas** le patient : il s'obtient par la consultation (`consultation_id`).
 */
export type StatutCommande = 'initie' | 'en_cours' | 'en_verification' | 'termine';

export const STATUTS_COMMANDE: StatutCommande[] = ['initie', 'en_cours', 'en_verification', 'termine'];

export interface DiagnosticOeil {
  sphere: string | null;
  cylindre: string | null;
  axe: string | null;
  addition: string | null;
}

export interface Commande {
  id: string;
  consultationId: string;
  numeroMonture: string;
  typeVerre: string;
  teinte: string;
  descriptionFoyers: string;
  port: string;
  antireflet: boolean | null;
  od: DiagnosticOeil;
  og: DiagnosticOeil;
  statut: StatutCommande;
  notes: string;
  /** `YYYY-MM-DD`. */
  dateCreation: string;
  consultationMotif: string;
  opticienNom: string | null;
  /** Une commande terminée est en lecture seule (le serveur répond 422 à toute modification). */
  modifiable: boolean;
}

export interface ApiCommandeBrute {
  id: number;
  consultation_id: number;
  numero_monture?: string | null;
  type_verre?: string | null;
  teinte?: string | null;
  description_foyers?: string | null;
  port?: string | null;
  antireflet?: boolean | null;
  diagnostic?: { od?: Partial<DiagnosticOeil> | null; og?: Partial<DiagnosticOeil> | null } | null;
  statut: StatutCommande;
  notes?: string | null;
  created_at: string;
  consultation?: { id: number; date_consultation?: string | null; motif?: string | null } | null;
  opticien?: { id: number; nom?: string | null; prenom?: string | null } | null;
}

/** Corps à plat de `POST /commandes` (`consultation_id` obligatoire, le reste facultatif). */
export interface NouvelleCommandePayload {
  consultation_id: number;
  numero_monture?: string;
  type_verre?: string;
  teinte?: string;
  description_foyers?: string;
  port?: string;
  antireflet?: boolean;
  diag_od_sphere?: string;
  diag_od_cylindre?: string;
  diag_od_axe?: string;
  diag_od_addition?: string;
  diag_og_sphere?: string;
  diag_og_cylindre?: string;
  diag_og_axe?: string;
  diag_og_addition?: string;
  notes?: string;
}
