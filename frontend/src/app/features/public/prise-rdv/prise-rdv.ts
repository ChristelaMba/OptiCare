import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import {
  FormBuilder,
  FormGroup,
  ReactiveFormsModule,
  Validators
} from '@angular/forms';

import { RendezVousService } from '../../../core/services/rendez-vous';
import {
  JourCalendrier,
  NouveauRendezVousPayload
} from '../../../models/rendez-vous.model';
import { DatePipe } from '@angular/common';

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
  cabinetNom = 'Vision Parfaite Clinic';


  /* =====================================================
     MENU MOBILE
  ====================================================== */

  menuOuvert = false;


  /* =====================================================
     UTILISATEUR
  ====================================================== */

  // TODO :
  // Remplacer ces valeurs par les informations
  // provenant du vrai AuthService.
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
  ====================================================== */

  creneaux = [
    '09:00',
    '09:30',
    '10:00',
    '10:30',
    '11:00',
    '14:00',
    '14:30',
    '15:00',
    '15:30'
  ];

  creneauxIndisponibles = [
    '10:30'
  ];


  /* =====================================================
     FORMULAIRE
  ====================================================== */

  form: FormGroup;


  /* =====================================================
     ÉTAT DE LA RÉSERVATION
  ====================================================== */

  enSoumission = false;

  reservationConfirmee = false;


  /* =====================================================
     CONSTRUCTEUR
  ====================================================== */

  constructor(
    private readonly fb: FormBuilder,
    private readonly route: ActivatedRoute,
    private readonly router: Router,
    private readonly rendezVousService: RendezVousService
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
      this.route.snapshot.paramMap.get('cabinetId');

    if (idFromRoute) {
      this.cabinetId = idFromRoute;
    }


    /*
     * Pré-remplissage si l'utilisateur
     * est connecté
     */
    if (this.estConnecte) {

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
    this.router.navigate(['/connexion']);
  }


  /* =====================================================
     CRÉATION DE COMPTE
  ====================================================== */

  creerCompte(): void {

    this.fermerMenu();

    this.router.navigate(['/inscription']);
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
      this.creneauxIndisponibles.includes(heure)
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
    if (this.enSoumission) {
      return;
    }


    this.enSoumission = true;


    /*
     * Création du payload
     */
    const payload: NouveauRendezVousPayload = {

      cabinetId: this.cabinetId,

      date:
        this.dateSelectionnee
          .toISOString()
          .split('T')[0],

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


    console.log(
      'Rendez-vous à créer :',
      payload
    );


    /*
     * -------------------------------------------------
     * VERSION TEMPORAIRE
     * -------------------------------------------------
     *
     * Pour l'instant on simule la création.
     *
     * Quand ton API sera prête, on remplacera
     * ce bloc par :
     *
     * this.rendezVousService
     *   .creerRendezVous(payload)
     *   .subscribe(...)
     *
     */

    setTimeout(() => {

      this.enSoumission = false;

      this.reservationConfirmee = true;

    }, 600);
  }


  /* =====================================================
     RETOUR À LA VITRINE DU CABINET
  ====================================================== */

  retourVitrine(): void {

    this.fermerMenu();


    if (this.cabinetId) {

      this.router.navigate([
        '/cabinets',
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

    this.router.navigate(['/']);
  }

}