import { Utilisateur } from './utilisateur.model';

export interface InscriptionPatientPayload {
  nom: string;
  prenom: string;
  telephone: string;
  ville: string;
  email: string;
  date_naissance: string; // format ISO 'YYYY-MM-DD'
  password: string;
  password_confirmation: string;
}

export interface InscriptionCabinetPayload {
  nom: string;
  prenom: string;
  telephone: string;
  ville: string;
  email: string; // email du compte personnel du propriétaire (sert à la connexion)
  password: string;
  password_confirmation: string;
  cabinet_nom: string;
  cabinet_adresse: string;
  cabinet_telephone: string;
  cabinet_ville: string;
  cabinet_email: string; // email public du cabinet — jamais utilisé pour la connexion
}

/**
 * ADAPTATION TEMPORAIRE (confirmée le 04/09) : le design prévoyait un champ
 * unique `identifiant` acceptant email OU téléphone (§6.3 du cahier des
 * charges), mais le back de Lionel n'accepte pour l'instant que le
 * téléphone sur `POST /auth/login`. Confirmé en conditions réelles avec des
 * identifiants volontairement invalides :
 * `POST https://opticare.alwaysdata.net/api/auth/login {telephone, password}`
 * → 401, corps JSON `{"errors":{"telephone":["Les identifiants sont
 * incorrects."]}}` — le serveur valide bien contre le champ `telephone`
 * précisément (pas un 404, pas un 422 de validation sur un champ
 * inconnu), ce qui confirme à la fois la route et ce nom de champ. Lionel
 * a été prévenu et doit élargir sa route plus tard.
 *
 * TODO : revenir à `identifiant: string` (email OU téléphone) une fois le
 * back mis à jour — voir POINTS-A-CONFIRMER-BACKEND.md et
 * JOURNAL-MODIFICATIONS-PARTAGEES.md (entrée du 04/09) pour le détail.
 */
export interface ConnexionPayload {
  telephone: string;
  password: string;
}

export interface AuthResponse {
  token: string;
  utilisateur: Utilisateur;
}
