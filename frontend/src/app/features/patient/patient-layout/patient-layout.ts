
import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { Auth } from '../../../core/services/auth';
import { NotificationState } from '../../../core/services/notification-state';
import { RouterLink, RouterOutlet, RouterLinkActive } from '@angular/router';
@Component({
  selector: 'app-patient-layout',
  standalone: true,
  imports: [RouterLink, RouterOutlet, RouterLinkActive],
  templateUrl: './patient-layout.html',
  styleUrl: './patient-layout.css',
})
export class PatientLayout implements OnInit {
  private readonly auth = inject(Auth);
  readonly notifications = inject(NotificationState);

  readonly nomComplet = computed(() => {
    const u = this.auth.utilisateur();
    return u ? `${u.prenom} ${u.nom}` : '';
  });

  readonly initiales = computed(() => {
    const u = this.auth.utilisateur();

    return u
      ? `${u.prenom.charAt(0)}${u.nom.charAt(0)}`.toUpperCase()
      : '';
  });

  readonly menuOuvert = signal(false);
  readonly espacesOuverts = signal(false);
  readonly modeSombre = signal(false);

  constructor() {
    const theme = localStorage.getItem('opticare-theme');

    if (theme === 'dark') {
      this.modeSombre.set(true);
    }
  }

  ngOnInit(): void {
    if (!this.auth.estConnecte()) {
      return;
    }

   this.auth.chargerUtilisateurConnecte().subscribe({
  next: (utilisateur) => {
    console.log('[OptiCare] Utilisateur chargé :', utilisateur);
  },
  error: (erreur) => {
    console.error(
      '[OptiCare] Erreur de récupération du compte :',
      erreur
    );
  },
});

    this.notifications.chargerCompteur().subscribe({
      error: (erreur) => {
        console.error(
          'Impossible de charger les notifications :',
          erreur
        );
      },
    });
  }

  toggleMenu(): void {
    this.menuOuvert.update((value) => !value);
  }

  fermerMenu(): void {
    this.menuOuvert.set(false);
    this.espacesOuverts.set(false);
  }

  toggleEspaces(): void {
    this.espacesOuverts.update((value) => !value);
  }

  selectionnerEspace(
    espace: 'patient' | 'secretaire'
  ): void {
    this.espacesOuverts.set(false);
    this.menuOuvert.set(false);
  }

  toggleTheme(): void {
    this.modeSombre.update((value) => !value);

    localStorage.setItem(
      'opticare-theme',
      this.modeSombre() ? 'dark' : 'light'
    );
  }
}
