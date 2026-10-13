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