// Forme non précisée par le Cahier des charges — à confirmer avant le Sprint
// qui affiche/édite réellement les horaires (Sprint 5/6).
export interface HoraireOuverture {
  jour: 'Lundi' | 'Mardi' | 'Mercredi' | 'Jeudi' | 'Vendredi' | 'Samedi' | 'Dimanche';
  ouverture: string; // format 'HH:mm'
  fermeture: string; // format 'HH:mm'
  ferme: boolean;
}

export type StatutValidationCabinet = 'profilIncomplet' | 'enAttente' | 'valide' | 'rejete';

export interface LiensExternes {
  siteWeb?: string;
  facebook?: string;
  instagram?: string;
  tiktok?: string;
}

export interface Cabinet {
  id: string;
  nom: string;
  slogan: string;
  description: string;
  adresse: string;
  quartier: string; // utilisé pour la recherche/filtre
  ville: string;
  telephone: string;
  whatsappNumero: string; // pour la redirection WhatsApp
  email: string;
  logoUrl: string;
  photos: string[];
  liensExternes: LiensExternes;
  horaires: HoraireOuverture[];
  statutValidation: StatutValidationCabinet;
  abonnementPremium: boolean;
  noteMoyenne: number;
  qrCodeUrl: string;
  proprietaireId: string; // reference → Utilisateur
  dateInscription: Date;
}

// Champs collectés dans l'écran completer-profil-cabinet (§6.4),
// avant que le statut ne puisse passer de profilIncomplet à enAttente.
export interface CompleterProfilCabinetPayload {
  slogan: string;
  description: string;
  quartier: string;
  whatsappNumero: string;
  horaires: HoraireOuverture[];
  logoUrl?: string;
  photos?: string[];
  liensExternes?: LiensExternes;
}

// Champs modifiables depuis l'écran vitrine-edition (§9.6) — édition continue,
// utilisable même après validation, contrairement à completerProfil() qui est
// à usage unique et fait passer statutValidation de profilIncomplet à
// enAttente côté back. Recouvre les informations générales (saisies à
// l'inscription mais modifiables ici) ET les mêmes champs éditoriaux que
// CompleterProfilCabinetPayload, sans déclencher cet effet de bord de statut.
export type ModifierCabinetPayload = Pick<
  Cabinet,
  'nom' | 'adresse' | 'telephone' | 'ville' | 'slogan' | 'description' | 'quartier' | 'whatsappNumero' | 'horaires'
> &
  Partial<Pick<Cabinet, 'logoUrl' | 'photos' | 'liensExternes'>>;
