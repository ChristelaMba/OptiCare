import { Component } from '@angular/core';

import { LogoOpticare } from '../logo-opticare/logo-opticare';

/**
 * Logo OptiCare pour les pieds de page sombres (fond bleu nuit). Le logo est bleu : posé directement sur
 * le fond il est illisible, il est donc placé sur une pastille blanche, avec ses proportions d'origine
 * (840×210) déclarées pour éviter toute déformation. Partagé par l'accueil, la recherche et la page cabinet.
 */
@Component({
  selector: 'app-logo-pied-de-page',
  imports: [LogoOpticare],
  template: `
    <span class="inline-flex w-fit bg-white rounded-lg px-space-3 py-space-2">
      <app-logo-opticare [hauteur]="32" />
    </span>
  `,
  host: { class: 'inline-flex w-fit' },
})
export class LogoPiedDePage {}
