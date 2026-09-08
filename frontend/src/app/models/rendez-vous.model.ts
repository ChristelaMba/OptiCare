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
