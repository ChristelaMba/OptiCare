export interface PrescriptionOeilAffichage {
  sphere: string;
  cylindre: string;
  axe: string;
  /** `addition` côté API. */
  add?: string;
  /** Acuité visuelle de loin (`acuite_loin`). */
  avl?: string;
  /** Acuité visuelle de près (`acuite_pres`). */
  avp?: string;
}

export interface Prescription {
  oeilDroit: PrescriptionOeilAffichage;
  oeilGauche: PrescriptionOeilAffichage;
}

export type StatutConsultation = 'en_cours' | 'terminee';

export interface FicheConsultationResume {
  id: string;
  /** `YYYY-MM-DD` (champ `date_consultation` de l'API). */
  date: string;
  motif: string;
  cabinetId: string;
  /** Nom du cabinet ; `null` si introuvable dans la liste publique des cabinets. */
  cabinet: string | null;
  /** « Prénom Nom » de l'opticien ; `null` si absent de la réponse. */
  opticien: string | null;
  statut: StatutConsultation | string;
  plaintes?: string;
  observations?: string;
  /** Présente seulement si l'API renvoie au moins une valeur de prescription. */
  prescription?: Prescription;
}

export interface PatientDossier {
  /** id de la table `patients` (≠ id utilisateur), requis par les routes `/patients/{id}/…`. */
  patientId: string;
  prenom: string;
  nom: string;
  fiches: FicheConsultationResume[];
}

// Formes brutes de `GET /patients/{id}/consultations` (ROUTES-API-LIONEL §8.5), observées le 19/10/2026.
export interface ApiPrescriptionOeilBrute {
  sphere?: string | null;
  cylindre?: string | null;
  axe?: string | null;
  addition?: string | null;
  acuite_loin?: string | null;
  acuite_pres?: string | null;
}

export interface ApiConsultationBrute {
  id: number;
  cabinet_id: number;
  date_consultation: string;
  motif?: string | null;
  statut: string;
  plaintes?: Record<string, boolean | string | null> | null;
  observations?: string | null;
  prescription?: { od?: ApiPrescriptionOeilBrute | null; og?: ApiPrescriptionOeilBrute | null } | null;
  cabinet?: { id: number; nom: string } | null;
  opticien?: { id: number; nom?: string | null; prenom?: string | null } | null;
}
