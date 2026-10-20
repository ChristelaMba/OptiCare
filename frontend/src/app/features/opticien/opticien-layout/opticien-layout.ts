import {
  Component,
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
import { LogoOpticare } from '../../../shared/components/logo-opticare/logo-opticare';

@Component({
  selector: 'app-opticien-layout',
  standalone: true,

  imports: [
    LogoOpticare,
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

    // Mode clair uniquement (spécification du projet) : on neutralise tout thème sombre
    // qu'une version précédente aurait laissé sur <html>.
    const html = this.document.documentElement;

    html.setAttribute('data-theme', 'light');
    html.classList.remove('dark');
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
}
