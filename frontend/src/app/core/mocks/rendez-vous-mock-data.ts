import { RendezVous } from '../../models/rendez-vous.model';

/**
 * OUTIL DE DEV UNIQUEMENT — jeu de rendez-vous factices utilisé par
 * `mock-rendezvous-interceptor.ts` tant que le back-end n'est pas branché.
 * Alimente l'écran Propriétaire « Historique des rendez-vous » (§9.6).
 * À retirer une fois l'API réelle disponible.
 */
export interface RendezVousAffichage extends RendezVous {
  /**
   * Nom du patient à afficher — seul champ encore dénormalisé ici : le
   * modèle RendezVous officiel (§5 du cahier des charges) ne porte pas
   * d'identité patient. `motif` et `praticienNom` sont en revanche déjà
   * sur RendezVous — on les réutilise tels quels pour ne pas dupliquer
   * une info qu'il expose déjà (c'est cette duplication, avec un type de
   * statut divergent en plus, qui avait fini par casser l'écran).
   * Optionnel : le contrat réel de `listerParCabinet()` (Observable<RendezVous[]>)
   * ne garantit pas ce champ — dégradation propre si absent plutôt que
   * cast pour forcer le typage.
   */
  nomPatientAffiche?: string;
}

export let rendezVousFactices: RendezVousAffichage[] = [
  { id: 'rdv-001', cabinetId: 'cab-004', cabinetNom: 'Vision Plus', praticienNom: 'Sylvie Nkeng', motif: 'Examen de la vue', date: '2026-08-19', heureDebut: '14:30', heureFin: '15:00', statut: 'termine', nomPatientAffiche: 'Jean Dupont' },
  { id: 'rdv-002', cabinetId: 'cab-004', cabinetNom: 'Vision Plus', praticienNom: 'Aïcha Fouda', motif: 'Ajustement monture', date: '2026-08-19', heureDebut: '11:00', heureFin: '11:30', statut: 'annule', nomPatientAffiche: 'Marie Laurent' },
  { id: 'rdv-003', cabinetId: 'cab-004', cabinetNom: 'Vision Plus', praticienNom: 'Sylvie Nkeng', motif: 'Retrait lentilles', date: '2026-08-18', heureDebut: '16:15', heureFin: '16:45', statut: 'termine', nomPatientAffiche: 'Pierre Lemaire' },
  { id: 'rdv-004', cabinetId: 'cab-004', cabinetNom: 'Vision Plus', praticienNom: 'Sylvie Nkeng', motif: 'Examen de la vue', date: '2026-08-17', heureDebut: '09:30', heureFin: '10:00', statut: 'termine', nomPatientAffiche: 'Sophie Fabre' },
  { id: 'rdv-005', cabinetId: 'cab-004', cabinetNom: 'Vision Plus', praticienNom: 'Aïcha Fouda', motif: 'Renouvellement ordonnance', date: '2026-08-16', heureDebut: '15:00', heureFin: '15:30', statut: 'termine', nomPatientAffiche: 'Lucas Roux' },
  { id: 'rdv-006', cabinetId: 'cab-004', cabinetNom: 'Vision Plus', praticienNom: 'Sylvie Nkeng', motif: 'Examen de la vue', date: '2026-08-15', heureDebut: '10:00', heureFin: '10:30', statut: 'en_attente', nomPatientAffiche: 'Jean Leclerc' },
  { id: 'rdv-007', cabinetId: 'cab-004', cabinetNom: 'Vision Plus', praticienNom: 'Aïcha Fouda', motif: 'Ajustement monture', date: '2026-08-21', heureDebut: '11:30', heureFin: '12:00', statut: 'confirme', nomPatientAffiche: 'Thomas Bernard' },
  { id: 'rdv-008', cabinetId: 'cab-004', cabinetNom: 'Vision Plus', praticienNom: 'Sylvie Nkeng', motif: 'Examen de la vue', date: '2026-08-22', heureDebut: '09:00', heureFin: '09:30', statut: 'confirme', nomPatientAffiche: 'Pierre Lemaire' },
  { id: 'rdv-009', cabinetId: 'cab-004', cabinetNom: 'Vision Plus', praticienNom: 'Sylvie Nkeng', motif: 'Retrait lentilles', date: '2026-08-14', heureDebut: '14:00', heureFin: '14:30', statut: 'termine', nomPatientAffiche: 'Aline Manga' },
  { id: 'rdv-010', cabinetId: 'cab-004', cabinetNom: 'Vision Plus', praticienNom: 'Aïcha Fouda', motif: 'Examen de la vue', date: '2026-08-12', heureDebut: '16:30', heureFin: '17:00', statut: 'annule', nomPatientAffiche: 'Jean Dupont' },
  { id: 'rdv-011', cabinetId: 'cab-004', cabinetNom: 'Vision Plus', praticienNom: 'Sylvie Nkeng', motif: 'Renouvellement ordonnance', date: '2026-08-11', heureDebut: '10:45', heureFin: '11:15', statut: 'termine', nomPatientAffiche: 'Marie Laurent' },
  { id: 'rdv-012', cabinetId: 'cab-004', cabinetNom: 'Vision Plus', praticienNom: 'Aïcha Fouda', motif: 'Ajustement monture', date: '2026-08-09', heureDebut: '13:15', heureFin: '13:45', statut: 'termine', nomPatientAffiche: 'Serge Mvondo' },
  { id: 'rdv-013', cabinetId: 'cab-004', cabinetNom: 'Vision Plus', praticienNom: 'Sylvie Nkeng', motif: 'Examen de la vue', date: '2026-08-08', heureDebut: '09:15', heureFin: '09:45', statut: 'termine', nomPatientAffiche: 'Sophie Fabre' },
  { id: 'rdv-014', cabinetId: 'cab-004', cabinetNom: 'Vision Plus', praticienNom: 'Aïcha Fouda', motif: 'Retrait lentilles', date: '2026-08-06', heureDebut: '11:00', heureFin: '11:30', statut: 'annule', nomPatientAffiche: 'Lucas Roux' },
  { id: 'rdv-015', cabinetId: 'cab-004', cabinetNom: 'Vision Plus', praticienNom: 'Sylvie Nkeng', motif: 'Examen de la vue', date: '2026-08-05', heureDebut: '15:45', heureFin: '16:15', statut: 'termine', nomPatientAffiche: 'Jean Leclerc' },
  { id: 'rdv-016', cabinetId: 'cab-004', cabinetNom: 'Vision Plus', praticienNom: 'Aïcha Fouda', motif: 'Ajustement monture', date: '2026-08-03', heureDebut: '10:30', heureFin: '11:00', statut: 'termine', nomPatientAffiche: 'Thomas Bernard' },

  // Autres cabinets — variété pour la vue Super Admin/dev, non utilisés par le Propriétaire de démo (cab-004).
  { id: 'rdv-017', cabinetId: 'cab-005', cabinetNom: 'Horizon Optique', praticienNom: 'Patrick Same', motif: 'Examen de la vue', date: '2026-08-18', heureDebut: '09:00', heureFin: '09:30', statut: 'termine', nomPatientAffiche: 'Jean Dupont' },
  { id: 'rdv-018', cabinetId: 'cab-009', cabinetNom: 'Maison Vision', praticienNom: 'Marcel Ateba', motif: 'Ajustement monture', date: '2026-08-17', heureDebut: '14:00', heureFin: '14:30', statut: 'confirme', nomPatientAffiche: 'Marie Laurent' },
];
