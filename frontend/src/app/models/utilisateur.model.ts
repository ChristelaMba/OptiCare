// 2026-09-07 : vocabulaire des rôles aligné sur l'API réelle du back-end
// (minuscules, snake_case pour le dernier). Le cahier des charges (§5, §6.1)
// portait encore le PascalCase 'Patient'/'Opticien'/… — périmé lui aussi.
// Voir Docs/DIAGNOSTIC-VOCABULAIRE-BACKEND.md et l'entrée du 07/09 de
// JOURNAL-MODIFICATIONS-PARTAGEES.md.
export type RoleUtilisateur = 'patient' | 'secretaire' | 'opticien' | 'proprietaire' | 'super_admin';

export interface Utilisateur {
  id: string;
  role: RoleUtilisateur;
  nom: string;
  prenom: string;
  email: string;
  telephone: string;
  ville: string;
  cabinetId?: string; // vide pour patient et super_admin
  actif: boolean;
  dateCreation: Date;
}

/**
 * Libellé lisible d'un rôle, pour l'affichage à l'écran uniquement.
 * La valeur brute ('opticien', 'super_admin'…) reste la seule forme
 * échangée avec l'API et comparée dans le code — n'utiliser cette
 * fonction que dans les templates / textes visibles.
 */
const LIBELLES_ROLE: Record<RoleUtilisateur, string> = {
  patient: 'Patient',
  secretaire: 'Secrétaire',
  opticien: 'Opticien',
  proprietaire: 'Propriétaire',
  super_admin: 'Super Administrateur',
};

export function libelleRole(role: RoleUtilisateur | null | undefined): string {
  return role ? LIBELLES_ROLE[role] : '';
}
