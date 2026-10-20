import { Service } from '@angular/core';
import { Observable, of, delay } from 'rxjs';

import {
  EvenementAudit,
  ModeleMessage,
  ParametresGenerauxPlateforme,
  TableauDeBordGlobal,
  DEVISE_PAR_DEFAUT,
} from '../../models/super-admin.model';

/**
 * ⚠️ DONNÉES DE DÉMONSTRATION — AUCUN APPEL RÉSEAU.
 *
 * Aucune route serveur n'existe pour le Dashboard global, le Journal d'audit
 * et les Paramètres généraux (ROUTES-API-LIONEL s'arrête au §18.5, qui couvre
 * uniquement `admin/cabinets` et `admin/users`). Ce service fournit des jeux
 * de données **factices mais réalistes et typées**, le temps que le back
 * expose ces ressources.
 *
 * Contrat volontairement identique à celui des vrais services (`cabinet.ts`,
 * `utilisateur.ts`) : méthodes renvoyant des `Observable`, normalisation
 * snake_case → camelCase le jour où l'API arrive. Il suffira alors de
 * remplacer le corps des méthodes par les appels HTTP, sans toucher aux
 * écrans.
 *
 * Un petit `delay()` simule la latence réseau pour que les écrans exercent
 * réellement leurs états « chargement » (et pas seulement un rendu immédiat).
 */
@Service()
export class SuperAdminDemo {
  private static readonly LATENCE_MS = 250;

  /** Le décompte de comptes sert de source unique au dashboard et à la gestion des comptes (78). */
  static readonly TOTAL_COMPTES = 78;

  obtenirTableauDeBord(): Observable<TableauDeBordGlobal> {
    return of(SuperAdminDemo.tableauDeBord()).pipe(delay(SuperAdminDemo.LATENCE_MS));
  }

  listerEvenementsAudit(): Observable<EvenementAudit[]> {
    return of(SuperAdminDemo.evenementsAudit()).pipe(delay(SuperAdminDemo.LATENCE_MS));
  }

  obtenirParametres(): Observable<ParametresGenerauxPlateforme> {
    return of(SuperAdminDemo.parametres()).pipe(delay(SuperAdminDemo.LATENCE_MS));
  }

  listerModelesMessages(): Observable<ModeleMessage[]> {
    return of(SuperAdminDemo.modelesMessages()).pipe(delay(SuperAdminDemo.LATENCE_MS));
  }

  // ───────────────────────────────────────────────────────────────────────
  // Jeux de données
  // ───────────────────────────────────────────────────────────────────────

  /** 78 comptes répartis par rôle : la somme des `total` vaut bien TOTAL_COMPTES. */
  private static readonly REPARTITION_ROLES = [
    { role: 'patient' as const, libelle: 'Patients', total: 52, couleur: 'bg-primary' },
    { role: 'opticien' as const, libelle: 'Opticiens', total: 9, couleur: 'bg-info' },
    { role: 'proprietaire' as const, libelle: 'Propriétaires', total: 6, couleur: 'bg-success' },
    { role: 'secretaire' as const, libelle: 'Secrétaires', total: 10, couleur: 'bg-warning' },
    { role: 'super_admin' as const, libelle: 'Super Admin', total: 1, couleur: 'bg-outline' },
  ];

  private static tableauDeBord(): TableauDeBordGlobal {
    return {
      cabinetsEnregistres: 14,
      cabinets: [
        { libelle: 'Actifs', total: 9, couleur: 'bg-success' },
        { libelle: 'En attente', total: 3, couleur: 'bg-warning' },
        { libelle: 'Suspendus', total: 2, couleur: 'bg-error' },
      ],
      comptesTotal: SuperAdminDemo.TOTAL_COMPTES,
      repartitionRoles: SuperAdminDemo.REPARTITION_ROLES,
      consultationsMois: 342,
      demandesEnAttente: 3,
      inscriptions: [
        { mois: '2026-05', libelle: 'mai 2026', valeur: 3 },
        { mois: '2026-06', libelle: 'juin 2026', valeur: 5 },
        { mois: '2026-07', libelle: 'juillet 2026', valeur: 4 },
        { mois: '2026-08', libelle: 'août 2026', valeur: 7 },
        { mois: '2026-09', libelle: 'septembre 2026', valeur: 9 },
        { mois: '2026-10', libelle: 'octobre 2026', valeur: 6 },
      ],
      consultations: [
        { mois: '2026-05', libelle: 'mai 2026', valeur: 210 },
        { mois: '2026-06', libelle: 'juin 2026', valeur: 265 },
        { mois: '2026-07', libelle: 'juillet 2026', valeur: 248 },
        { mois: '2026-08', libelle: 'août 2026', valeur: 301 },
        { mois: '2026-09', libelle: 'septembre 2026', valeur: 356 },
        { mois: '2026-10', libelle: 'octobre 2026', valeur: 342 },
      ],
      cabinetsParVille: [
        { ville: 'Douala', total: 7 },
        { ville: 'Yaoundé', total: 4 },
        { ville: 'Bafoussam', total: 2 },
        { ville: 'Garoua', total: 1 },
      ],
      dernieresActivites: [
        {
          horodatage: new Date('2026-10-20T14:32:00'),
          description: 'Cabinet « Vision Plus Akwa » validé',
          severite: 'info',
        },
        {
          horodatage: new Date('2026-10-20T11:05:00'),
          description: 'Compte de « Nkeng Paul » désactivé',
          severite: 'warning',
        },
        {
          horodatage: new Date('2026-10-20T09:47:00'),
          description: 'Nouvelle demande d’inscription : « Optique Bonabéri »',
          severite: 'info',
        },
        {
          horodatage: new Date('2026-10-19T18:20:00'),
          description: '5 tentatives de connexion échouées (adresse 41.202.7.19)',
          severite: 'critique',
        },
        {
          horodatage: new Date('2026-10-19T16:02:00'),
          description: 'Paramètres de session modifiés (délai porté à 60 min)',
          severite: 'warning',
        },
      ],
    };
  }

  private static evenementsAudit(): EvenementAudit[] {
    const e = (
      id: number,
      horodatage: string,
      utilisateur: string,
      role: EvenementAudit['role'],
      description: string,
      ressource: string,
      adresseIp: string,
      severite: EvenementAudit['severite'],
      type: EvenementAudit['type'],
    ): EvenementAudit => ({
      id: String(id),
      horodatage: new Date(horodatage),
      utilisateur,
      role,
      description,
      ressource,
      adresseIp,
      severite,
      type,
    });

    return [
      e(1, '2026-10-20T14:32:00', 'Super Administrateur Test', 'super_admin', 'Validation du cabinet « Vision Plus Akwa »', 'Cabinet #12', '41.202.7.19', 'info', 'validation_cabinet'),
      e(2, '2026-10-20T13:10:00', 'Super Administrateur Test', 'super_admin', 'Réinitialisation du mot de passe de « Kamga Alice »', 'Compte #31', '41.202.7.19', 'warning', 'gestion_compte'),
      e(3, '2026-10-20T11:05:00', 'Super Administrateur Test', 'super_admin', 'Désactivation du compte « Nkeng Paul »', 'Compte #12', '41.202.7.19', 'warning', 'gestion_compte'),
      e(4, '2026-10-20T09:47:00', 'Api (inscription publique)', 'proprietaire', 'Dépôt d’une demande d’inscription « Optique Bonabéri »', 'Cabinet #14', '197.210.55.4', 'info', 'validation_cabinet'),
      e(5, '2026-10-19T18:20:00', 'Inconnu', 'patient', '5 tentatives de connexion échouées', 'POST /auth/login', '41.202.7.19', 'critique', 'securite'),
      e(6, '2026-10-19T16:02:00', 'Super Administrateur Test', 'super_admin', 'Délai de session porté à 60 minutes', 'Paramètres généraux', '41.202.7.19', 'warning', 'parametrage'),
      e(7, '2026-10-19T10:15:00', 'Mballa Jean', 'proprietaire', 'Connexion réussie', 'POST /auth/login', '154.72.168.20', 'info', 'connexion'),
      e(8, '2026-10-19T08:30:00', 'Super Administrateur Test', 'super_admin', 'Mode maintenance activé', 'Paramètres généraux', '41.202.7.19', 'critique', 'parametrage'),
      e(9, '2026-10-18T17:44:00', 'Super Administrateur Test', 'super_admin', 'Rejet du cabinet « Optique Étoile » (dossier incomplet)', 'Cabinet #9', '41.202.7.19', 'warning', 'validation_cabinet'),
      e(10, '2026-10-18T12:00:00', 'Super Administrateur Test', 'super_admin', 'Compte « Tchoumi Rita » réactivé', 'Compte #27', '41.202.7.19', 'info', 'gestion_compte'),
      e(11, '2026-10-18T09:12:00', 'Nkeng Paul', 'patient', 'Trois connexions depuis une nouvelle adresse', 'POST /auth/login', '154.72.168.21', 'warning', 'securite'),
      e(12, '2026-10-17T15:38:00', 'Super Administrateur Test', 'super_admin', 'Validation du cabinet « Optique Garoua Centre »', 'Cabinet #11', '41.202.7.19', 'info', 'validation_cabinet'),
    ];
  }

  private static parametres(): ParametresGenerauxPlateforme {
    return {
      nomPlateforme: 'OptiCare',
      emailSupport: 'support@opticare.cm',
      devise: DEVISE_PAR_DEFAUT,
      delaiSessionMinutes: 60,
      doubleAuthentificationObligatoire: false,
      tentativesConnexionMax: 5,
      maintenanceActive: false,
      messageMaintenance: 'La plateforme est en maintenance. Merci de réessayer dans quelques minutes.',
    };
  }

  private static modelesMessages(): ModeleMessage[] {
    return [
      {
        cle: 'validation_cabinet',
        libelle: 'Validation de cabinet',
        objet: 'Votre cabinet a été validé',
        corps: 'Bonjour,\n\nVotre cabinet a été validé sur OptiCare. Vous pouvez désormais gérer votre vitrine et vos rendez-vous.\n\nL’équipe OptiCare',
      },
      {
        cle: 'rejet_cabinet',
        libelle: 'Rejet de cabinet',
        objet: 'Votre demande d’inscription n’a pas été retenue',
        corps: 'Bonjour,\n\nAprès examen, votre demande n’a pas été retenue. Motif : {motif}.\n\nL’équipe OptiCare',
      },
      {
        cle: 'reinitialisation_mot_de_passe',
        libelle: 'Réinitialisation de mot de passe',
        objet: 'Votre mot de passe a été réinitialisé',
        corps: 'Bonjour,\n\nVotre mot de passe a été réinitialisé par un administrateur. Pensez à le changer dès votre prochaine connexion.\n\nL’équipe OptiCare',
      },
      {
        cle: 'maintenance',
        libelle: 'Maintenance planifiée',
        objet: 'Maintenance planifiée de la plateforme',
        corps: 'Bonjour,\n\nUne maintenance est prévue. {message}.\n\nL’équipe OptiCare',
      },
    ];
  }
}
