import { Component, computed, inject, signal } from '@angular/core';
import {
  RouterLink,
  RouterOutlet,
  RouterLinkActive
} from '@angular/router';

import { Auth } from '../../../core/services/auth';
import { BoutonDeconnexion } from '../../../shared/components/bouton-deconnexion/bouton-deconnexion';

@Component({
  selector: 'app-patient-layout',
  standalone: true,
  imports: [
    RouterLink,
    RouterOutlet,
    RouterLinkActive,
    BoutonDeconnexion
  ],
  templateUrl: './patient-layout.html',
  styleUrl: './patient-layout.css'
})
export class PatientLayout {

  private readonly auth = inject(Auth);

  /** Identité de la session (plus de nom codé en dur). */
  readonly nomComplet = computed(() => {
    const utilisateur = this.auth.utilisateur();
    return utilisateur ? `${utilisateur.prenom} ${utilisateur.nom}`.trim() : '';
  });

  readonly initiales = computed(() => {
    const utilisateur = this.auth.utilisateur();
    if (!utilisateur) {
      return '';
    }
    return `${utilisateur.prenom.charAt(0)}${utilisateur.nom.charAt(0)}`.toUpperCase();
  });

  readonly menuOuvert = signal(false);
  readonly menuProfilOuvert = signal(false);
  readonly espacesOuverts = signal(false);
  readonly modeSombre = signal(false);

  constructor() {
    const theme = localStorage.getItem('opticare-theme');

    if (theme === 'dark') {
      this.modeSombre.set(true);
    }
  }

  toggleMenuProfil(): void {
    this.menuProfilOuvert.update(value => !value);
  }

  toggleMenu(): void {
    this.menuOuvert.update(value => !value);
  }

  fermerMenu(): void {
    this.menuOuvert.set(false);
    this.espacesOuverts.set(false);
  }

  toggleEspaces(): void {
    this.espacesOuverts.update(value => !value);
  }

  selectionnerEspace(
    espace: 'patient' | 'secretaire'
  ): void {

    this.espacesOuverts.set(false);
    this.menuOuvert.set(false);
  }

  toggleTheme(): void {

    this.modeSombre.update(value => !value);

    localStorage.setItem(
      'opticare-theme',
      this.modeSombre() ? 'dark' : 'light'
    );
  }
}