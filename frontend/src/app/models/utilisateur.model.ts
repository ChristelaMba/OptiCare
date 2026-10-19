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
  /** id de la table `patients` (≠ `id` utilisateur), renvoyé par `POST /auth/login` dans `user.patient.id`. Requis par `GET /patients/{id}/rdv`. Absent après une inscription (le register ne le renvoie pas) et sur les sessions ouvertes avant le 19/10/2026. */
  patientId?: string;
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

/** Ligne de `GET /admin/users` (ROUTES-API-LIONEL §18.1), mappée pour l'écran « Gestion des comptes ». */
export interface CompteAdmin {
  id: string;
  nom: string;
  prenom: string;
  email: string | null;
  telephone: string;
  ville: string;
  role: RoleUtilisateur;
  actif: boolean;
  /** Nom du cabinet associé ; `null` pour un patient ou le super admin. */
  cabinetNom: string | null;
}

/** `data.stats` de `GET /admin/users` : compteurs sur l'ensemble des comptes (indépendants des filtres). */
export interface StatsComptes {
  total: number;
  superAdmin: number;
  proprietaire: number;
  opticien: number;
  secretaire: number;
  patient: number;
  actifs: number;
  inactifs: number;
}

export interface ApiCompteBrut {
  id: number;
  nom: string;
  prenom: string;
  email: string | null;
  telephone: string;
  ville: string;
  role: RoleUtilisateur;
  is_active: boolean;
  cabinet?: { id: number; nom: string; ville?: string | null } | null;
}

export interface ApiComptesEnveloppe {
  status: string;
  message: string;
  data: {
    users: ApiCompteBrut[];
    stats: {
      total: number;
      super_admin: number;
      proprietaire: number;
      opticien: number;
      secretaire: number;
      patient: number;
      actifs: number;
      inactifs: number;
    };
  };
}
