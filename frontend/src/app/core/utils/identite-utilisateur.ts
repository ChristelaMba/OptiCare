import { Utilisateur } from '../../models/utilisateur.model';

/** « Prénom Nom » de l'utilisateur connecté (chaîne vide si personne n'est connecté). */
export function nomCompletUtilisateur(utilisateur: Utilisateur | null): string {
  return utilisateur ? `${utilisateur.prenom} ${utilisateur.nom}`.trim() : '';
}

/** Initiales (2 lettres max, majuscules) pour les avatars. */
export function initialesUtilisateur(utilisateur: Utilisateur | null): string {
  if (!utilisateur) {
    return '';
  }
  return `${utilisateur.prenom.charAt(0)}${utilisateur.nom.charAt(0)}`.toUpperCase();
}
