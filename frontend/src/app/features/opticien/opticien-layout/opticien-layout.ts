import {
  Component,
  HostBinding,
  computed,
  signal,
  inject
} from '@angular/core';

import {
  RouterLink,
  RouterLinkActive,
  RouterOutlet
} from '@angular/router';

import { DOCUMENT } from '@angular/common';
import { Auth } from '../../../core/services/auth';
import { initialesUtilisateur, nomCompletUtilisateur } from '../../../core/utils/identite-utilisateur';
import { libelleRole } from '../../../models/utilisateur.model';
import { BoutonDeconnexion } from '../../../shared/components/bouton-deconnexion/bouton-deconnexion';

@Component({
  selector: 'app-opticien-layout',
  standalone: true,

  imports: [
    RouterLink,
    RouterLinkActive,
    RouterOutlet, BoutonDeconnexion],

  templateUrl: './opticien-layout.html',
  styleUrl: './opticien-layout.css'
})
export class OpticienLayout {

  private readonly document = inject(DOCUMENT);

  /* =====================================================
     IDENTITÉ DE L'UTILISATEUR CONNECTÉ (plus de nom en dur)
  ====================================================== */

  private readonly auth = inject(Auth);

  readonly nomComplet = computed(() => nomCompletUtilisateur(this.auth.utilisateur()));

  readonly initiales = computed(() => initialesUtilisateur(this.auth.utilisateur()));

  readonly roleLibelle = computed(() => libelleRole(this.auth.role()));


  // =====================================================
  // MENU MOBILE
  // =====================================================

  menuOuvert = signal(false);

  // =====================================================
  // MODE SOMBRE
  // =====================================================

  modeSombre = signal(false);

  @HostBinding('class.dark-mode')
  get darkModeClass(): boolean {
    return this.modeSombre();
  }

  // =====================================================
  // NOTIFICATIONS
  // =====================================================

  notificationsOuvertes = signal(false);

  // TODO : brancher GET /notifications (service `Notification`, comme le portail patient) quand un compte
  // opticien de test existera pour vérifier la route. Pas de liste ni de compteur en dur en attendant :
  // le panneau affiche un état vide.

  // =====================================================
  // INITIALISATION
  // =====================================================

  constructor() {

    const theme = localStorage.getItem('opticare-theme');

    if (theme === 'dark') {

      this.modeSombre.set(true);

      this.appliquerTheme(true);

    } else {

      this.modeSombre.set(false);

      this.appliquerTheme(false);

    }
  }

  // =====================================================
  // MENU MOBILE
  // =====================================================

  toggleMenu(): void {

    this.menuOuvert.update(
      ouvert => !ouvert
    );

  }

  fermerMenu(): void {

    this.menuOuvert.set(false);

  }

  // =====================================================
  // NOTIFICATIONS
  // =====================================================

  toggleNotifications(): void {

    this.notificationsOuvertes.update(
      ouvert => !ouvert
    );

  }

  fermerNotifications(): void {

    this.notificationsOuvertes.set(false);

  }

  // =====================================================
  // MODE SOMBRE
  // =====================================================

  toggleTheme(): void {

    this.modeSombre.update(
      sombre => !sombre
    );

    const sombre = this.modeSombre();

    this.appliquerTheme(sombre);

    localStorage.setItem(
      'opticare-theme',
      sombre ? 'dark' : 'light'
    );

  }

  private appliquerTheme(sombre: boolean): void {

    const html =
      this.document.documentElement;

    if (sombre) {

      html.setAttribute(
        'data-theme',
        'dark'
      );

      html.classList.add('dark');

    } else {

      html.setAttribute(
        'data-theme',
        'light'
      );

      html.classList.remove('dark');

    }

  }
}