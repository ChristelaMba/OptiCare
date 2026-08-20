import { Component, inject, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import {
  AbstractControl,
  FormBuilder,
  ReactiveFormsModule,
  ValidationErrors,
  Validators,
} from '@angular/forms';
import { HttpErrorResponse } from '@angular/common/http';

import { Auth } from '../../../core/services/auth';

function motsDePasseIdentiquesValidator(groupe: AbstractControl): ValidationErrors | null {
  const motDePasse = groupe.get('motDePasse')?.value;
  const confirmation = groupe.get('confirmationMotDePasse')?.value;
  return motDePasse === confirmation ? null : { motsDePasseDifferents: true };
}

@Component({
  selector: 'app-inscription-cabinet',
  imports: [ReactiveFormsModule, RouterLink],
  templateUrl: './inscription-cabinet.html',
  styleUrl: './inscription-cabinet.css',
})
export class InscriptionCabinet {
  private readonly fb = inject(FormBuilder);
  private readonly auth = inject(Auth);
  private readonly router = inject(Router);

  readonly chargement = signal(false);
  readonly erreur = signal<string | null>(null);
  readonly afficherMotDePasse = signal(false);
  readonly afficherConfirmation = signal(false);

  readonly form = this.fb.nonNullable.group(
    {
      // Compte personnel du propriétaire
      prenom: ['', [Validators.required]],
      nom: ['', [Validators.required]],
      telephone: ['', [Validators.required]],
      ville: ['', [Validators.required]],
      email: ['', [Validators.required, Validators.email]],
      motDePasse: ['', [Validators.required, Validators.minLength(8)]],
      confirmationMotDePasse: ['', [Validators.required]],
      // Informations du cabinet
      cabinetNom: ['', [Validators.required]],
      cabinetAdresse: ['', [Validators.required]],
      cabinetTelephone: ['', [Validators.required]],
      cabinetVille: ['', [Validators.required]],
      cabinetEmail: ['', [Validators.required, Validators.email]],
    },
    { validators: motsDePasseIdentiquesValidator },
  );

  basculerAffichageMotDePasse(): void {
    this.afficherMotDePasse.update((valeur) => !valeur);
  }

  basculerAffichageConfirmation(): void {
    this.afficherConfirmation.update((valeur) => !valeur);
  }

  onSubmit(): void {
    if (this.form.invalid || this.chargement()) {
      this.form.markAllAsTouched();
      return;
    }

    const valeurs = this.form.getRawValue();
    this.erreur.set(null);
    this.chargement.set(true);

    this.auth
      .registerCabinet({
        nom: valeurs.nom,
        prenom: valeurs.prenom,
        telephone: valeurs.telephone,
        ville: valeurs.ville,
        email: valeurs.email,
        password: valeurs.motDePasse,
        password_confirmation: valeurs.confirmationMotDePasse,
        cabinet_nom: valeurs.cabinetNom,
        cabinet_adresse: valeurs.cabinetAdresse,
        cabinet_telephone: valeurs.cabinetTelephone,
        cabinet_ville: valeurs.cabinetVille,
        cabinet_email: valeurs.cabinetEmail,
      })
      .subscribe({
        next: () => {
          this.chargement.set(false);
          this.router.navigateByUrl('/proprietaire/completer-profil-cabinet');
        },
        error: (erreur: HttpErrorResponse) => {
          this.chargement.set(false);
          this.erreur.set(
            erreur.status === 409
              ? 'Cet email est déjà utilisé. Essayez de vous connecter.'
              : "Une erreur est survenue lors de la création du compte. Réessayez.",
          );
        },
      });
  }
}
