// 2026-09-11 : connectivité RendezVous testée route par route (voir
// POINTS-A-CONFIRMER-BACKEND.md §12 et JOURNAL-MODIFICATIONS-PARTAGEES.md).
// Résultat MIXTE, contrairement à Auth/Cabinets — seules 2 routes sur 9
// sont branchées sur l'API réelle ici :
//   - GET /cabinets/{id}/slots  → RÉEL (`listerCreneaux()`)
//   - GET /patients/{id}/rdv    → RÉEL (`getMesRendezVous(patientId)`)
// Tout le reste (créer un RDV, confirmer/terminer/annuler/non-honore/
// modifier, lister par cabinet) RESTE sur le mock : `PUT /rdv/{id}/confirmer`,
// `/terminer` et `/non-honore` renvoient `500` pour tout le monde (même bug
// de middleware `CheckRole` que Cabinets), `GET /cabinets/{id}/rdv` aussi ;
// `annuler`/`modifier` atteignent le contrôleur mais renvoient `500` au lieu
// de `404` sur un id inexistant (pas re-testés avec un vrai id) ; la
// création réelle (`POST /rdv`) n'a été sondée qu'en validation (corps
// vide → 422 propre), jamais testée en écriture réelle sur consigne
// explicite. Le mock `mock-rendezvous-interceptor.ts` reste donc actif.
//
// 2026-09-07 : vocabulaire des statuts aligné sur l'API réelle du back-end
// (4ᵉ version — voir Docs/DIAGNOSTIC-VOCABULAIRE-BACKEND.md et l'entrée du
// 07/09 de JOURNAL-MODIFICATIONS-PARTAGEES.md).
//   - 'en_attente' renommé en 'reserve' (créneau pris, en attente de
//     confirmation par la secrétaire).
//   - 'libre' ajouté : créneau réservable jamais pris. Présent dans le type
//     pour que la valeur soit prête, mais AUCUN écran ne l'affiche encore
//     (prise-rdv garde son modèle de disponibilité local — décision assumée,
//     pas de route back confirmée). Les écrans de liste (mes-rendez-vous,
//     historique-rdv, agenda) filtrent explicitement 'libre'.
//   - 'non_honore' ajouté : patient absent / non présenté. Action complète
//     câblée côté secrétaire (bouton « Marquer absent » dans l'agenda) et
//     badge dédié dans historique-rdv / mes-rendez-vous.
export type StatutRendezVous = 'libre' | 'reserve' | 'confirme' | 'annule' | 'termine' | 'non_honore';

export interface RendezVous {
  id: string;
  cabinetId: string;
  cabinetNom: string;
  cabinetAdresse?: string;
  praticienNom?: string;
  motif: string;
  date: string;
  heureDebut: string;
  heureFin: string;
  statut: StatutRendezVous;
}
export interface JourCalendrier {
  jour: number;
  dateComplete: Date;
  disponible: boolean;
  horsMois: boolean;
  estAujourdhui: boolean;
}

export interface NouveauRendezVousPayload {
  cabinetId: string;
  date: string;
  heure: string;
  motif: string;
  nomComplet: string;
  telephone: string;
  email: string;
}

// ─────────────────────────────────────────────────────────────────────────
// Formes BRUTES confirmées le 11/09 pour les 2 routes réellement branchées.
// Même pattern que `auth.model.ts` / `cabinet.model.ts` : enveloppe
// `{ status, message, data: {...} }`.
// ─────────────────────────────────────────────────────────────────────────

/**
 * `GET /cabinets/{id}/slots?date=YYYY-MM-DD` — enveloppe confirmée, mais
 * `slots` n'a été observé que **vide** (`[]`) sur tous les cabinets testés
 * (aucun cabinet n'a de disponibilités configurées). La forme d'un élément
 * de `slots` — chaîne `"09:00"` ou objet `{ heure_debut, heure_fin,
 * disponible }` — est donc une hypothèse, pas une confirmation. Typé en
 * `string[]` (hypothèse la plus simple) ; à corriger dès qu'un cabinet
 * réel aura des créneaux à afficher.
 */
export interface ApiCreneauxEnveloppe {
  status: string;
  message: string;
  data: {
    date: string;
    slots: string[];
  };
}

/**
 * `GET /patients/{patientId}/rdv` — enveloppe confirmée
 * (`{ data: { rdvs: [...] } }`), mais `rdvs` n'a été observé que **vide**
 * sur tous les patients testés, y compris un id manifestement inexistant
 * (`999`) qui renvoie `200` avec la même liste vide que des ids réels —
 * forte présomption que `{patientId}` dans l'URL n'est pas utilisé pour
 * filtrer et que le back déduit le patient du token (cohérent avec
 * l'hypothèse déjà posée au §8 de POINTS-A-CONFIRMER-BACKEND.md pour
 * l'ancienne route), mais **non prouvé** faute d'un seul RDV réel en base.
 * La forme exacte d'un `Rdv` peuplé (noms de champs, `statut` vs `status`,
 * objet `cabinet` imbriqué ou non…) reste donc **entièrement à confirmer**.
 */
export interface ApiRdvsEnveloppe {
  status: string;
  message: string;
  data: {
    rdvs: unknown[];
  };
}
