import { Component, inject, signal } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { HttpErrorResponse } from '@angular/common/http';

import { Auth } from '../../../core/services/auth';

@Component({
  selector: 'app-connexion',
  imports: [ReactiveFormsModule, RouterLink],
  templateUrl: './connexion.html',
  styleUrl: './connexion.css',
})
export class Connexion {
  private readonly fb = inject(FormBuilder);
  private readonly auth = inject(Auth);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);

  readonly chargement = signal(false);
  readonly erreur = signal<string | null>(null);
  readonly afficherMotDePasse = signal(false);

  readonly form = this.fb.nonNullable.group({
    identifiant: ['', [Validators.required]],
    motDePasse: ['', [Validators.required]],
    seSouvenir: [true],
  });

  basculerAffichageMotDePasse(): void {
    this.afficherMotDePasse.update((valeur) => !valeur);
  }

  onSubmit(): void {
    if (this.form.invalid || this.chargement()) {
      this.form.markAllAsTouched();
      return;
    }

    const valeurs = this.form.getRawValue();
    this.erreur.set(null);
    this.chargement.set(true);

    // ADAPTATION TEMPORAIRE (04/09) : le champ écran garde son libellé
    // "Email ou téléphone" (identifiant) — c'est l'envoi au serveur qui est
    // restreint au téléphone, pas la saisie utilisatrice. Voir le
    // commentaire sur ConnexionPayload (auth.model.ts) pour le détail et le
    // TODO de retour à identifiant une fois le back mis à jour.
    this.auth
      .login(
        {
          telephone: valeurs.identifiant,
          password: valeurs.motDePasse,
        },
        valeurs.seSouvenir,
      )
      .subscribe({
        next: (reponse) => {
          this.chargement.set(false);
          const returnUrl = this.route.snapshot.queryParamMap.get('returnUrl');
          this.router.navigateByUrl(returnUrl ?? this.auth.routeParDefaut(reponse.utilisateur.role));
        },
        error: (erreur: HttpErrorResponse) => {
          this.chargement.set(false);
          this.erreur.set(
            erreur.status === 401
              ? 'Identifiant ou mot de passe incorrect.'
              : 'Une erreur est survenue lors de la connexion. Réessayez.',
          );
        },
      });
  }
}
