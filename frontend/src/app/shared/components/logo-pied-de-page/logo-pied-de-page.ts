import { Component } from '@angular/core';

/**
 * Logo OptiCare pour les pieds de page sombres (fond bleu nuit). Le logo est bleu : posé directement sur
 * le fond il est illisible, il est donc placé sur une pastille blanche, avec ses proportions d'origine
 * (840×210) déclarées pour éviter toute déformation. Partagé par l'accueil, la recherche et la page cabinet.
 */
@Component({
  selector: 'app-logo-pied-de-page',
  template: `
    <span class="inline-flex w-fit bg-white rounded-lg px-space-3 py-space-2">
      <img src="/images/logo-opticare.png" alt="OptiCare" width="840" height="210" class="h-8 w-auto object-contain" />
    </span>
  `,
  host: { class: 'inline-flex w-fit' },
})
export class LogoPiedDePage {}
