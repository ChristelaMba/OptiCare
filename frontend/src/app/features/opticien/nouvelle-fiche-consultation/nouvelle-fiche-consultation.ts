import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import {
  FormBuilder,
  FormGroup,
  ReactiveFormsModule,
  Validators
} from '@angular/forms';

import { FicheConsultationService } from '../../../core/services/fiche-consultation';
import { NouvelleFicheConsultationPayload } from '../../../models/fiche-consultation.model';

@Component({
  selector: 'app-nouvelle-fiche-consultation',
  standalone: true,
  imports: [ReactiveFormsModule],
  templateUrl: './nouvelle-fiche-consultation.html',
  styleUrl: './nouvelle-fiche-consultation.css'
})
export class NouvelleFicheConsultation implements OnInit {

  patientId = '';

  patientNom = 'Jean Dupont';

  patientRef = '9482-A';

  enSoumission = false;

  form: FormGroup;

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

    if (this.form.invalid) {

      this.form.markAllAsTouched();

      return;
    }

    this.enSoumission = true;

    const valeurs = this.form.getRawValue();

    const payload: NouvelleFicheConsultationPayload = {

      patientId: this.patientId,

      symptomes: valeurs.symptomes,

      autresPlaintes: valeurs.autresPlaintes,

      prescriptionOD: valeurs.od,

      prescriptionOG: valeurs.og,

      observations: valeurs.observations

    };

    console.log(
      'Fiche à enregistrer :',
      payload
    );

    setTimeout(() => {

      this.enSoumission = false;

      this.router.navigate([
        '/opticien/patients',
        this.patientId,
        'dossier-visuel'
      ]);

    }, 600);
  }
}