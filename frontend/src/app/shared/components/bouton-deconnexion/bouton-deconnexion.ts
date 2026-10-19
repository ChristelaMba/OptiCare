import { Component, inject, input } from '@angular/core';
import { Router } from '@angular/router';

import { Auth } from '../../../core/services/auth';

/**
 * Bouton « Se déconnecter » partagé par tous les layouts et en-têtes : `Auth.logout()` (efface token
 * et utilisateur, en mémoire et dans le stockage) puis redirection vers `/auth/connexion`.
 * Le contenu (icône + libellé) et les classes sont fournis par l'appelant pour garder le style de
 * chaque écran ; sans contenu, le libellé par défaut est « Se déconnecter ».
 */
@Component({
  selector: 'app-bouton-deconnexion',
  template: `
    <button type="button" [class]="classe()" (click)="deconnecter()">
      <ng-content>Se déconnecter</ng-content>
    </button>
  `,
  host: { style: 'display: contents' },
})
export class BoutonDeconnexion {
  private readonly auth = inject(Auth);
  private readonly router = inject(Router);

  readonly classe = input('');

  deconnecter(): void {
    this.auth.logout();
    this.router.navigateByUrl('/auth/connexion');
  }
}
