export type StatutRendezVous = 'enAttente' | 'confirme' | 'annule' | 'honore';

export interface RendezVous {
  id: string;
  cabinetId: string; // reference → Cabinet
  patientId?: string; // reference → Patient — vide si invité sans compte
  nomInvite?: string;
  telephoneInvite?: string;
  date: Date;
  heure: string;
  statut: StatutRendezVous;
  creePar: 'patient' | 'secretaire';
  dateCreation: Date;
}
