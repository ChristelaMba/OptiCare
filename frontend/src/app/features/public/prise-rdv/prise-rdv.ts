import { Component, OnInit, signal } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import {
  FormBuilder,
  FormGroup,
  ReactiveFormsModule,
  Validators
} from '@angular/forms';

import { HttpErrorResponse } from '@angular/common/http';

import { Auth } from '../../../core/services/auth';
import { messageErreurApi } from '../../../core/utils/api-errors';
import { Cabinet } from '../../../core/services/cabinet';
import { RendezVousService } from '../../../core/services/rendez-vous';
import {
  JourCalendrier,
  NouveauRendezVousPayload
} from '../../../models/rendez-vous.model';
import { DatePipe } from '@angular/common';

// Liste de repli : à supprimer quand les créneaux réels fonctionnent (voir bloc « CRÉNEAUX » du composant).
const CRENEAUX_LOCAUX_INDICATIFS = ['09:00', '09:30', '10:00', '10:30', '11:00', '14:00', '14:30', '15:00', '15:30'];
const CRENEAUX_LOCAUX_INDISPONIBLES = ['10:30'];

@Component({
  selector: 'app-prise-rdv',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    RouterLink,DatePipe
  ],
  templateUrl: './prise-rdv.html',
  styleUrl: './prise-rdv.css',
})
export class PriseRdv implements OnInit {

  /* =====================================================
     CABINET
  ====================================================== */

  cabinetId = '';

  /** Nom réel du cabinet, chargé via GET /cabinets/{id} (plus de valeur codée en dur). */
  cabinetNom = signal('ce cabinet');


  /* =====================================================
     MENU MOBILE
  ====================================================== */

  menuOuvert = false;


  /* =====================================================
     UTILISATEUR
  ====================================================== */

  // Renseignés dans ngOnInit depuis Auth : seul un compte patient est
  // traité comme « connecté » ici (POST /rdv déduit alors le patient du token).
  estConnecte = false;

  utilisateurNom = '';
  utilisateurTelephone = '';


  /* =====================================================
     CALENDRIER
  ====================================================== */

  moisAffiche = new Date();

  joursCalendrier: JourCalendrier[] = [];

  joursSemaine = [
    'Lun',
    'Mar',
    'Mer',
    'Jeu',
    'Ven',
    'Sam',
    'Dim'
  ];


  /* =====================================================
     SÉLECTION
  ====================================================== */

  dateSelectionnee: Date | null = null;

  heureSelectionnee = '';


  /* =====================================================
     CRÉNEAUX

     Source : GET /cabinets/{id}/slots?date=... (RendezVousService.listerCreneaux()).

     TODO(retirer la liste locale) : tant qu'un cabinet n'a ouvert aucune
     plage horaire (aujourd'hui tous : POST /cabinets/{id}/creneaux est
     bloqué par le bug serveur CheckRole), `slots` est vide et on affiche
     CRENEAUX_LOCAUX_INDICATIFS avec un avertissement « horaires
     indicatifs ». Le serveur ne contrôle pas ces heures (ni plage, ni
     double réservation — tickets back 1 et 3) : le cabinet confirme le RDV.
     DÈS QUE les créneaux réels sont disponibles et testés : supprimer
     CRENEAUX_LOCAUX_INDICATIFS, CRENEAUX_LOCAUX_INDISPONIBLES et la
     branche de repli de chargerCreneaux() (afficher alors simplement
     « aucun créneau ce jour-là » si la liste est vide).

     Signals (et non propriétés simples) : l'app tourne sans zone.js, une
     mutation dans un callback .subscribe() ne redéclencherait pas le rendu.
  ====================================================== */

  creneaux = signal<string[]>(CRENEAUX_LOCAUX_INDICATIFS);

  creneauxIndisponibles = signal<string[]>(CRENEAUX_LOCAUX_INDISPONIBLES);

  /** true quand la liste affichée est la liste locale de repli (et non les créneaux réels du cabinet). */
  creneauxIndicatifs = signal(true);

  chargementCreneaux = signal(false);

  /** Dernière date (YYYY-MM-DD) demandée — écarte les réponses tardives d'une date précédente. */
  private dateCreneauxDemandee = '';


  /* =====================================================
     FORMULAIRE
  ====================================================== */

  form: FormGroup;


  /* =====================================================
     ÉTAT DE LA RÉSERVATION
  ====================================================== */

  // 2026-09-03 : signals plutôt que propriétés simples — l'app tourne
  // sans zone.js (aucun provideZoneChangeDetection/ProvideZoneless
  // explicite non plus, cf. app.config.ts), et une mutation de propriété
  // simple à l'intérieur d'un callback .subscribe() (donc hors de la pile
  // synchrone du clic) ne redéclenche pas le rendu — déjà rencontré et
  // corrigé de la même façon sur nouvelle-fiche-consultation.ts.
  enSoumission = signal(false);

  reservationConfirmee = signal(false);

  /** true si le serveur a confirmé le RDV (patient connecté) ; false = « reserve », en attente du cabinet (visiteur). */
  rdvConfirme = signal(false);

  erreurSoumission = signal<string | null>(null);


  /* =====================================================
     CONSTRUCTEUR
  ====================================================== */

  constructor(
    private readonly fb: FormBuilder,
    private readonly route: ActivatedRoute,
    private readonly router: Router,
    private readonly rendezVousService: RendezVousService,
    private readonly auth: Auth,
    private readonly cabinetService: Cabinet
  ) {

    this.form = this.fb.group({

      nomComplet: [
        '',
        Validators.required
      ],

      telephone: [
        '',
        Validators.required
      ],

      email: [
        ''
      ],

      motif: [
        ''
      ],

      accepteConditions: [
        false,
        Validators.requiredTrue
      ]

    });
  }


  /* =====================================================
     INITIALISATION
  ====================================================== */

  ngOnInit(): void {

    /*
     * Récupération de l'identifiant du cabinet
     */
    const idFromRoute =
      this.route.snapshot.paramMap.get('id') ??
      this.route.snapshot.paramMap.get('cabinetId');

    if (idFromRoute) {
      this.cabinetId = idFromRoute;

      this.cabinetService.obtenirDetail(idFromRoute).subscribe({
        next: (cabinet) => this.cabinetNom.set(cabinet.nom),
        // Nom indisponible : on garde le libellé neutre, la réservation reste possible.
        error: () => undefined
      });
    }


    /*
     * Pré-remplissage si l'utilisateur
     * est connecté
     */
    const utilisateur = this.auth.utilisateur();

    if (this.auth.role() === 'patient' && utilisateur) {

      this.estConnecte = true;
      this.utilisateurNom = `${utilisateur.prenom} ${utilisateur.nom}`;
      this.utilisateurTelephone = utilisateur.telephone;

      this.form.patchValue({
        nomComplet: this.utilisateurNom,
        telephone: this.utilisateurTelephone
      });

      this.form.get('nomComplet')?.disable();
      this.form.get('telephone')?.disable();

    }


    /*
     * Génération du calendrier
     */
    this.genererCalendrier();
  }


  /* =====================================================
     MENU MOBILE
  ====================================================== */

  toggleMenu(): void {
    this.menuOuvert = !this.menuOuvert;
  }


  fermerMenu(): void {
    this.menuOuvert = false;
  }


  /* =====================================================
     CONNEXION
  ====================================================== */

  connexion(): void {

    /*
     * On ferme le menu mobile
     */
    this.fermerMenu();

    /*
     * Redirection vers la page de connexion.
     *
     * Si ta route est différente,
     * il faudra simplement modifier '/connexion'.
     */
    this.router.navigate(['/auth/connexion']);
  }


  /* =====================================================
     CRÉATION DE COMPTE
  ====================================================== */

  creerCompte(): void {

    this.fermerMenu();

    this.router.navigate(['/auth/inscription']);
  }


  /* =====================================================
     CALENDRIER
  ====================================================== */

  genererCalendrier(): void {

    const annee = this.moisAffiche.getFullYear();

    const mois = this.moisAffiche.getMonth();


    /*
     * Premier jour du mois
     */
    const premierJourMois =
      new Date(annee, mois, 1);


    /*
     * Dernier jour du mois
     */
    const dernierJourMois =
      new Date(annee, mois + 1, 0);


    /*
     * JavaScript :
     *
     * Dimanche = 0
     * Lundi = 1
     * ...
     *
     * On transforme pour avoir :
     *
     * Lundi = 0
     * Mardi = 1
     * ...
     * Dimanche = 6
     */
    const decalageDebut =
      (premierJourMois.getDay() + 6) % 7;


    const jours: JourCalendrier[] = [];


    /*
     * Date actuelle
     */
    const aujourdhui = new Date();

    aujourdhui.setHours(
      0,
      0,
      0,
      0
    );


    /* ---------------------------------------------
       JOURS DU MOIS PRÉCÉDENT
    --------------------------------------------- */

    for (
      let i = decalageDebut;
      i > 0;
      i--
    ) {

      const date =
        new Date(
          annee,
          mois,
          1 - i
        );

      jours.push({

        jour: date.getDate(),

        dateComplete: date,

        disponible: false,

        horsMois: true,

        estAujourdhui: false

      });
    }


    /* ---------------------------------------------
       JOURS DU MOIS ACTUEL
    --------------------------------------------- */

    for (
      let j = 1;
      j <= dernierJourMois.getDate();
      j++
    ) {

      const date =
        new Date(
          annee,
          mois,
          j
        );


      const estPasse =
        date < aujourdhui;


      const estDimanche =
        date.getDay() === 0;


      jours.push({

        jour: j,

        dateComplete: date,

        disponible:
          !estPasse &&
          !estDimanche,

        horsMois: false,

        estAujourdhui:
          date.getTime() ===
          aujourdhui.getTime()

      });
    }


    /* ---------------------------------------------
       JOURS DU MOIS SUIVANT
    --------------------------------------------- */

    const resteJours =
      jours.length % 7;


    if (resteJours !== 0) {

      const aCompleter =
        7 - resteJours;


      const dernierJourDate =
        jours[jours.length - 1].dateComplete;


      for (
        let k = 1;
        k <= aCompleter;
        k++
      ) {

        const date =
          new Date(
            dernierJourDate
          );

        date.setDate(
          date.getDate() + k
        );


        jours.push({

          jour: date.getDate(),

          dateComplete: date,

          disponible: false,

          horsMois: true,

          estAujourdhui: false

        });
      }
    }


    this.joursCalendrier = jours;
  }


  /* =====================================================
     NOM DU MOIS
  ====================================================== */

  get nomMoisAffiche(): string {

    return this.moisAffiche.toLocaleDateString(
      'fr-FR',
      {
        month: 'long',
        year: 'numeric'
      }
    );
  }


  /* =====================================================
     MOIS PRÉCÉDENT
  ====================================================== */

  moisPrecedent(): void {

    this.moisAffiche =
      new Date(
        this.moisAffiche.getFullYear(),
        this.moisAffiche.getMonth() - 1,
        1
      );


    this.genererCalendrier();
  }


  /* =====================================================
     MOIS SUIVANT
  ====================================================== */

  moisSuivant(): void {

    this.moisAffiche =
      new Date(
        this.moisAffiche.getFullYear(),
        this.moisAffiche.getMonth() + 1,
        1
      );


    this.genererCalendrier();
  }


  /* =====================================================
     SÉLECTION D'UNE DATE
  ====================================================== */

  selectionnerJour(
    jour: JourCalendrier
  ): void {

    /*
     * Impossible de sélectionner
     * un jour indisponible.
     */
    if (!jour.disponible) {
      return;
    }


    this.dateSelectionnee =
      jour.dateComplete;


    /*
     * Lorsque la date change,
     * on réinitialise l'heure.
     */
    this.heureSelectionnee = '';

    this.chargerCreneaux(jour.dateComplete);
  }


  /* =====================================================
     CHARGEMENT DES CRÉNEAUX D'UNE DATE
  ====================================================== */

  private chargerCreneaux(date: Date): void {

    const dateIso = this.formaterDateLocale(date);

    this.dateCreneauxDemandee = dateIso;
    this.chargementCreneaux.set(true);

    // Repli sur la liste locale — voir le TODO du bloc « CRÉNEAUX ».
    const afficherListeLocale = (): void => {
      this.creneaux.set(CRENEAUX_LOCAUX_INDICATIFS);
      this.creneauxIndisponibles.set(CRENEAUX_LOCAUX_INDISPONIBLES);
      this.creneauxIndicatifs.set(true);
      this.chargementCreneaux.set(false);
    };

    this.rendezVousService
      .listerCreneaux(this.cabinetId, dateIso)
      .subscribe({

        next: (reels) => {

          if (dateIso !== this.dateCreneauxDemandee) {
            return;
          }

          if (reels.length === 0) {
            afficherListeLocale();
            return;
          }

          this.creneaux.set(reels.map(c => c.heure));
          this.creneauxIndisponibles.set(
            reels.filter(c => !c.disponible).map(c => c.heure)
          );
          this.creneauxIndicatifs.set(false);
          this.chargementCreneaux.set(false);
        },

        error: () => {

          if (dateIso === this.dateCreneauxDemandee) {
            afficherListeLocale();
          }
        }

      });
  }


  /* =====================================================
     DATE LOCALE → YYYY-MM-DD
  ====================================================== */

  // Date locale (pas toISOString) : minuit local au Cameroun (UTC+1)
  // retombe la veille en UTC et réserverait le mauvais jour.
  private formaterDateLocale(date: Date): string {

    return [
      date.getFullYear(),
      String(date.getMonth() + 1).padStart(2, '0'),
      String(date.getDate()).padStart(2, '0'),
    ].join('-');
  }


  /* =====================================================
     JOUR SÉLECTIONNÉ
  ====================================================== */

  estJourSelectionne(
    jour: JourCalendrier
  ): boolean {

    if (!this.dateSelectionnee) {
      return false;
    }


    return (
      jour.dateComplete.toDateString() ===
      this.dateSelectionnee.toDateString()
    );
  }


  /* =====================================================
     SÉLECTION D'UNE HEURE
  ====================================================== */

  selectionnerHeure(
    heure: string
  ): void {

    /*
     * Impossible de sélectionner
     * un créneau indisponible.
     */
    if (
      this.creneauxIndisponibles().includes(heure)
    ) {
      return;
    }


    this.heureSelectionnee = heure;
  }


  /* =====================================================
     DATE FORMATÉE
  ====================================================== */

  get dateSelectionneeFormatee(): string {

    if (!this.dateSelectionnee) {
      return 'Sélectionnez une date';
    }


    return this.dateSelectionnee.toLocaleDateString(
      'fr-FR',
      {
        weekday: 'long',
        day: 'numeric',
        month: 'long',
        year: 'numeric'
      }
    );
  }


  /* =====================================================
     PEUT CONFIRMER
  ====================================================== */

  get peutConfirmer(): boolean {

    return (
      !!this.dateSelectionnee &&
      !!this.heureSelectionnee &&
      this.form.valid
    );
  }


  /* =====================================================
     CONFIRMATION DU RENDEZ-VOUS
  ====================================================== */

  confirmerRendezVous(): void {

    /*
     * Vérification avant soumission
     */
    if (
      !this.peutConfirmer ||
      !this.dateSelectionnee
    ) {

      this.form.markAllAsTouched();

      return;
    }


    /*
     * Empêcher les doubles clics
     */
    if (this.enSoumission()) {
      return;
    }


    this.enSoumission.set(true);
    this.erreurSoumission.set(null);


    /*
     * Création du payload
     */
    const payload: NouveauRendezVousPayload = {

      cabinetId: this.cabinetId,

      date: this.formaterDateLocale(this.dateSelectionnee),

      heure:
        this.heureSelectionnee,

      motif:
        this.form.get('motif')?.value || '',

      nomComplet:
        this.form.get('nomComplet')?.value || '',

      telephone:
        this.form.get('telephone')?.value || '',

      email:
        this.form.get('email')?.value || ''

    };


    /*
     * 2026-09-03 : appel réel — POST /rendezvous (§8, confirmée). Le
     * console.log() + setTimeout() qui simulait un succès a été retiré.
     */
    this.rendezVousService
      .creer(payload)
      .subscribe({

        next: (rdv) => {
          this.enSoumission.set(false);
          this.rdvConfirme.set(rdv.statut === 'confirme');
          this.reservationConfirmee.set(true);
        },

        // 422 métier (ROUTES-API-LIONEL §6.1) : message du serveur tel quel (`errors.general` : créneau déjà
        // réservé, aucune plage horaire active, téléphone obligatoire pour un visiteur…).
        error: (erreur: HttpErrorResponse) => {
          this.enSoumission.set(false);
          this.erreurSoumission.set(
            messageErreurApi(
              erreur,
              "Impossible d'enregistrer votre rendez-vous pour le moment. Réessayez dans quelques instants."
            )
          );

          // Un créneau pris ou fermé : on rafraîchit la liste affichée pour ne plus le proposer.
          if (erreur.status === 422 && this.dateSelectionnee) {
            this.heureSelectionnee = '';
            this.chargerCreneaux(this.dateSelectionnee);
          }
        }

      });
  }


  /* =====================================================
     RETOUR À LA VITRINE DU CABINET
  ====================================================== */

  retourVitrine(): void {

    this.fermerMenu();


    if (this.cabinetId) {

      this.router.navigate([
        '/cabinet',
        this.cabinetId
      ]);

      return;
    }


    this.router.navigate(['/']);
  }


  /* =====================================================
     RETOUR ACCUEIL
  ====================================================== */

  allerAccueil(): void {

    this.router.navigate([this.estConnecte ? '/patient/rendez-vous' : '/']);
  }

}