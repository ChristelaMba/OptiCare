import { Component, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import {
  AbstractControl,
  FormBuilder,
  ReactiveFormsModule,
  ValidationErrors,
  Validators,
} from '@angular/forms';
import { HttpErrorResponse } from '@angular/common/http';

import { Auth } from '../../../core/services/auth';
import { messageErreurInscription } from '../../../core/utils/api-errors';
import { LogoOpticare } from '../../../shared/components/logo-opticare/logo-opticare';

function motsDePasseIdentiquesValidator(groupe: AbstractControl): ValidationErrors | null {
  const motDePasse = groupe.get('motDePasse')?.value;
  const confirmation = groupe.get('confirmationMotDePasse')?.value;
  return motDePasse === confirmation ? null : { motsDePasseDifferents: true };
}

@Component({
  selector: 'app-inscription-cabinet',
  imports: [LogoOpticare, ReactiveFormsModule, RouterLink],
  templateUrl: './inscription-cabinet.html',
  styleUrl: './inscription-cabinet.css',
})
export class InscriptionCabinet {
  /** true après une inscription réussie : le cabinet attend la validation d'un administrateur. */
  readonly enAttenteDeValidation = signal(false);
  private readonly fb = inject(FormBuilder);
  private readonly auth = inject(Auth);

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
      // Facultatif (ROUTES-API-LIONEL §1.2) : si saisi, le format reste validé ; envoyé seulement s'il est renseigné.
      email: ['', [Validators.email]],
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
        ...(valeurs.email.trim() ? { email: valeurs.email.trim() } : {}),
        password: valeurs.motDePasse,
        password_confirmation: valeurs.confirmationMotDePasse,
        cabinet_nom: valeurs.cabinetNom,
        cabinet_adresse: valeurs.cabinetAdresse,
        cabinet_telephone: valeurs.cabinetTelephone,
        cabinet_ville: valeurs.cabinetVille,
        cabinet_email: valeurs.cabinetEmail,
      })
      .subscribe({
        // Pas de session ouverte (le serveur ne renvoie plus de token) : on affiche l'état « en attente de
        // validation » avec un lien vers la connexion, au lieu de rediriger vers /proprietaire/….
        next: () => {
          this.chargement.set(false);
          this.enAttenteDeValidation.set(true);
        },
        error: (erreur: HttpErrorResponse) => {
          this.chargement.set(false);
          this.erreur.set(messageErreurInscription(erreur));
        },
      });
  }
}
