import { Component, OnInit, inject, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { ActivatedRoute, RouterLink } from '@angular/router';

import { CommandeService } from '../../../core/services/commande';
import { PatientService } from '../../../core/services/patient';
import { Commande, StatutCommande } from '../../../models/commande.model';
import { Patient } from '../../../models/patient.model';

/**
 * Ordre d'affichage du sélecteur de statut (§9.5 : « initié → en cours →
 * en vérification → terminé »). Ce n'est qu'un ordre d'affichage — les
 * transitions ne sont pas verrouillées côté front : le §5 ne décrit
 * aucune règle de progression stricte, juste que le statut est modifiable
 * par un Opticien ou une Secrétaire. changerStatut() accepte donc
 * n'importe quelle valeur de la liste, dans n'importe quel ordre.
 */
const ETAPES_STATUT: { valeur: StatutCommande; libelle: string }[] = [
  { valeur: 'initie', libelle: 'Initié' },
  { valeur: 'enCours', libelle: 'En cours' },
  { valeur: 'enVerification', libelle: 'En vérification' },
  { valeur: 'termine', libelle: 'Terminé' },
];

/**
 * Écran construit de zéro le 2026-09-02 — jusque-là un scaffold Angular
 * CLI vide (`<p>suivi-commande works!</p>`). Voir
 * JOURNAL-MODIFICATIONS-PARTAGEES.md pour le détail complet.
 *
 * Choix assumé : la « prise en charge liée » (§9.5) est affichée comme
 * simple référence (priseEnChargeId), sans re-fetch de l'entité complète
 * via PriseEnChargeService.obtenirParId() — cette méthode est déjà une
 * hypothèse non confirmée, et prise-en-charge-mock-data.ts démarre vide
 * en dev (peuplé seulement au runtime par un vrai passage dans
 * nouvelle-fiche-consultation.ts). Empiler une deuxième hypothèse
 * non confirmée sur la première n'aurait rien apporté de fiable à
 * afficher dans l'état actuel du mock.
 */
@Component({
  selector: 'app-suivi-commande',
  standalone: true,
  imports: [DatePipe, RouterLink],
  templateUrl: './suivi-commande.html',
  styleUrl: './suivi-commande.css'
})
export class SuiviCommande implements OnInit {

  private readonly route = inject(ActivatedRoute);
  private readonly commandeService = inject(CommandeService);
  private readonly patientService = inject(PatientService);

  readonly etapesStatut = ETAPES_STATUT;

  commandeId = '';

  isLoading = signal(true);
  errorMessage = signal<string | null>(null);

  commande = signal<Commande | null>(null);
  patient = signal<Patient | null>(null);

  // Séparé du chargement initial : une mise à jour de statut qui échoue
  // ne doit pas re-basculer tout l'écran en état d'erreur générale.
  isUpdatingStatut = signal(false);
  updateError = signal<string | null>(null);

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('commandeId');

    if (id) {
      this.commandeId = id;
    }

    this.chargerCommande();
  }

  chargerCommande(): void {

    if (!this.commandeId) {
      this.isLoading.set(false);
      this.errorMessage.set('Identifiant de commande manquant dans l\'URL.');
      return;
    }

    this.isLoading.set(true);
    this.errorMessage.set(null);

    this.commandeService.lire(this.commandeId).subscribe({

      next: (commande) => {
        this.commande.set(commande);
        this.isLoading.set(false);
        this.chargerPatient(commande.patientId);
      },

      error: () => {
        this.isLoading.set(false);
        this.errorMessage.set('Impossible de charger cette commande. Réessayez plus tard.');
      }

    });
  }

  private chargerPatient(patientId: string): void {

    this.patientService.getPatientById(patientId).subscribe({

      next: (patient) => this.patient.set(patient),

      // Échec traité séparément : la commande reste consultable même si
      // le rappel patient ne peut pas être résolu (dégradation propre,
      // pas d'erreur bloquante pour toute la page).
      error: () => this.patient.set(null)

    });
  }

  changerStatut(statut: StatutCommande): void {

    const commande = this.commande();

    if (!commande || commande.statut === statut || this.isUpdatingStatut()) {
      return;
    }

    this.isUpdatingStatut.set(true);
    this.updateError.set(null);

    this.commandeService.mettreAJourStatut(commande.id, statut).subscribe({

      next: (miseAJour) => {
        this.commande.set(miseAJour);
        this.isUpdatingStatut.set(false);
      },

      error: () => {
        this.isUpdatingStatut.set(false);
        this.updateError.set('Impossible de mettre à jour le statut. Réessayez.');
      }

    });
  }

  initiales(patient: Patient): string {
    return `${patient.prenom.charAt(0)}${patient.nom.charAt(0)}`.toUpperCase();
  }
}
