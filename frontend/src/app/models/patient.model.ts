export type Sexe = 'M' | 'F' | 'Autre';

export interface Patient {
  id: string;

  // Relations avec les autres entités
  utilisateurId?: string; // reference → Utilisateur — vide si non-utilisateur
  estUtilisateur: boolean;
  cabinetCreateurId?: string; // reference → Cabinet — pour un patient non-utilisateur
  dossierVisuelId: string; // reference → DossierVisuel

  // Identité
  nom: string;
  prenom: string;

  // Informations personnelles
  dateNaissance?: string;
  age: number;
  sexe: Sexe;
  telephone: string;
  whatsapp?: string;

  // Informations descriptives
  profession?: string;
  quartier?: string;
  nombreEnfants?: number;
  derniereVisite?: string;
}

/**
 * Classification propre à la vue "Mes patients" de l'opticien —
 * ex. mes-patients.ts. N'existe pas dans le vrai Patient du §5 : c'est
 * une donnée dérivée de l'activité du patient (nombre/récence des
 * consultations), pas un attribut du patient lui-même.
 *
 * TODO : critère de calcul NON confirmé avec le back-end (seuil de
 * temps pour basculer de 'Actif' à 'À suivre' ?). Hypothèse provisoire.
 */
export type StatutPatientOpticien = 'Actif' | 'À suivre';

/**
 * Vue résumée d'un Patient pour la liste "Mes patients" de l'opticien —
 * ex. mes-patients.ts (déplacée depuis une interface locale
 * `PatientOpticien` qui dupliquait Patient). Même principe que
 * FicheConsultationHistorique à côté de FicheConsultation.
 */
export interface PatientOpticienResume {
  id: string;
  dossierVisuelId: string;
  prenom: string;
  nom: string;
  age: number;
  sexe: Sexe;
  telephone: string;
  quartier: string;
  derniereConsultation: string | null;
  nombreConsultations: number;
  statut: StatutPatientOpticien;
}