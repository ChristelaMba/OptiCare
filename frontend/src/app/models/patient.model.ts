export interface Patient {
  id: string;
  utilisateurId?: string; // reference → Utilisateur — vide si non-utilisateur
  estUtilisateur: boolean;
  nom: string;
  prenom: string;
  telephone: string;
  dateNaissance: Date;
  sexe: 'M' | 'F';
  cabinetCreateurId?: string; // reference → Cabinet — pour un patient non-utilisateur
  dossierVisuelId: string; // reference → DossierVisuel
}
