import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';

import {
  Commande,
  DiagnosticOeil,
  StatutCommande
} from '../../../models/commande.model';

@Component({
  selector: 'app-suivi-commande',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './suivi-commande.html',
  styleUrl: './suivi-commande.css'
})
export class SuiviCommande implements OnInit {

  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);

  // =========================================================
  // IDENTIFIANTS
  // =========================================================

  commandeId = '';
  patientId = '';
  dossierVisuelId = '';

  // =========================================================
  // ÉTAT
  // =========================================================

  commande = signal<Commande | null>(null);
  chargement = signal(false);
  messageErreur = signal('');

  // =========================================================
  // PATIENT
  // =========================================================

  patientNom = signal('Jean Dupont');
  patientTelephone = signal('06 12 34 56 78');

  // =========================================================
  // INITIALISATION
  // =========================================================

  ngOnInit(): void {

    this.route.queryParamMap.subscribe(params => {

      this.commandeId = params.get('commandeId') ?? '';
      this.patientId = params.get('patientId') ?? '';
      this.dossierVisuelId = params.get('dossierVisuelId') ?? '';

      this.chargerPatient();

      /*
       * Si un vrai commandeId est fourni, on pourrait ici appeler
       * CommandeService.lire().
       *
       * Pour cette version frontend, on utilise les commandes mockées.
       */

      this.chargerCommandeFrontend();
    });
  }

  // =========================================================
  // PATIENT
  // =========================================================

  private chargerPatient(): void {

    const patients: Record<
      string,
      {
        nom: string;
        telephone: string;
      }
    > = {

      'patient-001': {
        nom: 'Jean Dupont',
        telephone: '06 12 34 56 78'
      },

      'patient-002': {
        nom: 'Alice Mbarga',
        telephone: '06 98 45 21 10'
      },

      'patient-003': {
        nom: 'Paul Ndi',
        telephone: '06 55 32 14 87'
      },

      'patient-004': {
        nom: 'Sophie Kamdem',
        telephone: '06 74 21 65 43'
      },

      'patient-005': {
        nom: 'Michel Tchoumi',
        telephone: '06 82 11 43 90'
      },

      'patient-006': {
        nom: 'Clara Ngono',
        telephone: '06 61 29 38 74'
      }
    };

    const patient = patients[this.patientId];

    if (patient) {
      this.patientNom.set(patient.nom);
      this.patientTelephone.set(patient.telephone);
    }
  }

  // =========================================================
  // COMMANDES FRONTEND DE DÉMONSTRATION
  // =========================================================

  private chargerCommandeFrontend(): void {

    this.chargement.set(true);
    this.messageErreur.set('');

    /*
     * Commandes fictives uniquement pour permettre au frontend
     * de fonctionner avant l'intégration de la route backend
     * de récupération des commandes.
     */

    const commandes: Commande[] = [

      {
        id: 'commande-001',
        priseEnChargeId: 'pec-001',
        cabinetId: 'cabinet-001',
        patientId: 'patient-001',

        numeroMonture: 'MONT-2026-145',
        typeVerre: 'progressif',
        teinte: 'Transparente',
        descriptionFoyers:
          'Progressif personnalisé avec zone de lecture élargie',
        port: 'permanent',
        antireflet: 'Premium',
        autresDetails:
          'Écart pupillaire : 63 mm — épaisseur standard',

        diagnosticOeilDroit: {
          sphere: -1.25,
          cylindre: -0.5,
          axe: 90,
          addition: 2
        },

        diagnosticOeilGauche: {
          sphere: -1.0,
          cylindre: -0.25,
          axe: 85,
          addition: 2
        },

        statut: 'enCours',

        modifieParId: 'utilisateur-opticien-001',

        dateInitiation: new Date('2026-09-02T09:30:00'),
        dateDerniereMiseAJour: new Date('2026-09-05T14:20:00'),

        notificationEnvoyee: false
      },

      {
        id: 'commande-002',
        priseEnChargeId: 'pec-002',
        cabinetId: 'cabinet-001',
        patientId: 'patient-002',

        numeroMonture: 'MONT-2026-198',
        typeVerre: 'unifocal',
        teinte: 'Transparente',
        descriptionFoyers: 'Verres unifocaux standards',
        port: 'permanent',
        antireflet: 'Standard',
        autresDetails: 'Écart pupillaire : 61 mm',

        diagnosticOeilDroit: {
          sphere: -2.0,
          cylindre: -0.75,
          axe: 90,
          addition: 0
        },

        diagnosticOeilGauche: {
          sphere: -1.75,
          cylindre: -0.5,
          axe: 80,
          addition: 0
        },

        statut: 'enVerification',

        modifieParId: 'utilisateur-opticien-001',

        dateInitiation: new Date('2026-08-29T10:15:00'),
        dateDerniereMiseAJour: new Date('2026-09-06T11:45:00'),

        notificationEnvoyee: false
      },

      {
        id: 'commande-003',
        priseEnChargeId: 'pec-003',
        cabinetId: 'cabinet-001',
        patientId: 'patient-003',

        numeroMonture: 'MONT-2026-176',
        typeVerre: 'bifocal',
        teinte: 'Légèrement teintée',
        descriptionFoyers: 'Bifocal classique',
        port: 'occasionnel',
        antireflet: 'Premium',
        autresDetails: 'Écart pupillaire : 64 mm',

        diagnosticOeilDroit: {
          sphere: 1.25,
          cylindre: -0.5,
          axe: 90,
          addition: 2.5
        },

        diagnosticOeilGauche: {
          sphere: 1.5,
          cylindre: -0.75,
          axe: 95,
          addition: 2.5
        },

        statut: 'termine',

        modifieParId: 'utilisateur-opticien-001',

        dateInitiation: new Date('2026-08-20T08:30:00'),
        dateDerniereMiseAJour: new Date('2026-08-28T15:00:00'),

        notificationEnvoyee: true
      },

      {
        id: 'commande-004',
        priseEnChargeId: 'pec-004',
        cabinetId: 'cabinet-001',
        patientId: 'patient-004',

        numeroMonture: 'MONT-2026-205',
        typeVerre: 'unifocal',
        teinte: 'Photochromique',
        descriptionFoyers: 'Verre unifocal photochromique',
        port: 'permanent',
        antireflet: 'Premium',
        autresDetails: 'Écart pupillaire : 60 mm',

        diagnosticOeilDroit: {
          sphere: -0.75,
          cylindre: -0.25,
          axe: 90,
          addition: 0
        },

        diagnosticOeilGauche: {
          sphere: -0.5,
          cylindre: -0.25,
          axe: 90,
          addition: 0
        },

        statut: 'initie',

        modifieParId: 'utilisateur-opticien-001',

        dateInitiation: new Date('2026-09-07T09:00:00'),
        dateDerniereMiseAJour: new Date('2026-09-07T09:00:00'),

        notificationEnvoyee: false
      }
    ];

    let commandeTrouvee: Commande | undefined;

    /*
     * Si un commandeId est fourni, on cherche précisément
     * cette commande.
     */
    if (this.commandeId) {

      commandeTrouvee = commandes.find(
        commande => commande.id === this.commandeId
      );

    } else if (this.patientId) {

      /*
       * Sinon, on cherche la commande du patient.
       */
      commandeTrouvee = commandes.find(
        commande => commande.patientId === this.patientId
      );
    }

    /*
     * Pour les patients sans commande dans la démo,
     * on affiche un message propre.
     */
    if (!commandeTrouvee) {

      this.commande.set(null);

      this.messageErreur.set(
        'Aucune commande enregistrée pour ce patient.'
      );

      this.chargement.set(false);

      return;
    }

    this.commande.set(commandeTrouvee);

    /*
     * On conserve l'identifiant pour les navigations futures.
     */
    this.commandeId = commandeTrouvee.id;

    this.chargement.set(false);
  }

  // =========================================================
  // STATUT
  // =========================================================

  changerStatut(statut: StatutCommande): void {

    const commandeActuelle = this.commande();

    if (!commandeActuelle) {
      return;
    }

    /*
     * Frontend uniquement :
     * on met à jour la commande localement.
     *
     * Le backend pourra ensuite remplacer cette partie
     * par CommandeService.mettreAJourStatut().
     */

    const commandeMiseAJour: Commande = {
      ...commandeActuelle,
      statut,
      dateDerniereMiseAJour: new Date(),

      /*
       * Le frontend ne modifie normalement pas notificationEnvoyee.
       * On le laisse donc inchangé.
       */
      notificationEnvoyee: commandeActuelle.notificationEnvoyee
    };

    this.commande.set(commandeMiseAJour);
  }

  // =========================================================
  // STATUT ACTUEL
  // =========================================================

  statutLibelle(statut: StatutCommande): string {

    const libelles: Record<StatutCommande, string> = {
      initie: 'Initiée',
      enCours: 'En cours',
      enVerification: 'En vérification',
      termine: 'Terminée'
    };

    return libelles[statut];
  }

  statutClasse(statut: StatutCommande): string {

    const classes: Record<StatutCommande, string> = {
      initie: 'status-initie',
      enCours: 'status-encours',
      enVerification: 'status-verification',
      termine: 'status-termine'
    };

    return classes[statut];
  }

  // =========================================================
  // PROGRESSION
  // =========================================================

  etapeActive(statut: StatutCommande): number {

    const etapes: Record<StatutCommande, number> = {
      initie: 1,
      enCours: 2,
      enVerification: 3,
      termine: 4
    };

    return etapes[statut];
  }

  etapeTerminee(
    etape: number,
    statut: StatutCommande
  ): boolean {

    return etape <= this.etapeActive(statut);
  }

  // =========================================================
  // DIAGNOSTIC
  // =========================================================

  formatDioptrie(valeur: number): string {

    if (valeur > 0) {
      return `+${valeur.toFixed(2)}`;
    }

    return valeur.toFixed(2);
  }

  formatAxe(valeur: number): string {

    return `${valeur}°`;
  }

  // =========================================================
  // DATE
  // =========================================================

  formaterDate(date: Date | string | null | undefined): string {

    if (!date) {
      return '—';
    }

    const dateObj = date instanceof Date
      ? date
      : new Date(date);

    if (Number.isNaN(dateObj.getTime())) {
      return '—';
    }

    return new Intl.DateTimeFormat('fr-FR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    }).format(dateObj);
  }

  // =========================================================
  // INITIALES
  // =========================================================

  initiales(): string {

    const nom = this.patientNom();

    const morceaux = nom
      .trim()
      .split(' ')
      .filter(Boolean);

    if (morceaux.length >= 2) {
      return (
        morceaux[0].charAt(0) +
        morceaux[morceaux.length - 1].charAt(0)
      ).toUpperCase();
    }

    return nom.substring(0, 2).toUpperCase();
  }

  // =========================================================
  // NAVIGATION
  // =========================================================

  retourDossier(): void {

    if (this.dossierVisuelId) {

      this.router.navigate(
        ['/opticien/dossier-visuel-patient'],
        {
          queryParams: {
            dossierVisuelId: this.dossierVisuelId
          }
        }
      );

      return;
    }

    /*
     * Si le dossier visuel n'est pas connu,
     * on revient simplement à la liste des patients.
     */
    this.router.navigate(['/opticien/mes-patients']);
  }

  retournerPatients(): void {

    this.router.navigate(['/opticien/mes-patients']);
  }
}