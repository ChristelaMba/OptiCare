import { Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';

import { Auth } from '../../../core/services/auth';

@Component({
  selector: 'app-acces-refuse',
  imports: [RouterLink],
  templateUrl: './acces-refuse.html',
  styleUrl: './acces-refuse.css',
})
export class AccesRefuse {
  private readonly auth = inject(Auth);

  readonly estConnecte = this.auth.estConnecte;

  routeRetour(): string {
    const role = this.auth.role();
    return role ? this.auth.routeParDefaut(role) : '/auth/connexion';
  }
}
