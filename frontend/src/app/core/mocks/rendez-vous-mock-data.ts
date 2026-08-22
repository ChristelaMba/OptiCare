import { RendezVous } from '../../models/rendez-vous.model';

/**
 * OUTIL DE DEV UNIQUEMENT — jeu de rendez-vous factices utilisé par
 * `mock-rendezvous-interceptor.ts` tant que le back-end n'est pas branché.
 * Alimente l'écran Propriétaire « Historique des rendez-vous » (§9.6).
 * À retirer une fois l'API réelle disponible.
 */
export interface RendezVousAffichage extends RendezVous {
  /**
   * Champs d'affichage uniquement (nom du patient, motif, opticien en
   * charge) — AUCUN des trois n'existe sur le modèle RendezVous officiel
   * (§5 du cahier des charges : ni motif, ni opticienId sur RendezVous —
   * le motif appartient à FicheConsultation, l'opticien à PriseEnCharge).
   * Dénormalisés ici pour ne pas construire un service Patient complet
   * juste pour ce sprint — à remplacer par de vraies jointures une fois
   * ces routes confirmées côté back.
   */
  nomPatientAffiche: string;
  motifAffiche: string;
  opticienAffiche: string;
}

export let rendezVousFactices: RendezVousAffichage[] = [
  { id: 'rdv-001', cabinetId: 'cab-004', patientId: 'user-020', date: new Date('2026-08-19'), heure: '14:30', statut: 'honore', creePar: 'patient', dateCreation: new Date('2026-08-10'), nomPatientAffiche: 'Jean Dupont', motifAffiche: 'Examen de la vue', opticienAffiche: 'Sylvie Nkeng' },
  { id: 'rdv-002', cabinetId: 'cab-004', patientId: 'user-021', date: new Date('2026-08-19'), heure: '11:00', statut: 'annule', creePar: 'secretaire', dateCreation: new Date('2026-08-09'), nomPatientAffiche: 'Marie Laurent', motifAffiche: 'Ajustement monture', opticienAffiche: 'Aïcha Fouda' },
  { id: 'rdv-003', cabinetId: 'cab-004', nomInvite: 'Pierre Lemaire', telephoneInvite: '+237 6 53 44 55 66', date: new Date('2026-08-18'), heure: '16:15', statut: 'honore', creePar: 'secretaire', dateCreation: new Date('2026-08-08'), nomPatientAffiche: 'Pierre Lemaire', motifAffiche: 'Retrait lentilles', opticienAffiche: 'Sylvie Nkeng' },
  { id: 'rdv-004', cabinetId: 'cab-004', patientId: 'user-024', date: new Date('2026-08-17'), heure: '09:30', statut: 'honore', creePar: 'patient', dateCreation: new Date('2026-08-05'), nomPatientAffiche: 'Sophie Fabre', motifAffiche: 'Examen de la vue', opticienAffiche: 'Sylvie Nkeng' },
  { id: 'rdv-005', cabinetId: 'cab-004', patientId: 'user-025', date: new Date('2026-08-16'), heure: '15:00', statut: 'honore', creePar: 'patient', dateCreation: new Date('2026-08-04'), nomPatientAffiche: 'Lucas Roux', motifAffiche: 'Renouvellement ordonnance', opticienAffiche: 'Aïcha Fouda' },
  { id: 'rdv-006', cabinetId: 'cab-004', patientId: 'user-026', date: new Date('2026-08-15'), heure: '10:00', statut: 'enAttente', creePar: 'patient', dateCreation: new Date('2026-08-14'), nomPatientAffiche: 'Jean Leclerc', motifAffiche: 'Examen de la vue', opticienAffiche: 'Sylvie Nkeng' },
  { id: 'rdv-007', cabinetId: 'cab-004', patientId: 'user-022', date: new Date('2026-08-21'), heure: '11:30', statut: 'confirme', creePar: 'secretaire', dateCreation: new Date('2026-08-15'), nomPatientAffiche: 'Thomas Bernard', motifAffiche: 'Ajustement monture', opticienAffiche: 'Aïcha Fouda' },
  { id: 'rdv-008', cabinetId: 'cab-004', patientId: 'user-023', date: new Date('2026-08-22'), heure: '09:00', statut: 'confirme', creePar: 'patient', dateCreation: new Date('2026-08-16'), nomPatientAffiche: 'Pierre Lemaire', motifAffiche: 'Examen de la vue', opticienAffiche: 'Sylvie Nkeng' },
  { id: 'rdv-009', cabinetId: 'cab-004', nomInvite: 'Aline Manga', telephoneInvite: '+237 6 55 60 70 80', date: new Date('2026-08-14'), heure: '14:00', statut: 'honore', creePar: 'secretaire', dateCreation: new Date('2026-08-03'), nomPatientAffiche: 'Aline Manga', motifAffiche: 'Retrait lentilles', opticienAffiche: 'Sylvie Nkeng' },
  { id: 'rdv-010', cabinetId: 'cab-004', patientId: 'user-020', date: new Date('2026-08-12'), heure: '16:30', statut: 'annule', creePar: 'patient', dateCreation: new Date('2026-08-02'), nomPatientAffiche: 'Jean Dupont', motifAffiche: 'Examen de la vue', opticienAffiche: 'Aïcha Fouda' },
  { id: 'rdv-011', cabinetId: 'cab-004', patientId: 'user-021', date: new Date('2026-08-11'), heure: '10:45', statut: 'honore', creePar: 'patient', dateCreation: new Date('2026-08-01'), nomPatientAffiche: 'Marie Laurent', motifAffiche: 'Renouvellement ordonnance', opticienAffiche: 'Sylvie Nkeng' },
  { id: 'rdv-012', cabinetId: 'cab-004', nomInvite: 'Serge Mvondo', telephoneInvite: '+237 6 66 70 80 90', date: new Date('2026-08-09'), heure: '13:15', statut: 'honore', creePar: 'secretaire', dateCreation: new Date('2026-07-30'), nomPatientAffiche: 'Serge Mvondo', motifAffiche: 'Ajustement monture', opticienAffiche: 'Aïcha Fouda' },
  { id: 'rdv-013', cabinetId: 'cab-004', patientId: 'user-024', date: new Date('2026-08-08'), heure: '09:15', statut: 'honore', creePar: 'patient', dateCreation: new Date('2026-07-29'), nomPatientAffiche: 'Sophie Fabre', motifAffiche: 'Examen de la vue', opticienAffiche: 'Sylvie Nkeng' },
  { id: 'rdv-014', cabinetId: 'cab-004', patientId: 'user-025', date: new Date('2026-08-06'), heure: '11:00', statut: 'annule', creePar: 'patient', dateCreation: new Date('2026-07-27'), nomPatientAffiche: 'Lucas Roux', motifAffiche: 'Retrait lentilles', opticienAffiche: 'Aïcha Fouda' },
  { id: 'rdv-015', cabinetId: 'cab-004', patientId: 'user-026', date: new Date('2026-08-05'), heure: '15:45', statut: 'honore', creePar: 'secretaire', dateCreation: new Date('2026-07-26'), nomPatientAffiche: 'Jean Leclerc', motifAffiche: 'Examen de la vue', opticienAffiche: 'Sylvie Nkeng' },
  { id: 'rdv-016', cabinetId: 'cab-004', patientId: 'user-022', date: new Date('2026-08-03'), heure: '10:30', statut: 'honore', creePar: 'patient', dateCreation: new Date('2026-07-24'), nomPatientAffiche: 'Thomas Bernard', motifAffiche: 'Ajustement monture', opticienAffiche: 'Aïcha Fouda' },

  // Autres cabinets — variété pour la vue Super Admin/dev, non utilisés par le Propriétaire de démo (cab-004).
  { id: 'rdv-017', cabinetId: 'cab-005', patientId: 'user-020', date: new Date('2026-08-18'), heure: '09:00', statut: 'honore', creePar: 'patient', dateCreation: new Date('2026-08-08'), nomPatientAffiche: 'Jean Dupont', motifAffiche: 'Examen de la vue', opticienAffiche: 'Patrick Same' },
  { id: 'rdv-018', cabinetId: 'cab-009', patientId: 'user-021', date: new Date('2026-08-17'), heure: '14:00', statut: 'confirme', creePar: 'secretaire', dateCreation: new Date('2026-08-07'), nomPatientAffiche: 'Marie Laurent', motifAffiche: 'Ajustement monture', opticienAffiche: 'Marcel Ateba' },
];
