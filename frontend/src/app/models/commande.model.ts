/**
 * §5 du cahier des charges. Écran construit de zéro le 2026-09-02 —
 * modèle jusque-là un stub vide (`export interface Commande {}`), jamais
 * rempli. Voir JOURNAL-MODIFICATIONS-PARTAGEES.md.
 *
 * Une PriseEnCharge de type `confection` peut donner naissance à une
 * Commande (voir `models/prise-en-charge.model.ts`) — ce n'est pas
 * systématique.
 */
export interface DiagnosticOeil {
  sphere: number;
  cylindre: number;
  axe: number;
  addition: number;
}

export type StatutCommande = 'initie' | 'enCours' | 'enVerification' | 'termine';

export interface Commande {
  id: string;

  priseEnChargeId: string; // reference → PriseEnCharge
  cabinetId: string; // reference → Cabinet
  patientId: string; // reference → Patient

  numeroMonture: string;
  typeVerre: string; // unifocal, progressif, bifocal…
  teinte: string;
  descriptionFoyers: string;
  port: string; // permanent, occasionnel…
  antireflet: string;
  autresDetails: string; // ex. écart pupillaire, épaisseur…

  diagnosticOeilDroit: DiagnosticOeil;
  diagnosticOeilGauche: DiagnosticOeil;

  statut: StatutCommande;

  modifieParId: string; // reference → Utilisateur (Opticien OU Secretaire)

  dateInitiation: Date;
  dateDerniereMiseAJour: Date;

  /**
   * §5 : passe à `true` automatiquement côté back quand `statut` devient
   * `termine` (notification `commandeTerminee` générée pour le patient).
   * Le front ne l'écrit jamais directement.
   */
  notificationEnvoyee: boolean;
}

/**
 * Payload de création — tout ce que le back n'assigne pas lui-même
 * (id, statut toujours `initie` à la création, dateInitiation/
 * dateDerniereMiseAJour, notificationEnvoyee). `modifieParId` reste à la
 * charge de l'appelant : c'est l'auteur de la création qui s'auto-désigne.
 */
export type NouvelleCommandePayload = Omit<
  Commande,
  'id' | 'statut' | 'dateInitiation' | 'dateDerniereMiseAJour' | 'notificationEnvoyee'
>;
