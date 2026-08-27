import { Component, HostListener, signal } from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';

@Component({
  selector: 'app-patient-layout',
  standalone: true,

  imports: [
    RouterLink,
    RouterLinkActive,
    RouterOutlet
  ],

  templateUrl: './patient-layout.html',
  styleUrl: './patient-layout.css'
})
export class PatientLayout {

  /**
   * Menu responsive
   */
  readonly menuOuvert = signal(false);

  /**
   * Menu de changement d'espace
   */
  readonly espacesOuverts = signal(false);


  /**
   * Ouvre / ferme le sidebar sur mobile
   */
  toggleMenu(): void {

    this.menuOuvert.update(
      ouvert => !ouvert
    );

  }


  /**
   * Ferme le sidebar
   */
  fermerMenu(): void {

    this.menuOuvert.set(false);

  }


  /**
   * Ouvre / ferme le sélecteur d'espace
   */
  toggleEspaces(): void {

    this.espacesOuverts.update(
      ouvert => !ouvert
    );

  }


  /**
   * Sélection d'un espace
   */
  selectionnerEspace(
    espace: 'patient' | 'secretaire'
  ): void {

    this.espacesOuverts.set(false);

    this.menuOuvert.set(false);

  }


  /**
   * Fermer les menus avec Escape
   */
  @HostListener('document:keydown.escape')
  fermerMenusAvecEscape(): void {

    this.menuOuvert.set(false);
    this.espacesOuverts.set(false);

  }



  @HostListener('window:resize')
  gererRedimensionnement(): void {

    if (window.innerWidth > 900) {

      this.menuOuvert.set(false);

    }

  }

}