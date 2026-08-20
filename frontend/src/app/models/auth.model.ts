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

export interface ConnexionPayload {
  identifiant: string; // email OU téléphone, tel que saisi
  password: string;
}

export interface AuthResponse {
  token: string;
  utilisateur: Utilisateur;
}
