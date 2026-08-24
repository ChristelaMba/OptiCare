import { Component, computed, signal } from '@angular/core';
import {
  RouterLink,
  RouterLinkActive,
  RouterOutlet
} from '@angular/router';

@Component({
  selector: 'app-secretaire-layout',
  standalone: true,
  imports: [
    RouterLink,
    RouterLinkActive,
    RouterOutlet
  ],
  templateUrl: './secretaire-layout.html',
  styleUrl: './secretaire-layout.css'
})
export class SecretaireLayout {

  menuOuvert = signal(false);
  espaceOuvert = signal(false);

  toggleMenu(): void {
    this.menuOuvert.update(value => !value);
  }

  fermerMenu(): void {
    this.menuOuvert.set(false);
    this.espaceOuvert.set(false);
  }

  toggleEspace(): void {
    this.espaceOuvert.update(value => !value);
  }

  fermerEspace(): void {
    this.espaceOuvert.set(false);
  }
}