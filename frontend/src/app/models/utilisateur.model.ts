export type RoleUtilisateur = 'Patient' | 'Secretaire' | 'Opticien' | 'Proprietaire' | 'SuperAdmin';

export interface Utilisateur {
  id: string;
  role: RoleUtilisateur;
  nom: string;
  prenom: string;
  email: string;
  telephone: string;
  ville: string;
  cabinetId?: string; // vide pour Patient et SuperAdmin
  actif: boolean;
  dateCreation: Date;
}
