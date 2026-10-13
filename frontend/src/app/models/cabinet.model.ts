// Forme non précisée par le Cahier des charges, et absente des champs
// confirmés par le back-end le 11/09 (ni dans GET /cabinets, ni dans le
// payload accepté par PATCH /cabinets/{id}/profile) — voir
// POINTS-A-CONFIRMER-BACKEND.md. Conservé ici uniquement pour ne pas casser
// l'UI existante (completer-profil-cabinet, vitrine-edition) : c'est un
// état **front uniquement**, jamais envoyé ni reçu de l'API réelle
// (voir le commentaire sur `Cabinet.horaires` plus bas).
export interface HoraireOuverture {
  jour: 'Lundi' | 'Mardi' | 'Mercredi' | 'Jeudi' | 'Vendredi' | 'Samedi' | 'Dimanche';
  ouverture: string; // format 'HH:mm'
  fermeture: string; // format 'HH:mm'
  ferme: boolean;
}

/**
 * 2026-09-11 : vocabulaire aligné sur l'API réelle du back-end.
 * `'valide'` et `'refuse'` sont **confirmés** — ce sont les valeurs exactes
 * renvoyées par `PUT /admin/cabinets/{id}/verify` et `/reject`
 * (`{ data: { cabinet: { status: "valide", ... } } }` /
 * `{ data: { cabinet: { status: "refuse", ... } } }`).
 * `'en_attente'` est une **hypothèse non confirmée** : aucune vraie réponse
 * serveur ne l'a montrée pour l'instant (aucun cabinet réel visible en
 * liste au 11/09), c'est la valeur la plus probable pour un cabinet pas
 * encore traité, par cohérence avec le reste du vocabulaire de statuts du
 * projet (RendezVous.statut). À confirmer dès qu'un cabinet réel en attente
 * sera visible via `GET /admin/cabinets`. Voir POINTS-A-CONFIRMER-BACKEND.md.
 */
export type StatutCabinet = 'en_attente' | 'valide' | 'refuse';

export interface LiensExternes {
  siteWeb?: string;
  facebook?: string;
  instagram?: string;
  tiktok?: string;
}

/** Sous-objet renvoyé par l'API dans `cabinet.proprietaire` — `nom`/`prenom` confirmés ; `GET /admin/cabinets` en renvoie potentiellement plus (« proprietaire complet », non détaillé par le back). */
export interface ProprietaireCabinet {
  nom: string;
  prenom: string;
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
  abonnementPremium: boolean;
  noteMoyenne: number;
  nombreAvis: number;
  status: StatutCabinet;
  /** Absent de `GET /cabinets` pour un cabinet créé sans propriétaire résolu (ne devrait pas arriver en pratique, mais l'API ne le garantit pas explicitement). */
  proprietaire?: ProprietaireCabinet;
  dateInscription: Date;
  /**
   * ⚠️ FRONT UNIQUEMENT — absent de tous les champs confirmés par le back
   * (`GET /cabinets`, `GET /cabinets/{id}`, payload de
   * `PATCH /cabinets/{id}/profile`). Toujours `[]` en provenance de l'API
   * réelle ; jamais envoyé dans un payload réel non plus (voir
   * `core/services/cabinet.ts`). Gardé dans le modèle et dans les écrans
   * `completer-profil-cabinet`/`vitrine-edition` pour ne pas régresser leur
   * UI, avec une mention explicite « non sauvegardé » à l'écran — voir
   * POINTS-A-CONFIRMER-BACKEND.md.
   */
  horaires: HoraireOuverture[];
}

/**
 * Payload de `PATCH /cabinets/{id}/profile` (auth requise, rôles
 * `proprietaire` ou `super_admin`) — tous les champs sont facultatifs,
 * confirmé le 11/09. Remplace les anciens `CompleterProfilCabinetPayload`
 * et `ModifierCabinetPayload` : le back n'a qu'**une seule** route de mise
 * à jour de profil, sans la distinction « première complétion » vs
 * « édition continue » que le cahier des charges (§6.4 vs §9.6) supposait.
 * Volontairement **sans `horaires`** — absent du contrat confirmé (voir
 * `Cabinet.horaires` ci-dessus).
 */
export interface ProfilCabinetPayload {
  nom?: string;
  adresse?: string;
  ville?: string;
  quartier?: string;
  telephone?: string;
  email?: string;
  whatsappNumero?: string;
  slogan?: string;
  description?: string; // max 2000 côté back
  logoUrl?: string; // max 500 côté back
  photos?: string[];
  siteWeb?: string;
  facebook?: string;
  instagram?: string;
  tiktok?: string;
  abonnementPremium?: boolean;
}

/**
 * Résultat de `valider()` / `refuser()` — les réponses réelles de
 * `PUT /admin/cabinets/{id}/verify` et `/reject` ne renvoient qu'un
 * sous-ensemble de champs (`{ id, status, is_verified, valide_le,
 * valide_par }` / `{ id, status, motif_refus, is_verified }`), pas un
 * `Cabinet` complet — type dédié plutôt que de forcer une normalisation
 * complète sur une réponse partielle.
 */
export interface CabinetValidationResultat {
  id: string;
  status: StatutCabinet;
  estVerifie: boolean;
  valideLe?: Date;
  /** Type exact non confirmé côté back (id ? nom ? les deux ?) — gardé en chaîne brute. */
  validePar?: string;
  motifRefus?: string;
}

// ─────────────────────────────────────────────────────────────────────────
// Formes BRUTES renvoyées par l'API réelle (snake_case) — voir
// `core/services/cabinet.ts` pour la normalisation vers les types
// ci-dessus. Même pattern que `models/auth.model.ts` (`ApiAuthEnveloppe`) :
// transformation à la réception, le reste du front ne manipule jamais ces
// formes brutes directement.
// ─────────────────────────────────────────────────────────────────────────

export interface ApiCabinetBrut {
  id: number;
  nom: string;
  adresse: string;
  ville: string;
  quartier: string;
  telephone: string;
  email: string;
  whatsapp_numero?: string | null;
  slogan?: string | null;
  description?: string | null;
  logo_url?: string | null;
  photos?: string[] | null;
  site_web?: string | null;
  facebook?: string | null;
  instagram?: string | null;
  tiktok?: string | null;
  abonnement_premium?: boolean;
  note_moyenne?: number | null;
  nb_avis?: number | null;
  status: StatutCabinet;
  created_at?: string;
  // `nom`/`prenom` confirmés ; `GET /admin/cabinets` renvoie potentiellement
  // d'autres champs sur ce sous-objet (« proprietaire complet », non détaillé).
  proprietaire?: { nom: string; prenom: string; [cle: string]: unknown } | null;
}

export interface ApiCabinetsEnveloppe {
  data: { cabinets: ApiCabinetBrut[] };
}

export interface ApiCabinetEnveloppe {
  data: { cabinet: ApiCabinetBrut };
}

/** Forme brute (partielle) de la réponse de `verify` / `reject`. */
export interface ApiCabinetValidationBrut {
  id: number;
  status: StatutCabinet;
  is_verified: boolean;
  valide_le?: string | null;
  valide_par?: string | number | null;
  motif_refus?: string | null;
}

export interface ApiCabinetValidationEnveloppe {
  data: { cabinet: ApiCabinetValidationBrut };
}
