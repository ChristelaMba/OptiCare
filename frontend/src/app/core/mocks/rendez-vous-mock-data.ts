import { RendezVous } from '../../models/rendez-vous.model';

// (commentaires inchangés)

export type StatutRendezVousAffichage = 'enAttente' | 'confirme' | 'honore' | 'annule';

export interface RendezVousAffichage {
  id: string;
  cabinetId: string;
  patientId?: string;
  nomInvite?: string;
  telephoneInvite?: string;
  date: Date;
  heure: string;
  statut: StatutRendezVousAffichage;
  creePar: 'patient' | 'secretaire';
  dateCreation: Date;
  nomPatientAffiche: string;
  motifAffiche: string;
  opticienAffiche: string;
}

export let rendezVousFactices: RendezVousAffichage[] = [
  // ... (toutes tes données mock, inchangées)
];