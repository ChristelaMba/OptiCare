import { Component, computed, inject } from '@angular/core';
import { RouterLink } from '@angular/router';

import { Auth } from '../../../core/services/auth';
import { BoutonDeconnexion } from '../../../shared/components/bouton-deconnexion/bouton-deconnexion';

/**
 * Zone de droite de l'en-tête des pages publiques (accueil, recherche, page d'un cabinet) :
 * « Connexion / Inscription » pour un visiteur, nom + lien vers son espace pour un utilisateur connecté.
 */
@Component({
  selector: 'app-actions-session',
  imports: [RouterLink, BoutonDeconnexion],
  template: `
    @if (utilisateur(); as u) {
      <a
        [routerLink]="espace()"
        class="inline-flex shrink-0 items-center gap-space-2 font-button text-button text-primary hover:bg-surface-container-high px-space-1 sm:px-space-3 py-space-1 rounded-full transition-colors"
        [attr.aria-label]="'Aller à mon espace, connecté en tant que ' + nomComplet()"
      >
        <span class="w-8 h-8 shrink-0 rounded-full bg-primary text-on-primary flex items-center justify-center text-label-sm font-bold">{{ initiales() }}</span>
        <span class="hidden sm:inline">{{ nomComplet() }}</span>
        <span class="hidden md:inline text-on-surface-variant font-body text-label-sm">· Mon espace</span>
      </a>
      <app-bouton-deconnexion
        classe="inline-flex items-center whitespace-nowrap font-button text-button text-on-surface-variant hover:text-error hover:bg-surface-container-high px-space-2 sm:px-space-3 py-space-1 rounded-full transition-colors"
      >
        <span class="material-symbols-outlined sm:hidden" aria-hidden="true">logout</span>
        <span class="hidden sm:inline">Se déconnecter</span>
      </app-bouton-deconnexion>
    } @else {
      <a
        routerLink="/auth/connexion"
        class="font-button text-button text-primary hover:bg-surface-container-high px-space-4 py-space-2 rounded-full transition-colors"
      >
        Connexion
      </a>
      <a
        routerLink="/auth/inscription"
        class="font-button text-button bg-primary text-on-primary hover:bg-on-primary-fixed-variant px-space-6 py-space-2 rounded-full transition-colors shadow-sm hover:shadow-md"
      >
        Inscription
      </a>
    }
  `,
  host: { class: 'flex shrink-0 items-center gap-space-1 sm:gap-space-3' },
})
export class ActionsSession {
  private readonly auth = inject(Auth);

  readonly utilisateur = computed(() => (this.auth.estConnecte() ? this.auth.utilisateur() : null));

  readonly nomComplet = computed(() => {
    const u = this.utilisateur();
    return u ? `${u.prenom} ${u.nom}`.trim() : '';
  });

  readonly initiales = computed(() => {
    const u = this.utilisateur();
    return u ? `${u.prenom.charAt(0)}${u.nom.charAt(0)}`.toUpperCase() : '';
  });

  /** Espace du rôle (patient → /patient, proprietaire → /proprietaire…). */
  readonly espace = computed(() => {
    const u = this.utilisateur();
    return u ? this.auth.routeParDefaut(u.role) : '/';
  });
}
