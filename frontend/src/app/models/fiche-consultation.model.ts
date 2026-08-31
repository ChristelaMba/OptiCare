export type StatutFiche =
  | 'terminee'
  | 'brouillon'
  | 'archivee';

export interface SymptomeConsultation {
  baisseVisionLoin: boolean;
  baisseVisionPres: boolean;
  diplopie: boolean;
  cephalees: boolean;
  larmoiement: boolean;
  demangeaisons: boolean;
}

export interface PrescriptionOeil {
  sphere: number | null;
  cylindre: number | null;
  axe: number | null;
  add: number | null;
}

export interface FicheConsultation {

  id: string;

  patientId: string;

  /**
   * Date de la consultation
   * Format recommandé : YYYY-MM-DD
   */
  date: string;

  /**
   * Heure de la consultation
   * Exemple : 09:30
   */
  heure: string;

  /**
   * Motif principal de la consultation
   */
  motif: string;

  /**
   * Statut de la fiche
   */
  statut: StatutFiche;

  /**
   * Opticien ayant réalisé la consultation
   */
  opticien: string;

  /**
   * Cabinet dans lequel la consultation
   * a été réalisée.
   */
  cabinet: string;

  /**
   * Diagnostic posé lors de la consultation.
   */
  diagnostic?: string;

  /**
   * Symptômes déclarés par le patient.
   */
  symptomes: SymptomeConsultation;

  /**
   * Autres plaintes éventuelles.
   */
  autresPlaintes?: string;

  /**
   * Prescription œil droit.
   */
  prescriptionOD: PrescriptionOeil;

  /**
   * Prescription œil gauche.
   */
  prescriptionOG: PrescriptionOeil;

  /**
   * Observations générales de l'opticien.
   */
  observations: string;

  /**
   * Dates techniques facultatives.
   */
  createdAt?: string;

  updatedAt?: string;
}


/**
 * Payload utilisé lors de la création
 * d'une nouvelle fiche de consultation.
 */
export interface NouvelleFicheConsultationPayload {

  patientId: string;

  /**
   * Informations générales de la consultation.
   */
  date?: string;

  heure?: string;

  motif?: string;

  /**
   * Symptômes.
   */
  symptomes: SymptomeConsultation;

  autresPlaintes?: string;

  /**
   * Prescriptions.
   */
  prescriptionOD: PrescriptionOeil;

  prescriptionOG: PrescriptionOeil;

  /**
   * Observations.
   */
  observations: string;
}
export interface PrescriptionOeilSaisie {
  sphere: number | null;
  cylindre: number | null;
  axe: number | null;
  add: number | null;
}

export interface SymptomesFiche {
  baisseVisionLoin: boolean;
  baisseVisionPres: boolean;
  diplopie: boolean;
  cephalees: boolean;
  larmoiement: boolean;
  demangeaisons: boolean;
}

export interface NouvelleFicheConsultationPayload {
  patientId: string;
  symptomes: SymptomesFiche;
  autresPlaintes ?: string;
  prescriptionOD: PrescriptionOeilSaisie;
  prescriptionOG: PrescriptionOeilSaisie;
  observations: string;
}
