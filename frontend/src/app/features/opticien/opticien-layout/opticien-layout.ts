import {
  Component,
  HostBinding,
  signal,
  inject
} from '@angular/core';

import {
  RouterLink,
  RouterLinkActive,
  RouterOutlet
} from '@angular/router';

import { DOCUMENT } from '@angular/common';

@Component({
  selector: 'app-opticien-layout',
  standalone: true,

  imports: [
    RouterLink,
    RouterLinkActive,
    RouterOutlet
  ],

  templateUrl: './opticien-layout.html',
  styleUrl: './opticien-layout.css'
})
export class OpticienLayout {

  private readonly document = inject(DOCUMENT);

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

  notifications = [
    {
      id: 1,
      type: 'commande',
      titre: 'Commande prête',
      message: 'La commande de Paul Ndi est terminée.',
      temps: 'Il y a 30 min',
      lue: false
    },
    {
      id: 2,
      type: 'consultation',
      titre: 'Nouvelle consultation',
      message: 'Une consultation est prévue pour Alice Mbarga.',
      temps: 'Il y a 1 h',
      lue: false
    },
    {
      id: 3,
      type: 'patient',
      titre: 'Nouveau patient',
      message: 'Clara Ngono a été ajoutée à vos patients.',
      temps: 'Hier',
      lue: true
    }
  ];

  nombreNotifications = signal(2);

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

  marquerCommeLue(id: number): void {

    const notification =
      this.notifications.find(
        item => item.id === id
      );

    if (!notification || notification.lue) {
      return;
    }

    this.notifications =
      this.notifications.map(item =>
        item.id === id
          ? {
              ...item,
              lue: true
            }
          : item
      );

    this.nombreNotifications.set(
      this.notifications.filter(
        item => !item.lue
      ).length
    );

  }

  marquerToutesCommeLues(): void {

    this.notifications =
      this.notifications.map(notification => ({
        ...notification,
        lue: true
      }));

    this.nombreNotifications.set(0);

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