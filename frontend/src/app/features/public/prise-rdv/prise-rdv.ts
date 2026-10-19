import { Component, OnInit, computed, signal } from '@angular/core';
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
  CreneauReel,
  JourCalendrier,
  NouveauRendezVousPayload,
  PlageHoraire,
  RendezVous
} from '../../../models/rendez-vous.model';
import { DatePipe } from '@angular/common';

/** État d'un créneau affiché : seul « libre » est sélectionnable. */
type EtatCreneau = 'libre' | 'reserve' | 'pause' | 'deja-vous' | 'indisponible';

interface CreneauAffiche {
  heure: string;
  etat: EtatCreneau;
}

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

  joursCalendrier = signal<JourCalendrier[]>([]);

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

  // Adossés à des signals : l'app tourne sans zone.js, une propriété simple modifiée hors d'un événement
  // du gabarit (réponse HTTP, appel direct) ne redéclencherait pas le rendu.
  private readonly dateSelectionneeSignal = signal<Date | null>(null);

  private readonly heureSelectionneeSignal = signal('');

  get dateSelectionnee(): Date | null {
    return this.dateSelectionneeSignal();
  }

  set dateSelectionnee(valeur: Date | null) {
    this.dateSelectionneeSignal.set(valeur);
  }

  get heureSelectionnee(): string {
    return this.heureSelectionneeSignal();
  }

  set heureSelectionnee(valeur: string) {
    this.heureSelectionneeSignal.set(valeur);
  }


  /* =====================================================
     PLAGES HORAIRES ET CRÉNEAUX

     Plages : GET /cabinets/{id}/creneaux (jours ouverts, cabinet sans plage).
     Créneaux d'une date : GET /cabinets/{id}/slots?date=… ; seuls les créneaux
     « libres » sont sélectionnables (pause, réservé, déjà pris par le patient et
     indisponible sont désactivés). Plus aucune liste d'heures locale : si le
     cabinet n'a aucune plage, un message l'indique ; s'il en a mais qu'aucun
     créneau n'existe ce jour-là, on l'indique aussi.

     ⚠ Défauts serveur connus (Docs/DIAGNOSTIC-CRENEAUX.md) : `est_reserve` reste
     toujours false et POST /rdv accepte la double réservation et la pause. Le
     front ne peut donc pas griser un créneau pris par quelqu'un d'autre ; il ne
     le fait que pour un RDV du patient connecté (garde-fou ci-dessous).

     Signals (et non propriétés simples) : l'app tourne sans zone.js, une
     mutation dans un callback .subscribe() ne redéclencherait pas le rendu.
  ====================================================== */

  /** null = pas encore chargées (ou échec) ; [] = le cabinet n'a aucune plage. */
  plages = signal<PlageHoraire[] | null>(null);

  erreurPlages = signal<string | null>(null);

  cabinetTelephone = signal('');

  /** Le cabinet n'a ouvert aucune plage horaire active. */
  aucunePlage = computed(() => {
    const plages = this.plages();
    return plages !== null && !plages.some((plage) => plage.estActif);
  });

  /** Jours de la semaine (Date.getDay()) ayant au moins une plage active. */
  private joursOuverts = computed(
    () => new Set((this.plages() ?? []).filter((plage) => plage.estActif).map((plage) => plage.jourSemaine))
  );

  private creneauxReels = signal<CreneauReel[]>([]);

  /** Date (YYYY-MM-DD) dont les créneaux sont affichés. */
  private dateAffichee = signal('');

  chargementCreneaux = signal(false);

  erreurCreneaux = signal<string | null>(null);

  /** Rendez-vous du patient connecté (garde-fou contre sa propre double réservation). Vide pour un visiteur. */
  private mesRendezVous = signal<RendezVous[]>([]);

  /** Créneaux affichés, avec leur état. */
  creneaux = computed<CreneauAffiche[]>(() => {
    const date = this.dateAffichee();
    const mesRdv = this.mesRendezVous();

    return this.creneauxReels().map((creneau) => {
      let etat: EtatCreneau = 'libre';

      if (creneau.estDansPause) {
        etat = 'pause';
      } else if (creneau.estReserve) {
        etat = 'reserve';
      } else if (
        // TODO : retirer ce garde-fou quand le serveur détectera lui-même les doubles réservations
        // (est_reserve fiable et refus 422 de POST /rdv sur un créneau pris) — Docs/DIAGNOSTIC-CRENEAUX.md.
        mesRdv.some(
          (rdv) =>
            rdv.cabinetId === this.cabinetId &&
            rdv.date === date &&
            rdv.heureDebut.slice(0, 5) === creneau.heure.slice(0, 5) &&
            rdv.statut !== 'annule'
        )
      ) {
        etat = 'deja-vous';
      } else if (!creneau.disponible) {
        etat = 'indisponible';
      }

      return { heure: creneau.heure, etat };
    });
  });

  libelleEtat(etat: EtatCreneau): string {
    switch (etat) {
      case 'reserve': return 'Réservé';
      case 'pause': return 'Pause';
      case 'deja-vous': return 'Déjà réservé par vous';
      case 'indisponible': return 'Indisponible';
      default: return '';
    }
  }

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
        next: (cabinet) => {
          this.cabinetNom.set(cabinet.nom);
          this.cabinetTelephone.set(cabinet.telephone);
        },
        // Nom indisponible : on garde le libellé neutre.
        error: () => undefined
      });

      this.chargerPlages();
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

      this.chargerMesRendezVous();
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


      // Jour fermé : aucun plage active ce jour de la semaine (dimanche pour les cabinets de démo).
      // Tant que les plages ne sont pas chargées (ou si leur chargement échoue), aucun jour n'est proposé.
      const estFerme =
        !this.joursOuverts().has(date.getDay());


      jours.push({

        jour: j,

        dateComplete: date,

        disponible:
          !estPasse &&
          !estFerme,

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


    this.joursCalendrier.set(jours);
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

  /** GET /cabinets/{id}/creneaux : jours ouverts du cabinet. Un échec laisse le calendrier fermé avec un message. */
  chargerPlages(): void {

    this.erreurPlages.set(null);

    this.rendezVousService.listerPlages(this.cabinetId).subscribe({

      next: (plages) => {
        this.plages.set(plages);
        this.genererCalendrier();
      },

      error: () => {
        this.erreurPlages.set(
          "Impossible de charger les horaires du cabinet pour le moment. Réessayez dans quelques instants."
        );
      }

    });
  }

  /**
   * GET /patients/{patientId}/rdv (route qui fonctionne) — uniquement pour un patient connecté : sert à
   * désactiver les créneaux où il a déjà un rendez-vous non annulé. Un échec n'empêche pas la réservation.
   */
  private chargerMesRendezVous(): void {

    const charger = (patientId: string): void => {
      this.rendezVousService.getMesRendezVous(patientId).subscribe({
        next: (rdvs) => this.mesRendezVous.set(rdvs),
        error: () => undefined
      });
    };

    const patientId = this.auth.utilisateur()?.patientId;

    if (patientId) {
      charger(patientId);
      return;
    }

    this.auth.rafraichirUtilisateur().subscribe({
      next: (utilisateur) => {
        if (utilisateur.patientId) {
          charger(utilisateur.patientId);
        }
      },
      error: () => undefined
    });
  }

  private chargerCreneaux(date: Date): void {

    const dateIso = this.formaterDateLocale(date);

    this.dateCreneauxDemandee = dateIso;
    this.dateAffichee.set(dateIso);
    this.creneauxReels.set([]);
    this.erreurCreneaux.set(null);
    this.chargementCreneaux.set(true);

    this.rendezVousService
      .listerCreneaux(this.cabinetId, dateIso)
      .subscribe({

        next: (reels) => {

          if (dateIso !== this.dateCreneauxDemandee) {
            return;
          }

          this.creneauxReels.set(reels);
          this.chargementCreneaux.set(false);
        },

        error: () => {

          if (dateIso !== this.dateCreneauxDemandee) {
            return;
          }

          this.erreurCreneaux.set('Impossible de charger les créneaux pour le moment. Réessayez dans quelques instants.');
          this.chargementCreneaux.set(false);
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
      this.creneaux().find(c => c.heure === heure)?.etat !== 'libre'
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

          // Le nouveau rendez-vous entre dans le garde-fou du patient connecté.
          if (this.estConnecte) {
            this.chargerMesRendezVous();
          }
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