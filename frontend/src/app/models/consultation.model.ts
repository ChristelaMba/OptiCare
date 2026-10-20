/**
 * Consultation vue par l'opticien (ROUTES-API-LIONEL §8). Forme réelle observée le 20/10/2026 (cabinet 6).
 *
 * ÉCRITURE : le format accepté par POST/PATCH est **à plat** (`plainte_*`, `od_*`, `og_*`, `ecart_pupillaire`),
 * tous les champs de prescription sont des **chaînes** (`od_axe: 90` → 422 « must be a string »). Le format imbriqué
 * de la lecture (`plaintes{}`, `prescription{od,og}`) est silencieusement ignoré à l'écriture. En lecture, il est
 * imbriqué.
 */
export type StatutConsultationApi = 'en_cours' | 'terminee';

export interface PrescriptionOeilConsultation {
  sphere: string | null;
  cylindre: string | null;
  axe: string | null;
  addition: string | null;
  acuite_loin: string | null;
  acuite_pres: string | null;
}

export interface PlaintesConsultation {
  vision_flou_loin: boolean;
  vision_flou_pres: boolean;
  vision_double: boolean;
  demangeaisons: boolean;
  larmoiement: boolean;
  autres: string | null;
}

export interface PersonneResume {
  id: number;
  nom: string;
  prenom: string;
  telephone?: string | null;
}

/** Réponse brute de `GET /consultations/{id}`, `POST`, `PATCH`, `PUT /terminer`, et des deux listes. */
export interface ApiConsultation {
  id: number;
  patient_id: number;
  cabinet_id: number;
  opticien_id: number | null;
  rdv_id: number | null;
  date_consultation: string;
  motif: string | null;
  plaintes: PlaintesConsultation | null;
  ecart_pupillaire: string | null;
  prescription: { od: PrescriptionOeilConsultation; og: PrescriptionOeilConsultation } | null;
  observations: string | null;
  statut: StatutConsultationApi;
  verrouillee: boolean;
  is_modifiable: boolean;
  /** Présent sur `GET /cabinets/{id}/consultations`, `POST`, `GET /consultations/{id}`. */
  patient?: PersonneResume | null;
  /** Présent sur les consultations d'un patient et sur le détail. */
  opticien?: PersonneResume | null;
}

export interface ConsultationOpticien {
  id: string;
  patientId: string;
  /** Cabinet de la consultation (`cabinet_id`) — nécessaire aux écrans patient (ex. avis éligibles). */
  cabinetId: string;
  /** « Prénom Nom » du patient ; `null` si l'API ne renvoie pas l'objet `patient`. */
  patientNom: string | null;
  opticienNom: string | null;
  /** `YYYY-MM-DD`. */
  date: string;
  motif: string;
  statut: StatutConsultationApi;
  /** Verrouillée ou terminée : lecture seule. */
  modifiable: boolean;
  plaintes: PlaintesConsultation;
  ecartPupillaire: string;
  od: PrescriptionOeilConsultation;
  og: PrescriptionOeilConsultation;
  observations: string;
}

/** Corps à plat de `POST /consultations` et `PATCH /consultations/{id}` (champs de prescription : chaînes). */
export interface ConsultationEcriture {
  patient_id?: number;
  cabinet_id?: number;
  date_consultation?: string;
  motif?: string;
  plainte_vision_flou_loin?: boolean;
  plainte_vision_flou_pres?: boolean;
  plainte_vision_double?: boolean;
  plainte_demangeaisons?: boolean;
  plainte_larmoiement?: boolean;
  plainte_autres?: string;
  ecart_pupillaire?: string;
  observations?: string;
  od_sphere?: string;
  od_cylindre?: string;
  od_axe?: string;
  od_addition?: string;
  od_acuite_loin?: string;
  od_acuite_pres?: string;
  og_sphere?: string;
  og_cylindre?: string;
  og_axe?: string;
  og_addition?: string;
  og_acuite_loin?: string;
  og_acuite_pres?: string;
}

/**
 * Corps de `PATCH /consultations/{id}` : seuls les champs modifiés sont envoyés ; `null` vide un champ
 * (testé le 20/10/2026 sur la consultation 116 : `''` et `null` renvoient 200 et le champ relu vaut `null`).
 */
export type ConsultationModification = {
  [K in keyof Omit<ConsultationEcriture, 'patient_id' | 'cabinet_id'>]?: ConsultationEcriture[K] | null;
};
