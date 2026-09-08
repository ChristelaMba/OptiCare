import {
  Component,
  OnInit,
  inject,
  signal,
  computed
} from '@angular/core';

import {
  ActivatedRoute,
  Router
} from '@angular/router';

import {
  FormBuilder,
  FormGroup,
  ReactiveFormsModule,
  Validators
} from '@angular/forms';

import {
  FicheConsultationService
} from '../../../core/services/fiche-consultation';

import {
  PriseEnCharge as PriseEnChargeService
} from '../../../core/services/prise-en-charge';

import {
  Auth
} from '../../../core/services/auth';

import {
  NouvelleFicheConsultationPayload
} from '../../../models/fiche-consultation.model';


@Component({
  selector: 'app-nouvelle-fiche-consultation',
  standalone: true,
  imports: [
    ReactiveFormsModule
  ],
  templateUrl: './nouvelle-fiche-consultation.html',
  styleUrl: './nouvelle-fiche-consultation.css'
})
export class NouvelleFicheConsultation
  implements OnInit {


  // =========================================================
  // SERVICES
  // =========================================================

  private readonly auth = inject(Auth);

  private readonly priseEnChargeService =
    inject(PriseEnChargeService);

  private readonly route =
    inject(ActivatedRoute);

  private readonly router =
    inject(Router);

  private readonly fb =
    inject(FormBuilder);

  private readonly ficheConsultationService =
    inject(FicheConsultationService);


  // =========================================================
  // INFORMATIONS PATIENT
  // =========================================================

  patientNom = '';

  patientRef = '';


  // =========================================================
  // FORMULAIRE
  // =========================================================

  form: FormGroup;


  // =========================================================
  // ETAT
  // =========================================================

  readonly enSoumission =
    signal(false);


  dossierVisuelId = '';

  cabinetId = '';

  opticienId = '';


  // =========================================================
  // PRISE EN CHARGE
  // =========================================================

  readonly priseEnChargeId =
    signal('');

  readonly priseEnChargeStatut =
    signal<
      'initiee'
      | 'enCours'
      | 'terminee'
      | null
    >(null);


  readonly enClotureConsultation =
    signal(false);


  readonly erreurPriseEnCharge =
    signal(false);


  readonly erreurEnregistrement =
    signal(false);


  readonly modifiable =
    computed(() =>
      this.priseEnChargeStatut() !== 'terminee'
    );


  // =========================================================
  // CONSTRUCTEUR
  // =========================================================

  constructor() {

    this.form =
      this.fb.group({

        // -----------------------------------------------------
        // PLAINTES
        // -----------------------------------------------------

        plaintes: this.fb.group({

          visionFlouLoin: [false],

          visionFlouPres: [false],

          visionDouble: [false],

          larmoiement: [false],

          demangeaisons: [false]

        }),


        // -----------------------------------------------------
        // AUTRES PLAINTES
        // -----------------------------------------------------

        autresPlaintes: [''],


        // -----------------------------------------------------
        // OEIL DROIT
        // -----------------------------------------------------

        od: this.fb.group({

          sphere: [null],

          cylindre: [null],

          axe: [
            null,
            [
              Validators.min(0),
              Validators.max(180)
            ]
          ],

          add: [null]

        }),


        // -----------------------------------------------------
        // OEIL GAUCHE
        // -----------------------------------------------------

        og: this.fb.group({

          sphere: [null],

          cylindre: [null],

          axe: [
            null,
            [
              Validators.min(0),
              Validators.max(180)
            ]
          ],

          add: [null]

        }),


        // -----------------------------------------------------
        // OBSERVATIONS
        // -----------------------------------------------------

        observations: [
          '',
          Validators.required
        ]

      });

  }


  // =========================================================
  // INITIALISATION
  // =========================================================

  ngOnInit(): void {

    /*
     * IMPORTANT :
     *
     * On récupère maintenant le dossier depuis
     * les query params.
     *
     * Exemple :
     *
     * /opticien/nouvelle-fiche-consultation
     * ?dossierVisuelId=dv2
     */

    const dossierId =
      this.route.snapshot
        .queryParamMap
        .get('dossierVisuelId');


    // -------------------------------------------------------
    // DOSSIER MANQUANT
    // -------------------------------------------------------

    if (!dossierId) {

      console.error(
        'Identifiant du dossier visuel manquant.'
      );

      this.router.navigate([
        '/opticien/mes-patients'
      ]);

      return;
    }


    // -------------------------------------------------------
    // CONSERVATION DU DOSSIER
    // -------------------------------------------------------

    this.dossierVisuelId =
      dossierId;


    // -------------------------------------------------------
    // INFORMATIONS AUTHENTIFICATION
    // -------------------------------------------------------

    this.opticienId =
      this.auth.utilisateur()?.id ?? '';


    this.cabinetId =
      this.auth.utilisateur()?.cabinetId ?? '';


    // -------------------------------------------------------
    // INFORMATIONS DU PATIENT
    // -------------------------------------------------------

    this.chargerInformationsPatient();


    // -------------------------------------------------------
    // CREATION DE LA PRISE EN CHARGE
    // -------------------------------------------------------

    this.demarrerPriseEnCharge();

  }


  // =========================================================
  // INFORMATIONS PATIENT
  // =========================================================

  private chargerInformationsPatient(): void {

    /*
     * Données frontend temporaires.
     *
     * Elles correspondent aux patients de MesPatients.
     */

    const patients: Record<
      string,
      {
        nom: string;
        ref: string;
      }
    > = {


      dv1: {
        nom: 'Jean Dupont',
        ref: '9482-A'
      },


      dv2: {
        nom: 'Alice Mbarga',
        ref: '9482-B'
      },


      dv3: {
        nom: 'Paul Ndi',
        ref: '9482-C'
      },


      dv4: {
        nom: 'Sophie Kamdem',
        ref: '9482-D'
      },


      dv5: {
        nom: 'Michel Tchoumi',
        ref: '9482-E'
      },


      dv6: {
        nom: 'Clara Ngono',
        ref: '9482-F'
      }

    };


    const patient =
      patients[this.dossierVisuelId];


    if (!patient) {

      this.patientNom =
        'Patient inconnu';

      this.patientRef =
        '';

      return;
    }


    this.patientNom =
      patient.nom;


    this.patientRef =
      patient.ref;

  }


  // =========================================================
  // DEMARRER PRISE EN CHARGE
  // =========================================================

  private demarrerPriseEnCharge(): void {

    this.priseEnChargeService
      .creer({

        dossierVisuelId:
          this.dossierVisuelId,

        cabinetId:
          this.cabinetId,

        type:
          'consultation',

        statut:
          'initiee',

        opticienResponsableId:
          this.opticienId,

        dateDebut:
          new Date()

      })
      .subscribe({

        next: (priseEnCharge) => {

          this.priseEnChargeId
            .set(priseEnCharge.id);


          this.priseEnChargeStatut
            .set(priseEnCharge.statut);

        },


        error: (error) => {

          console.error(
            'Erreur création prise en charge :',
            error
          );

          this.erreurPriseEnCharge
            .set(true);

        }

      });

  }


  // =========================================================
  // ANNULER
  // =========================================================

  annuler(): void {

    if (!this.dossierVisuelId) {

      this.router.navigate([
        '/opticien/mes-patients'
      ]);

      return;
    }


    this.router.navigate(
      ['/opticien/dossier-visuel-patient'],
      {
        queryParams: {
          dossierVisuelId:
            this.dossierVisuelId
        }
      }
    );

  }


  // =========================================================
  // ENREGISTRER
  // =========================================================

  enregistrer(): void {

    // -------------------------------------------------------
    // FORMULAIRE VERROUILLE
    // -------------------------------------------------------

    if (!this.modifiable()) {
      return;
    }


    // -------------------------------------------------------
    // PRISE EN CHARGE MANQUANTE
    // -------------------------------------------------------

    if (!this.priseEnChargeId()) {

      this.erreurPriseEnCharge
        .set(true);

      return;
    }


    // -------------------------------------------------------
    // FORMULAIRE INVALIDE
    // -------------------------------------------------------

    if (this.form.invalid) {

      this.form.markAllAsTouched();

      return;
    }


    this.enSoumission
      .set(true);


    const valeurs =
      this.form.getRawValue();


    // -------------------------------------------------------
    // PAYLOAD
    // -------------------------------------------------------

    const payload:
      NouvelleFicheConsultationPayload = {

        dossierVisuelId:
          this.dossierVisuelId,

        priseEnChargeId:
          this.priseEnChargeId(),

        cabinetId:
          this.cabinetId,

        opticienId:
          this.opticienId,

        plaintes:
          valeurs.plaintes,

        autresPlaintes:
          valeurs.autresPlaintes,

        prescriptionOD:
          valeurs.od,

        prescriptionOG:
          valeurs.og,

        observations:
          valeurs.observations

      };


    // -------------------------------------------------------
    // CREATION DE LA FICHE
    // -------------------------------------------------------

    this.ficheConsultationService
      .creer(payload)
      .subscribe({

        next: () => {

          this.enSoumission
            .set(false);


          this.router.navigate(
            ['/opticien/dossier-visuel-patient'],
            {
              queryParams: {
                dossierVisuelId:
                  this.dossierVisuelId
              }
            }
          );

        },


        error: (error) => {

          console.error(
            'Erreur enregistrement fiche :',
            error
          );


          this.enSoumission
            .set(false);


          this.erreurEnregistrement
            .set(true);

        }

      });

  }


  // =========================================================
  // TERMINER LA CONSULTATION
  // =========================================================

  terminerConsultation(): void {

    if (!this.priseEnChargeId()) {

      this.erreurPriseEnCharge
        .set(true);

      return;
    }


    this.enClotureConsultation
      .set(true);


    this.priseEnChargeService
      .mettreAJourStatut(
        this.priseEnChargeId(),
        'terminee'
      )
      .subscribe({

        next: (priseEnCharge) => {

          this.priseEnChargeStatut
            .set(priseEnCharge.statut);


          this.enClotureConsultation
            .set(false);


          this.verrouillerFormulaire();

        },


        error: (error) => {

          console.error(
            'Erreur clôture consultation :',
            error
          );


          this.enClotureConsultation
            .set(false);


          this.erreurPriseEnCharge
            .set(true);

        }

      });

  }


  // =========================================================
  // VERROUILLER LE FORMULAIRE
  // =========================================================

  private verrouillerFormulaire(): void {

    this.form.disable();

  }

}