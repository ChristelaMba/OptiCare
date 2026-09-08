import { Component, signal } from '@angular/core';
import {
  RouterLink,
  RouterOutlet,
  RouterLinkActive
} from '@angular/router';

@Component({
  selector: 'app-patient-layout',
  standalone: true,
  imports: [
    RouterLink,
    RouterOutlet,
    RouterLinkActive
  ],
  templateUrl: './patient-layout.html',
  styleUrl: './patient-layout.css'
})
export class PatientLayout {

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