import { Component, computed, inject, signal } from '@angular/core';
import { Auth } from '../../../core/services/auth';
import{NotificationState} from '../../../core/services/notification-state';

export class PatientLayout {
  private readonly auth = inject(Auth);
  private readonly notifications = inject(NotificationState);

  readonly nomComplet = computed(() => {
    const u = this.auth.utilisateur();
    return u ? `${u.prenom} ${u.nom}` : '';
  });
  readonly initiales = computed(() => {
    const u = this.auth.utilisateur();
    return u ? `${u.prenom.charAt(0)}${u.nom.charAt(0)}`.toUpperCase() : '';
  });
  // ... le reste inchangé


  readonly menuOuvert = signal(false);
  readonly espacesOuverts = signal(false);
  readonly modeSombre = signal(false);

  constructor() {
    const theme = localStorage.getItem('opticare-theme');

    if (theme === 'dark') {
      this.modeSombre.set(true);
    }
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