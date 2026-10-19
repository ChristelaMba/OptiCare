import { Component, ElementRef, HostListener, computed, inject, signal } from '@angular/core';
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
  private readonly element = inject(ElementRef<HTMLElement>);

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
  toggleMenuProfil(): void {
    this.menuProfilOuvert.update(value => !value);
  }

  /** Le menu de l'avatar se ferme au clic en dehors de lui. */
  @HostListener('document:click', ['$event'])
  fermerMenuProfilSiClicExterieur(evenement: Event): void {
    if (!this.menuProfilOuvert()) {
      return;
    }
    const zone = (this.element.nativeElement as HTMLElement).querySelector('.topbar-profile-menu');
    if (zone && !zone.contains(evenement.target as Node)) {
      this.menuProfilOuvert.set(false);
    }
  }

  /** … et à la touche Échap. */
  @HostListener('document:keydown.escape')
  fermerMenuProfilAvecEchap(): void {
    this.menuProfilOuvert.set(false);
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
}
