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

/**
 * Bornes « raisonnables » sur la date de naissance (04/09) : pas de date
 * future, pas d'âge irréaliste au-delà de 120 ans. Volontairement pas de
 * borne d'âge minimum — aucune règle de consentement/âge minimum n'est
 * spécifiée dans le cahier des charges, ce serait inventer une décision
 * produit plutôt qu'une simple borne UX.
 */
function dateNaissanceValideValidator(control: AbstractControl): ValidationErrors | null {
  const valeur = control.value;
  if (!valeur) {
    return null; // Validators.required s'en charge déjà
  }

  const date = new Date(valeur);
  const aujourdHui = new Date();
  const ilYa120Ans = new Date();
  ilYa120Ans.setFullYear(aujourdHui.getFullYear() - 120);

  if (date > aujourdHui) {
    return { dateNaissanceFuture: true };
  }

  if (date < ilYa120Ans) {
    return { dateNaissanceInvraisemblable: true };
  }

  return null;
}

@Component({
  selector: 'app-inscription-patient',
  imports: [ReactiveFormsModule, RouterLink],
  templateUrl: './inscription-patient.html',
  styleUrl: './inscription-patient.css',
})
export class InscriptionPatient {
  private readonly fb = inject(FormBuilder);
  private readonly auth = inject(Auth);
  private readonly router = inject(Router);

  readonly chargement = signal(false);
  readonly erreur = signal<string | null>(null);
  readonly afficherMotDePasse = signal(false);
  readonly afficherConfirmation = signal(false);

  /**
   * Bornes du champ « Date de naissance » (04/09) : pas de date future
   * (dateMax), pas d'âge irréaliste au-delà de 120 ans (dateMin). Pas de
   * borne d'âge minimum imposée délibérément — aucune règle de
   * consentement/âge minimum n'est spécifiée dans le cahier des charges,
   * ce serait inventer une décision produit plutôt qu'une simple borne
   * UX. Format ISO 'YYYY-MM-DD', celui attendu par <input type="date">.
   */
  readonly dateNaissanceMax = new Date().toISOString().slice(0, 10);
  readonly dateNaissanceMin = (() => {
    const date = new Date();
    date.setFullYear(date.getFullYear() - 120);
    return date.toISOString().slice(0, 10);
  })();

  readonly form = this.fb.nonNullable.group(
    {
      prenom: ['', [Validators.required]],
      nom: ['', [Validators.required]],
      telephone: ['', [Validators.required]],
      ville: ['', [Validators.required]],
      email: ['', [Validators.required, Validators.email]],
      dateNaissance: ['', [Validators.required, dateNaissanceValideValidator]],
      motDePasse: ['', [Validators.required, Validators.minLength(8)]],
      confirmationMotDePasse: ['', [Validators.required]],
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
      .registerPatient({
        nom: valeurs.nom,
        prenom: valeurs.prenom,
        telephone: valeurs.telephone,
        ville: valeurs.ville,
        email: valeurs.email,
        date_naissance: valeurs.dateNaissance,
        password: valeurs.motDePasse,
        password_confirmation: valeurs.confirmationMotDePasse,
      })
      .subscribe({
        next: () => {
          this.chargement.set(false);
          this.router.navigateByUrl('/patient/completer-dossier-visuel');
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
