export type StatutRendezVous = 'confirme' | 'en_attente' | 'annule' | 'termine';

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