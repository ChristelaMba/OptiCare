import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  FormBuilder,
  ReactiveFormsModule,
  Validators
} from '@angular/forms';
import { Router, RouterLink } from '@angular/router';

import { PatientService } from '../../../core/services/patient';

@Component({
  selector: 'app-enregistrement-patient',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    RouterLink
  ],
  templateUrl: './enregistrement-patient.html',
  styleUrl: './enregistrement-patient.css'
})
export class EnregistrementPatient {

  private readonly fb = inject(FormBuilder);
  private readonly patientService = inject(PatientService);
  private readonly router = inject(Router);

  readonly isSubmitting = signal(false);
  readonly successMessage = signal('');
  readonly errorMessage = signal('');

  readonly patientForm = this.fb.nonNullable.group({

    nom: [
      '',
      [
        Validators.required,
        Validators.minLength(2)
      ]
    ],

    prenom: [
      '',
      [
        Validators.required,
        Validators.minLength(2)
      ]
    ],

    dateNaissance: [
      '',
      Validators.required
    ],

    sexe: [
      'M' as 'M' | 'F',
      Validators.required
    ],

    telephone: [
      '',
      [
        Validators.required,
        Validators.pattern(/^[0-9]{9}$/)
      ]
    ],

    whatsapp: [
      ''
    ],

    profession: [
      ''
    ],

    quartier: [
      ''
    ],

    nombreEnfants: [
      0,
      [
        Validators.min(0)
      ]
    ]

  });

  get f() {
    return this.patientForm.controls;
  }

  submit(): void {

    this.successMessage.set('');
    this.errorMessage.set('');

    if (this.patientForm.invalid) {

      this.patientForm.markAllAsTouched();

      this.errorMessage.set(
        'Veuillez vérifier les informations obligatoires.'
      );

      return;
    }

    this.isSubmitting.set(true);

    const formValue = this.patientForm.getRawValue();

   const patient = {
  nom: formValue.nom.trim(),
  prenom: formValue.prenom.trim(),
  dateNaissance: formValue.dateNaissance,
  age: this.calculateAge(formValue.dateNaissance),
  sexe: formValue.sexe,
  telephone: `+237${formValue.telephone}`,
  whatsapp: formValue.whatsapp
    ? `+237${formValue.whatsapp}`
    : undefined,
  profession: formValue.profession.trim() || undefined,
  quartier: formValue.quartier.trim() || undefined,
  nombreEnfants: formValue.nombreEnfants,
  estUtilisateur: false,
  dossierVisuelId: ''
};

    this.patientService.createPatient(patient).subscribe({

      next: (createdPatient) => {

        this.isSubmitting.set(false);

        this.successMessage.set(
          'Le dossier du patient a été créé avec succès.'
        );

        setTimeout(() => {

          this.router.navigate([
            '/secretaire',
            'agenda'
          ]);

        }, 1200);
      },

      error: (error) => {

        console.error(
          'Erreur lors de la création du patient :',
          error
        );

        this.isSubmitting.set(false);

        this.errorMessage.set(
          'Impossible de créer le dossier pour le moment. Veuillez réessayer.'
        );
      }

    });
  }

  resetForm(): void {

    this.patientForm.reset({
      nom: '',
      prenom: '',
      dateNaissance: '',
      sexe: 'M',
      telephone: '',
      whatsapp: '',
      profession: '',
      quartier: '',
      nombreEnfants: 0
    });

    this.successMessage.set('');
    this.errorMessage.set('');
  }

  private calculateAge(dateNaissance: string): number {

    const birthDate = new Date(dateNaissance);
    const today = new Date();

    let age =
      today.getFullYear() -
      birthDate.getFullYear();

    const monthDifference =
      today.getMonth() -
      birthDate.getMonth();

    if (
      monthDifference < 0 ||
      (
        monthDifference === 0 &&
        today.getDate() < birthDate.getDate()
      )
    ) {
      age--;
    }

    return age;
  }

}