import { Component, computed, inject, signal } from '@angular/core';

import {
  RouterLink,
  RouterLinkActive,
  RouterOutlet
} from '@angular/router';
import { Auth } from '../../../core/services/auth';
import { initialesUtilisateur, nomCompletUtilisateur } from '../../../core/utils/identite-utilisateur';
import { libelleRole } from '../../../models/utilisateur.model';
import { BoutonDeconnexion } from '../../../shared/components/bouton-deconnexion/bouton-deconnexion';

@Component({
  selector: 'app-secretaire-layout',
  standalone: true,

  imports: [
    RouterLink,
    RouterLinkActive,
    RouterOutlet, BoutonDeconnexion],

  templateUrl: './secretaire-layout.html',
  styleUrl: './secretaire-layout.css'
})
export class SecretaireLayout {

  /* =====================================================
     IDENTITÉ DE L'UTILISATEUR CONNECTÉ (plus de nom en dur)
  ====================================================== */

  private readonly auth = inject(Auth);

  readonly nomComplet = computed(() => nomCompletUtilisateur(this.auth.utilisateur()));

  readonly initiales = computed(() => initialesUtilisateur(this.auth.utilisateur()));

  readonly roleLibelle = computed(() => libelleRole(this.auth.role()));


  /* =====================================================
     MENU MOBILE
  ====================================================== */

  readonly menuOuvert = signal(false);


  /* =====================================================
     SÉLECTEUR D'ESPACE
  ====================================================== */

  readonly espaceOuvert = signal(false);


  /* =====================================================
     MODE SOMBRE
  ====================================================== */

  readonly modeSombre = signal(false);


  /* =====================================================
     CONSTRUCTEUR
  ====================================================== */

  constructor() {

    const theme =
      localStorage.getItem('opticare-theme');

    if (theme === 'dark') {

      this.modeSombre.set(true);

    }

  }


  /* =====================================================
     MENU MOBILE
  ====================================================== */

  toggleMenu(): void {

    this.menuOuvert.update(
      value => !value
    );

  }


  fermerMenu(): void {

    this.menuOuvert.set(false);

    this.espaceOuvert.set(false);

  }


  /* =====================================================
     ESPACE
  ====================================================== */

  toggleEspace(): void {

    this.espaceOuvert.update(
      value => !value
    );

  }


  fermerEspace(): void {

    this.espaceOuvert.set(false);

  }


  /* =====================================================
     MODE SOMBRE / CLAIR
  ====================================================== */

  toggleTheme(): void {

    this.modeSombre.update(
      value => !value
    );

    localStorage.setItem(
      'opticare-theme',
      this.modeSombre()
        ? 'dark'
        : 'light'
    );

  }

}