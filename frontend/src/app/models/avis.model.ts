/**
 * Avis — modèles partagés côté patient et cabinet.
 *
 * Contrat officiel de l'API des avis (récapitulé dans `Docs/ROUTES-API-LIONEL.txt §14`) :
 * - `GET /cabinets/{id}/avis` (public) renvoie la liste **et** l'agrégat
 *   (`moyenne`, `total`, `repartition` par note) → `ApiAvisCabinetEnveloppe`.
 * - `POST /avis` (patient) : `consultation_id` requis, `note` 1–5 requise,
 *   `commentaire` facultatif **max 1000 caractères** ; la consultation doit être
 *   **terminée** et appartenir au patient. Erreurs : **422** validation,
 *   **500** erreur métier (consultation non terminée, avis déjà donné…).
 * - `GET /patient/avis` (patient) : les avis du patient connecté, chacun avec son `cabinet`.
 * - `PATCH /avis/{id}` (patient propriétaire) : `note?`, `commentaire?`.
 * - `DELETE /avis/{id}` (patient propriétaire **ou** super_admin) : modération.
 *
 * Deux formes coexistent :
 * - les **bruts API** (`ApiAvisBrut`, `ApiAvisPatientBrut`), en snake_case, `id` numérique ;
 * - les **modèles d'affichage** (`Avis`, `CabinetEligible`) consommés par les écrans.
 */

/* =========================================================
   CONTRAINTES MÉTIER PARTAGÉES
========================================================= */

/** Bornes de la note, telles que documentées par le backend. */
export const NOTE_MIN = 1;
export const NOTE_MAX = 5;

/** Longueur maximale du commentaire (`POST`/`PATCH /avis`), documentée par le backend. */
export const COMMENTAIRE_MAX = 1000;

/* =========================================================
   BRUTS API
========================================================= */

/** Avis d'un cabinet, tel que renvoyé par `GET /cabinets/{id}/avis` (§14.1), dans `data.avis[]`. */
export interface ApiAvisBrut {
  id: number;
  note: number;
  commentaire: string | null;
  created_at: string;
  patient: { nom: string; prenom: string } | null;
}

/** Répartition du nombre d'avis par note (clés « 1 » à « 5 »). */
export type RepartitionNotes = Partial<Record<'1' | '2' | '3' | '4' | '5', number>>;

/**
 * `data` de `GET /cabinets/{id}/avis` (§14.1) : la liste des avis **et** l'agrégat
 * affiché par la vitrine publique (moyenne, total, barres de répartition).
 */
export interface ApiAvisCabinetData {
  avis: ApiAvisBrut[];
  moyenne: number;
  total: number;
  repartition: RepartitionNotes;
}

/**
 * Avis d'un patient, tel que renvoyé par `GET /patient/avis` (§14.3), dans `data.avis[]`.
 * Le même avis porte en plus un objet `cabinet` (au minimum `id` et `nom`) et, pour
 * `POST /avis` (§14.2) / `PATCH /avis/{id}` (§14.4), le `consultation_id` d'origine.
 */
export interface ApiAvisPatientBrut {
  id: number;
  note: number;
  commentaire: string | null;
  created_at: string;
  consultation_id?: number;
  cabinet_id?: number;
  cabinet?: { id?: number; nom?: string } | null;
}

/* =========================================================
   CORPS D'ÉCRITURE
========================================================= */

/**
 * Corps de `POST /avis` (§14.2) — `consultation_id` et `note` (1–5) requis,
 * `commentaire` facultatif (max `COMMENTAIRE_MAX`).
 */
export interface CreationAvisPayload {
  consultation_id: number;
  note: number;
  commentaire?: string;
}

/** Corps de `PATCH /avis/{id}` (§14.4) — `note?` (1–5) et `commentaire?` facultatifs. */
export interface ModificationAvisPayload {
  note?: number;
  commentaire?: string;
}

/* =========================================================
   MODÈLES D'AFFICHAGE
========================================================= */

/** Établissement pour lequel un avis est possible (une consultation terminée du patient). */
export interface CabinetEligible {
  id: string;
  nom: string;
  dateVisite: string;
  /** Consultation terminée rattachée — c'est elle que `POST /avis` attend. */
  consultationId: string;
}

/** Avis publié par le patient, prêt à afficher. */
export interface Avis {
  id: string;
  cabinetId: string;
  cabinetNom: string;
  note: number;
  commentaire: string;
  datePublication: string;
}
