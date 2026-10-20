import { RoleUtilisateur } from './utilisateur.model';

/**
 * Modèles des écrans Super Admin **non encore couverts par l'API** :
 * Dashboard global, Journal d'audit et Paramètres généraux. Aucune route
 * serveur n'existe pour ces écrans (ROUTES-API-LIONEL s'arrête au §18.5) ;
 * les données proviennent de `SuperAdminDemo` (service de démonstration)
 * et sont **explicitement factices**. Ces types sont posés dès maintenant
 * pour que le passage à l'API réelle ne change que le service, pas les
 * écrans.
 */

// ─────────────────────────────────────────────────────────────────────────
// Dashboard global
// ─────────────────────────────────────────────────────────────────────────

/** Ventilation d'un compteur global (ex. cabinets par statut). */
export interface RepartitionStatut {
  libelle: string;
  total: number;
  /** Classe de couleur Tailwind du point/liseré (ex. 'bg-success'). */
  couleur: string;
}

/** Carte KPI du dashboard global. `lien` mène à l'écran concerné. */
export interface KpiPlateforme {
  cle: string;
  libelle: string;
  icone: string;
  valeur: number;
  /** Ventilation secondaire, affichée sous la valeur. */
  ventilation: RepartitionStatut[];
  /** Route interne (relative à `/admin`) vers l'écran détaillé. */
  lien?: string;
  /** Vrai pour la carte d'alerte « Demandes en attente » (mise en évidence). */
  alerte?: boolean;
}

/** Point d'une série mensuelle (inscriptions ou consultations). */
export interface PointMensuel {
  /** '2026-05' */
  mois: string;
  /** « mai 2026 » */
  libelle: string;
  valeur: number;
}

/** Répartition des comptes par rôle, pour le camembert/la légende. */
export interface RepartitionRoles {
  role: RoleUtilisateur;
  libelle: string;
  total: number;
  couleur: string;
}

/** Événement marquant résumé sur le dashboard (5 derniers). */
export interface EvenementResume {
  horodatage: Date;
  description: string;
  severite: SeveriteAudit;
}

export interface TableauDeBordGlobal {
  cabinetsEnregistres: number;
  cabinets: RepartitionStatut[];
  comptesTotal: number;
  repartitionRoles: RepartitionRoles[];
  consultationsMois: number;
  demandesEnAttente: number;
  inscriptions: PointMensuel[];
  consultations: PointMensuel[];
  /** Répartition des cabinets par ville (top 5). */
  cabinetsParVille: { ville: string; total: number }[];
  dernieresActivites: EvenementResume[];
}

// ─────────────────────────────────────────────────────────────────────────
// Journal d'audit
// ─────────────────────────────────────────────────────────────────────────

export type SeveriteAudit = 'info' | 'warning' | 'critique';

/** Type d'événement journalisé (colonne « Type » du filtre). */
export type TypeEvenementAudit =
  | 'connexion'
  | 'validation_cabinet'
  | 'gestion_compte'
  | 'parametrage'
  | 'securite';

export interface EvenementAudit {
  id: string;
  horodatage: Date;
  /** Nom de l'utilisateur à l'origine de l'action. */
  utilisateur: string;
  /** Rôle de cet utilisateur, pour la pastille. */
  role: RoleUtilisateur;
  description: string;
  /** Entité/ressource ciblée (libellé lisible). */
  ressource: string;
  adresseIp: string;
  severite: SeveriteAudit;
  type: TypeEvenementAudit;
}

/** Libellés lisibles, exposés pour les filtres et les badges. */
export const LIBELLES_SEVERITE: Record<SeveriteAudit, string> = {
  info: 'Info',
  warning: 'Warning',
  critique: 'Critique',
};

export const LIBELLES_TYPE_EVENEMENT: Record<TypeEvenementAudit, string> = {
  connexion: 'Connexion',
  validation_cabinet: 'Validation cabinet',
  gestion_compte: 'Gestion compte',
  parametrage: 'Paramétrage',
  securite: 'Sécurité',
};

// ─────────────────────────────────────────────────────────────────────────
// Paramètres généraux
// ─────────────────────────────────────────────────────────────────────────

export interface ParametresGenerauxPlateforme {
  // Onglet Général
  nomPlateforme: string;
  emailSupport: string;
  devise: string;
  // Onglet Sécurité
  delaiSessionMinutes: number;
  doubleAuthentificationObligatoire: boolean;
  tentativesConnexionMax: number;
  // Onglet Maintenance
  maintenanceActive: boolean;
  messageMaintenance: string;
}

/** Modèle de message (onglet « Modèles de messages »). */
export interface ModeleMessage {
  cle: string;
  libelle: string;
  objet: string;
  corps: string;
}

export const DEVISE_PAR_DEFAUT = 'FCFA';
