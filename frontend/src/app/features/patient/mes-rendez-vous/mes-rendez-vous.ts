import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { RouterLink } from '@angular/router';

import { Auth } from '../../../core/services/auth';
import { RendezVousService } from '../../../core/services/rendez-vous';
import { messagesValidationApi } from '../../../core/utils/api-errors';
import { telechargerIcs } from '../../../core/utils/ics';
import {
  RendezVous,
  StatutRendezVous
} from '../../../models/rendez-vous.model';

type Onglet = 'a-venir' | 'passes';

@Component({
  selector: 'app-mes-rendez-vous',
  standalone: true,
  imports: [
    CommonModule,
    RouterLink
],
  templateUrl: './mes-rendez-vous.html',
  styleUrl: './mes-rendez-vous.css'
})
export class MesRendezVous implements OnInit {

  private readonly rdvService = inject(RendezVousService);
  private readonly auth = inject(Auth);

  /* =====================================================
     ÉTATS
  ===================================================== */

  chargement = signal(true);

  erreur = signal<string | null>(null);

  rendezVous = signal<RendezVous[]>([]);

  ongletActif = signal<Onglet>('a-venir');

  recherche = signal('');

  filtreStatut =
    signal<StatutRendezVous | 'tous'>('tous');

  /* =====================================================
     MENU MOBILE
  ===================================================== */

  menuOuvert = signal(false);

  ouvrirMenu(): void {
    this.menuOuvert.set(true);
  }

  fermerMenu(): void {
    this.menuOuvert.set(false);
  }

  toggleMenu(): void {
    this.menuOuvert.update(ouvert => !ouvert);
  }

  /* =====================================================
     RENDEZ-VOUS
  ===================================================== */

  private estAVenir(rdv: RendezVous): boolean {

    const aujourdhui = new Date();

    aujourdhui.setHours(0, 0, 0, 0);

    return (
      new Date(rdv.date) >= aujourdhui &&
      rdv.statut !== 'annule' &&
      rdv.statut !== 'non_honore'
    );
  }

  /**
   * 'libre' est un état de créneau, pas un rendez-vous réel du patient :
   * on ne l'affiche jamais dans cet écran (voir StatutRendezVous). Le
   * mock peut en renvoyer pour exercer la valeur — on les écarte ici.
   */
  private readonly rendezVousReels = computed(() =>
    this.rendezVous().filter(rdv => rdv.statut !== 'libre')
  );

  rendezVousAVenir = computed(() =>
    this.rendezVousReels().filter(rdv =>
      this.estAVenir(rdv)
    )
  );

  rendezVousPasses = computed(() =>
    this.rendezVousReels().filter(rdv =>
      !this.estAVenir(rdv)
    )
  );

  /** « Ajouter au calendrier » : fichier .ics généré dans le navigateur, aucun appel API. */
  ajouterAuCalendrier(rdv: RendezVous): void {
    try {
      telechargerIcs(rdv);
    } catch {
      this.erreurAnnulation.set("Impossible de générer le fichier de calendrier pour ce rendez-vous.");
    }
  }

  /** Compteur « Consultations passées » : les RDV annulés ne sont pas des consultations (ils restent listés dans l'historique). */
  nombreConsultationsPassees = computed(() =>
    this.rendezVousPasses().filter(rdv => rdv.statut !== 'annule').length
  );

  rendezVousFiltres = computed(() => {

    const source =
      this.ongletActif() === 'a-venir'
        ? this.rendezVousAVenir()
        : this.rendezVousPasses();

    const texte =
      this.recherche().trim().toLowerCase();

    const statut =
      this.filtreStatut();

    return source.filter(rdv => {

      const correspondTexte =
        !texte ||
        rdv.cabinetNom
          .toLowerCase()
          .includes(texte) ||
        rdv.motif
          .toLowerCase()
          .includes(texte) ||
        (
          rdv.praticienNom
            ?.toLowerCase()
            .includes(texte) ?? false
        );

      const correspondStatut =
        statut === 'tous' ||
        rdv.statut === statut;

      return (
        correspondTexte &&
        correspondStatut
      );
    });
  });

  listeVide = computed(() =>
    !this.chargement() &&
    this.rendezVousFiltres().length === 0
  );

  /* =====================================================
     INIT
  ===================================================== */

  ngOnInit(): void {
    this.chargerRendezVous();
  }

  /* =====================================================
     CHARGEMENT
  ===================================================== */

  chargerRendezVous(): void {

    this.chargement.set(true);
    this.erreur.set(null);

    // GET /patients/{patientId}/rdv réel — l'id attendu est celui de la table `patients` (`user.patient.id`,
    // renvoyé à l'inscription et à la connexion), PAS l'id utilisateur. Une session ouverte avant le 19/10/2026
    // peut ne pas l'avoir : on le récupère alors via GET /user (plus de « reconnectez-vous »).
    const patientId = this.auth.utilisateur()?.patientId;

    if (!patientId) {
      this.auth.rafraichirUtilisateur().subscribe({
        next: (utilisateur) => {
          if (utilisateur.patientId) {
            this.chargerPourPatient(utilisateur.patientId);
          } else {
            this.chargement.set(false);
            this.erreur.set('Impossible de charger vos rendez-vous.');
          }
        },
        error: () => {
          this.chargement.set(false);
          this.erreur.set('Impossible de charger vos rendez-vous.');
        }
      });
      return;
    }

    this.chargerPourPatient(patientId);
  }

  private chargerPourPatient(patientId: string): void {

    this.rdvService.getMesRendezVous(patientId)
      .subscribe({

        next: (data) => {

          this.rendezVous.set(data);

          this.chargement.set(false);
        },

        error: () => {

          this.erreur.set(
            'Impossible de charger vos rendez-vous.'
          );

          this.chargement.set(false);
        }

      });
  }

  /* =====================================================
     ONGLET
  ===================================================== */

  /** Recherche de l'adresse renvoyée par l'API (`cabinet.adresse`, `cabinet.ville`) dans Google Maps. */
  lienEmplacement(adresse: string): string {
    return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(adresse)}`;
  }

  changerOnglet(onglet: Onglet): void {

    this.ongletActif.set(onglet);

  }

  /* =====================================================
     ANNULATION
  ===================================================== */

  /** Message d'échec d'annulation, affiché au-dessus de la liste (la liste reste visible). */
  erreurAnnulation = signal<string | null>(null);

  /** id du RDV dont l'annulation est en cours — bloque le double clic. */
  annulationEnCours = signal<string | null>(null);

  /** Rendez-vous dont l'annulation attend confirmation : aucun appel API tant que le patient n'a pas confirmé. */
  rdvAConfirmer = signal<RendezVous | null>(null);

  demanderAnnulation(rdv: RendezVous): void {
    if (this.annulationEnCours() || rdv.statut === 'annule') return;
    this.rdvAConfirmer.set(rdv);
  }

  /** « Garder » : le rendez-vous n'est pas modifié. */
  garderRendezVous(): void {
    this.rdvAConfirmer.set(null);
  }

  confirmerAnnulation(): void {
    const rdv = this.rdvAConfirmer();
    this.rdvAConfirmer.set(null);
    if (rdv) this.annulerRendezVous(rdv);
  }

  annulerRendezVous(
    rdv: RendezVous
  ): void {

    if (this.annulationEnCours() || rdv.statut === 'annule') {
      return;
    }

    this.erreurAnnulation.set(null);
    this.annulationEnCours.set(rdv.id);

    this.rdvService
      .annulerRendezVous(rdv.id)
      .subscribe({

        next: () => {

          // Le RDV passe en « annulé » et migre dans l'historique (onglet « passés »).
          this.rendezVous.update(liste =>
            liste.map(r =>
              r.id === rdv.id
                ? {
                    ...r,
                    statut: 'annule' as const
                  }
                : r
            )
          );

          this.annulationEnCours.set(null);
        },

        error: (erreur: HttpErrorResponse) => {

          // 422 : `errors.rdv[0]` du serveur (« Ce RDV est déjà annulé. », « Vous n'êtes pas autorisé… ») ;
          // 403 : « Accès refusé ».
          this.erreurAnnulation.set(
            erreur.status === 403
              ? 'Accès refusé.'
              : erreur.status === 0
                ? "Impossible d'annuler ce rendez-vous : le serveur est injoignable. Vérifiez votre connexion et réessayez."
                : (messagesValidationApi(erreur)[0]
                    ? `Impossible d'annuler ce rendez-vous : ${messagesValidationApi(erreur)[0]}`
                    : "Impossible d'annuler ce rendez-vous pour le moment. Réessayez dans quelques instants.")
          );

          this.annulationEnCours.set(null);
        }

      });
  }

  /* =====================================================
     LIBELLÉ STATUT
  ===================================================== */

  libelleStatut(
    statut: StatutRendezVous
  ): string {

    const libelles:
      Record<StatutRendezVous, string> = {

      libre: 'Libre',

      reserve: 'En attente',

      confirme: 'Confirmé',

      annule: 'Annulé',

      termine: 'Terminé',

      non_honore: 'Non honoré'

    };

    return libelles[statut];
  }
}