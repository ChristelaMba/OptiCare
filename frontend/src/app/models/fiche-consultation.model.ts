export type StatutFiche =
  | 'terminee'
  | 'brouillon'
  | 'archivee';

/**
 * Renommée de SymptomeConsultation le 2026-09-02 (B2) : 5 champs exacts
 * du §5 du cahier des charges (visionFlouLoin, visionFlouPres,
 * visionDouble, demangeaisons, larmoiement). `cephalees` (qui existait
 * ici) n'a aucun équivalent dans le §5 — retiré, voir
 * nouvelle-fiche-consultation.ts (le champ passe par `autresPlaintes`
 * en texte libre désormais). `diplopie` renommé en `visionDouble`
 * (même notion médicale, nom du §5).
 */
export interface Plaintes {
  visionFlouLoin: boolean;
  visionFlouPres: boolean;
  visionDouble: boolean;
  demangeaisons: boolean;
  larmoiement: boolean;
}

export interface PrescriptionOeil {
  sphere: number | null;
  cylindre: number | null;
  axe: number | null;
  add: number | null;
  avl: string; // acuité visuelle de loin — §5 du cahier des charges
  avp: string; // acuité visuelle de près — §5 du cahier des charges
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
   * Plaintes déclarées par le patient — §5 du cahier des charges.
   */
  plaintes: Plaintes;

  /**
   * Autres plaintes éventuelles.
   */
  autresPlaintes?: string;

  // --- Identité déclarée à cette visite précise (snapshot, indépendant
  // du DossierVisuel) — §5 du cahier des charges. Ajoutés en catégorie A
  // (voir POINTS-A-CORRIGER-NOELLY.md) : aucun consommateur actuel
  // (FicheConsultation n'est importée nulle part), donc sans risque.
  // Obligatoires comme dans le §5 (pas de `?`, sauf mention contraire).
  nom: string;
  age: number;
  sexe: 'M' | 'F';
  telephone: string;
  whatsapp: string;
  profession: string;
  quartier: string;
  nombreEnfants: number;

  // --- Contexte — §5 du cahier des charges.
  dateAnciennePrescription?: string;
  puissanceAncienneCorrection?: string;
  commentConnuCabinet: string;

  /**
   * Écart pupillaire global (en mm) — §5 du cahier des charges.
   */
  ecartPupillaire: number;

  /**
   * Prescription œil droit.
   */
  prescriptionOeilDroit: PrescriptionOeil;

  /**
   * Prescription œil gauche.
   */
  prescriptionOeilGauche: PrescriptionOeil;

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
 *
 * `patientId` retiré le 2026-09-02 (B1) : nouvelle-fiche-consultation.ts
 * ne connaît plus que dossierVisuelId (reçu via la route), plus
 * patientId — voir JOURNAL-MODIFICATIONS-PARTAGEES.md.
 */
export interface NouvelleFicheConsultationPayload {

  /**
   * Références réelles du §5 du cahier des charges (flux PriseEnCharge →
   * FicheConsultation).
   */
  dossierVisuelId: string;

  priseEnChargeId: string;

  cabinetId: string;

  opticienId: string;

  /**
   * Informations générales de la consultation.
   */
  date?: string;

  heure?: string;

  motif?: string;

  /**
   * Plaintes — §5 du cahier des charges.
   */
  plaintes: Plaintes;

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
  avl: string;
  avp: string;
}

/** Miroir de Plaintes pour la seconde déclaration dupliquée ci-dessous — voir PrescriptionOeilSaisie. */
export interface PlaintesSaisie {
  visionFlouLoin: boolean;
  visionFlouPres: boolean;
  visionDouble: boolean;
  demangeaisons: boolean;
  larmoiement: boolean;
}

export interface NouvelleFicheConsultationPayload {
  plaintes: PlaintesSaisie;
  autresPlaintes ?: string;
  prescriptionOD: PrescriptionOeilSaisie;
  prescriptionOG: PrescriptionOeilSaisie;
  observations: string;
}
