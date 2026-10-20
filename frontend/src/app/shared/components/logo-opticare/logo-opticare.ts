import { Component, input } from '@angular/core';

/**
 * Logo OptiCare (oeil avec croix + mot « OptiCare »), source unique de l'application : un seul fichier image,
 * /images/logo-opticare.png, dont les proportions d'origine (840x210) sont declarees pour eviter toute deformation.
 * Le logo contient deja le mot « OptiCare » : ne pas ajouter le texte a cote. `hauteur` est exprimee en pixels.
 */
@Component({
  selector: 'app-logo-opticare',
  template: `
    <img
      src="/images/logo-opticare.png"
      alt="OptiCare"
      width="840"
      height="210"
      class="w-auto object-contain"
      [style.height.px]="hauteur()"
    />
  `,
  host: { class: 'flex w-fit shrink-0' },
})
export class LogoOpticare {
  /** Hauteur du logo en pixels (la largeur suit les proportions). */
  readonly hauteur = input(32);
}
