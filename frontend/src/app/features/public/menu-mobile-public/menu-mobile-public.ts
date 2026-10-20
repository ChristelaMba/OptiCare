import { Component, HostListener, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';

import { Auth } from '../../../core/services/auth';
import { BoutonDeconnexion } from '../../../shared/components/bouton-deconnexion/bouton-deconnexion';

/**
 * Menu compact (bouton burger) de l'en-tete des pages publiques en dessous de md (768 px) : remplace
 * `app-actions-session`, trop large a cote du logo et du bouton retour (le logo etait recouvert par
 * « Connexion » / « Inscription » entre 390 et 320 px). Meme principe que le menu de l'accueil :
 * Connexion / Inscription pour un visiteur, espace + deconnexion pour un utilisateur connecte.
 * Le panneau se place sous l'en-tete (position absolue dans la barre de navigation) ; Echap ou un clic sur un lien le ferme.
 */
@Component({
  selector: 'app-menu-mobile-public',
  imports: [RouterLink, BoutonDeconnexion],
  template: `
    <button
      type="button"
      class="inline-flex items-center justify-center w-11 h-11 rounded-full text-primary hover:bg-surface-container-high focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
      aria-controls="menu-mobile-public"
      [attr.aria-expanded]="ouvert()"
      [attr.aria-label]="ouvert() ? 'Fermer le menu' : 'Ouvrir le menu'"
      (click)="basculer()"
    >
      <span class="material-symbols-outlined" aria-hidden="true">{{ ouvert() ? 'close' : 'menu' }}</span>
    </button>

    @if (ouvert()) {
      <div
        id="menu-mobile-public"
        class="absolute left-0 right-0 top-full border-t border-border-subtle bg-surface-bg px-margin-mobile py-space-4 shadow-md"
      >
        <ul class="flex flex-col gap-space-1 list-none m-0 p-0">
          @if (utilisateur(); as u) {
            <li>
              <a
                [routerLink]="espace()"
                (click)="fermer()"
                class="block px-space-3 py-space-3 rounded-lg font-body text-body-base text-primary font-bold hover:bg-surface-container-high focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
              >
                Mon espace ({{ u.prenom }})
              </a>
            </li>
            <li>
              <app-bouton-deconnexion
                classe="w-full text-left px-space-3 py-space-3 rounded-lg font-body text-body-base text-error hover:bg-surface-container-high focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
              >
                Se déconnecter
              </app-bouton-deconnexion>
            </li>
          } @else {
            <li>
              <a
                routerLink="/auth/connexion"
                (click)="fermer()"
                class="block px-space-3 py-space-3 rounded-lg font-body text-body-base text-primary font-bold hover:bg-surface-container-high focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
              >
                Connexion
              </a>
            </li>
            <li>
              <a
                routerLink="/auth/inscription"
                (click)="fermer()"
                class="block px-space-3 py-space-3 rounded-lg font-body text-body-base bg-primary text-on-primary text-center hover:bg-on-primary-fixed-variant focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
              >
                Inscription
              </a>
            </li>
          }
        </ul>
      </div>
    }
  `,
  host: { class: 'md:hidden shrink-0' },
})
export class MenuMobilePublic {
  private readonly auth = inject(Auth);

  readonly ouvert = signal(false);

  readonly utilisateur = computed(() => (this.auth.estConnecte() ? this.auth.utilisateur() : null));

  readonly espace = computed(() => {
    const u = this.utilisateur();
    return u ? this.auth.routeParDefaut(u.role) : '/';
  });

  basculer(): void {
    this.ouvert.update((valeur) => !valeur);
  }

  fermer(): void {
    this.ouvert.set(false);
  }

  @HostListener('document:keydown.escape')
  fermerAvecEchap(): void {
    this.ouvert.set(false);
  }
}
