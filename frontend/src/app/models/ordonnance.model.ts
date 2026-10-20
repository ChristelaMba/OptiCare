/**
 * Ordonnance (ROUTES-API-LIONEL §10). Forme réelle observée le 20/10/2026 (ordonnance 102, consultation 114) :
 * numéro `ORD-AAAA-NNNNN`, prescription imbriquée en lecture (`prescription.od/og` + `ecart_pupillaire`),
 * écriture à plat (`od_sphere`, `og_axe`, `ecart_pupillaire`…), valeurs en **chaînes**. Une seule ordonnance par
 * consultation terminée.
 */
export interface PrescriptionOeilOrdonnance {
  sphere: string | null;
  cylindre: string | null;
  axe: string | null;
  addition: string | null;
}

export interface Ordonnance {
  id: string;
  /** Ex. `ORD-2026-00102`, fourni par le serveur. */
  numero: string;
  consultationId: string;
  patientId: string;
  patientNom: string | null;
  opticienNom: string | null;
  od: PrescriptionOeilOrdonnance;
  og: PrescriptionOeilOrdonnance;
  ecartPupillaire: string;
  recommandations: string;
  /** `YYYY-MM-DD` ou `null`. */
  dateEmission: string | null;
  dateValidite: string | null;
}

export interface ApiOrdonnanceBrute {
  id: number;
  numero: string;
  consultation_id: number;
  patient_id: number;
  prescription?: {
    od?: Partial<PrescriptionOeilOrdonnance> | null;
    og?: Partial<PrescriptionOeilOrdonnance> | null;
    ecart_pupillaire?: string | null;
  } | null;
  recommandations?: string | null;
  date_emission?: string | null;
  date_validite?: string | null;
  patient?: { id: number; nom?: string | null; prenom?: string | null } | null;
  opticien?: { id: number; nom?: string | null; prenom?: string | null } | null;
}

/** Corps à plat de `POST /consultations/{id}/ordonnances` : tous les champs sont facultatifs, valeurs en chaînes. */
export interface NouvelleOrdonnancePayload {
  od_sphere?: string;
  od_cylindre?: string;
  od_axe?: string;
  od_addition?: string;
  og_sphere?: string;
  og_cylindre?: string;
  og_axe?: string;
  og_addition?: string;
  ecart_pupillaire?: string;
  recommandations?: string;
  date_emission?: string;
  date_validite?: string;
}
