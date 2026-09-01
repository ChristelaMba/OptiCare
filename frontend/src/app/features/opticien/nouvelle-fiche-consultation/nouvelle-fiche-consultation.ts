import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import {
  FormBuilder,
  FormGroup,
  ReactiveFormsModule,
  Validators
} from '@angular/forms';

import { FicheConsultationService } from '../../../core/services/fiche-consultation';
import { PriseEnCharge as PriseEnChargeService } from '../../../core/services/prise-en-charge';
import { Auth } from '../../../core/services/auth';
import { PatientService } from '../../../core/services/patient';
import { NouvelleFicheConsultationPayload } from '../../../models/fiche-consultation.model';

@Component({
  selector: 'app-nouvelle-fiche-consultation',
  standalone: true,
  imports: [ReactiveFormsModule],
  templateUrl: './nouvelle-fiche-consultation.html',
  styleUrl: './nouvelle-fiche-consultation.css'
})
export class NouvelleFicheConsultation implements OnInit {

  private readonly auth = inject(Auth);
  private readonly patientService = inject(PatientService);
  private readonly priseEnChargeService = inject(PriseEnChargeService);

  patientId = '';

  patientNom = 'Jean Dupont';

  patientRef = '9482-A';

  form: FormGroup;

  /*
   * Signaux, pas de simples propriétés : ce projet tourne sans zone.js
   * (aucune dépendance zone.js, pas de provideZonelessChangeDetection()
   * explicite non plus). Une propriété simple modifiée depuis un callback
   * subscribe() ne redéclenche pas le rendu ici (constaté en testant en
   * direct). Même pattern que historique-rdv.ts/mes-rendez-vous.ts.
   */
  readonly enSoumission = signal(false);

  /* =====================================================
     RÉSOLUTION DU PATIENT → DossierVisuel
     ---------------------------------------------------
     2026-09-01 : dossierVisuelId était un placeholder (= patientId),
     documenté comme tel. Corrigé — vrai lookup via PatientService
     avant d'ouvrir la prise en charge. Voir
     JOURNAL-MODIFICATIONS-PARTAGEES.md.
  ===================================================== */

  dossierVisuelId = '';

  readonly chargementPatient = signal(false);

  readonly erreurPatient = signal(false);

  /* =====================================================
     PRISE EN CHARGE
     ---------------------------------------------------
     Ouverte automatiquement une fois le patient résolu — c'est elle
     qui, une fois terminée, verrouille définitivement la fiche (§5 du
     cahier des charges). Voir JOURNAL-MODIFICATIONS-PARTAGEES.md pour
     le détail du flux et ce qui reste symbolique côté verrouillage.
  ===================================================== */

  cabinetId = '';

  opticienId = '';

  readonly priseEnChargeId = signal('');

  readonly priseEnChargeStatut = signal<'initiee' | 'enCours' | 'terminee' | null>(null);

  readonly enClotureConsultation = signal(false);

  readonly erreurPriseEnCharge = signal(false);

  readonly erreurEnregistrement = signal(false);

  /**
   * true tant que la prise en charge n'est pas terminée. Redevient false
   * dès que terminerConsultation() aboutit — la fiche passe alors en
   * lecture seule (voir verrouillerFormulaire()).
   *
   * ⚠️ Ce verrouillage est UNIQUEMENT côté interface (désactivation du
   * FormGroup). Rien n'empêche aujourd'hui un appel direct à l'API de
   * modifier la fiche malgré tout — voir le journal des modifications
   * partagées pour le détail de ce qui manque côté back pour que ce soit
   * une vraie garantie.
   */
  readonly modifiable = computed(() => this.priseEnChargeStatut() !== 'terminee');

  constructor(
    private fb: FormBuilder,
    private route: ActivatedRoute,
    private router: Router,
    private ficheConsultationService: FicheConsultationService
  ) {
    this.form = this.fb.group({

      symptomes: this.fb.group({
        baisseVisionLoin: [false],
        baisseVisionPres: [false],
        diplopie: [false],
        cephalees: [false],
        larmoiement: [false],
        demangeaisons: [false]
      }),

      autresPlaintes: [''],

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

      observations: [
        '',
        Validators.required
      ]

    });
  }

  ngOnInit(): void {

    const idFromQuery =
      this.route.snapshot.queryParamMap.get('patientId');

    if (idFromQuery) {
      this.patientId = idFromQuery;
    }

    this.opticienId = this.auth.utilisateur()?.id ?? '';
    this.cabinetId = this.auth.utilisateur()?.cabinetId ?? '';

    this.resoudrePatient();

  }

  /**
   * Résout dossierVisuelId depuis patientId via PatientService, AVANT
   * d'ouvrir la prise en charge — remplace l'ancien placeholder
   * (dossierVisuelId = patientId). Gère le chargement et l'échec
   * (patient introuvable ou appel en erreur) : dans les deux cas, la
   * prise en charge n'est PAS ouverte, et les boutons Enregistrer/
   * Terminer restent désactivés (voir le template) tant que
   * dossierVisuelId n'est pas résolu.
   */
  private resoudrePatient(): void {

    if (!this.patientId) {
      return;
    }

    this.chargementPatient.set(true);

    this.patientService.getPatientById(this.patientId).subscribe({

      next: (patient) => {
        this.dossierVisuelId = patient.dossierVisuelId;
        this.chargementPatient.set(false);
        this.demarrerPriseEnCharge();
      },

      error: () => {
        // Patient introuvable, ou route non confirmée (GET /patients/{id}
        // n'apparaît pas au §8 — voir POINTS-A-CONFIRMER-BACKEND.md).
        this.chargementPatient.set(false);
        this.erreurPatient.set(true);
      }

    });
  }

  /**
   * Ouvre la prise en charge (point 1 du flux) — avant même que
   * l'opticien ait rempli quoi que ce soit, puisque c'est cet acte-là
   * (« je commence à m'occuper de ce patient ») que PriseEnCharge est
   * censée représenter, pas la sauvegarde de la fiche elle-même.
   * N'est appelée qu'une fois dossierVisuelId résolu (voir resoudrePatient()).
   */
  private demarrerPriseEnCharge(): void {

    this.priseEnChargeService.creer({
      dossierVisuelId: this.dossierVisuelId,
      cabinetId: this.cabinetId,
      type: 'consultation',
      statut: 'initiee',
      opticienResponsableId: this.opticienId,
      dateDebut: new Date()
    }).subscribe({

      next: (priseEnCharge) => {
        this.priseEnChargeId.set(priseEnCharge.id);
        this.priseEnChargeStatut.set(priseEnCharge.statut);
      },

      error: () => {
        // GET/PATCH confirmés au §8 ; POST /prise-en-charge l'est aussi
        // (corrigé le 2026-09-01, appelait /prises-en-charge au pluriel
        // par erreur) — une erreur ici est donc un vrai échec réseau/serveur,
        // pas juste une route non confirmée. On n'empêche pas l'opticien de
        // remplir la fiche pour autant, mais enregistrer()/terminerConsultation()
        // restent bloqués tant que priseEnChargeId est vide (voir le template).
        this.erreurPriseEnCharge.set(true);
      }

    });
  }

  annuler(): void {

    if (this.patientId) {

      this.router.navigate([
        '/opticien/patients',
        this.patientId,
        'dossier-visuel'
      ]);

      return;
    }

    this.router.navigate(['/opticien']);
  }

  enregistrer(): void {

    if (!this.modifiable()) {
      return;
    }

    if (!this.priseEnChargeId()) {
      // Vrai manque frontend à ne pas laisser passer silencieusement :
      // sans prise en charge valide, la fiche n'a pas de référence à
      // laquelle se rattacher (§5). On bloque plutôt que d'envoyer un
      // priseEnChargeId vide.
      this.erreurPriseEnCharge.set(true);
      return;
    }

    if (this.form.invalid) {

      this.form.markAllAsTouched();

      return;
    }

    this.enSoumission.set(true);

    const valeurs = this.form.getRawValue();

    const payload: NouvelleFicheConsultationPayload = {

      patientId: this.patientId,

      dossierVisuelId: this.dossierVisuelId,

      priseEnChargeId: this.priseEnChargeId(),

      cabinetId: this.cabinetId,

      opticienId: this.opticienId,

      symptomes: valeurs.symptomes,

      autresPlaintes: valeurs.autresPlaintes,

      prescriptionOD: valeurs.od,

      prescriptionOG: valeurs.og,

      observations: valeurs.observations

    };

    this.ficheConsultationService.creer(payload).subscribe({

      next: () => {

        this.enSoumission.set(false);

        this.router.navigate([
          '/opticien/patients',
          this.patientId,
          'dossier-visuel'
        ]);
      },

      error: () => {
        this.enSoumission.set(false);
        this.erreurEnregistrement.set(true);
      }

    });
  }

  /**
   * Bouton distinct de enregistrer() (point 3 du flux demandé) : termine
   * réellement la prise en charge plutôt que juste sauvegarder la fiche.
   * C'est cette transition — statut 'terminee' — que le §5 désigne comme
   * déclencheur du verrouillage définitif de FicheConsultation.modifiable.
   */
  terminerConsultation(): void {

    if (!this.priseEnChargeId()) {
      this.erreurPriseEnCharge.set(true);
      return;
    }

    this.enClotureConsultation.set(true);

    this.priseEnChargeService.mettreAJourStatut(
      this.priseEnChargeId(),
      'terminee'
    ).subscribe({

      next: (priseEnCharge) => {

        this.priseEnChargeStatut.set(priseEnCharge.statut);
        this.enClotureConsultation.set(false);
        this.verrouillerFormulaire();
      },

      error: () => {
        this.enClotureConsultation.set(false);
        this.erreurPriseEnCharge.set(true);
      }

    });
  }

  /**
   * Point 4 du flux demandé : passe le formulaire en lecture seule une
   * fois modifiable === false. form.disable() désactive nativement tous
   * les FormControl (inputs, checkboxes, textarea) — c'est la seule
   * partie de ce verrouillage qui a un effet réel ; voir le commentaire
   * sur `modifiable` plus haut pour ce qui n'est PAS garanti.
   */
  private verrouillerFormulaire(): void {
    this.form.disable();
  }
}
