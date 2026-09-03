import { Component, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { FormsModule } from '@angular/forms';

import { Auth } from '../../../core/services/auth';
import { RoleUtilisateur } from '../../../models/utilisateur.model';

/**
 * OUTIL DE DEV UNIQUEMENT — permet d'atteindre n'importe quel écran protégé
 * sans backend réel, sans console navigateur ni manipulation de localStorage.
 * Route publique, non listée dans la navigation. À retirer une fois
 * l'authentification réelle branchée.
 */
@Component({
  selector: 'app-connexion-simulee',
  imports: [FormsModule],
  templateUrl: './connexion-simulee.html',
  styleUrl: './connexion-simulee.css',
})
export class ConnexionSimulee {
  private readonly auth = inject(Auth);
  private readonly router = inject(Router);

  readonly roles: RoleUtilisateur[] = ['Patient', 'Secretaire', 'Opticien', 'Proprietaire', 'SuperAdmin'];

  readonly roleChoisi = signal<RoleUtilisateur>('SuperAdmin');
  readonly cheminPersonnalise = signal('');
  readonly estConnecte = this.auth.estConnecte;
  readonly roleActuel = this.auth.role;

  /** Bouton rapide : simule le rôle et va sur sa page d'accueil par défaut. */
  allerVersEspace(role: RoleUtilisateur): void {
    this.auth.simulerConnexion(role);
    this.router.navigateByUrl(this.auth.routeParDefaut(role));
  }

  /** Simule le rôle choisi et navigue vers le chemin exact tapé. */
  allerVersChemin(): void {
    const chemin = this.cheminPersonnalise().trim();
    if (!chemin) {
      return;
    }
    this.auth.simulerConnexion(this.roleChoisi());
    this.router.navigateByUrl(chemin.startsWith('/') ? chemin : `/${chemin}`);
  }

  deconnexion(): void {
    this.auth.logout();
  }
}
