import { Component, inject, OnInit, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { Router, RouterLink } from '@angular/router';
import { HttpErrorResponse } from '@angular/common/http';

import { Cabinet as CabinetService } from '../../../core/services/cabinet';
import { Auth } from '../../../core/services/auth';
import { Cabinet as CabinetModel } from '../../../models/cabinet.model';

@Component({
  selector: 'app-validation-cabinets',
  imports: [DatePipe, RouterLink],
  templateUrl: './validation-cabinets.html',
  styleUrl: './validation-cabinets.css',
})
export class ValidationCabinets implements OnInit {
  private readonly cabinetService = inject(CabinetService);
  private readonly auth = inject(Auth);
  private readonly router = inject(Router);

  readonly cabinets = signal<CabinetModel[]>([]);
  readonly chargement = signal(true);
  readonly erreur = signal<string | null>(null);
  /** id du cabinet dont l'action valider/rejeter est en cours (désactive ses boutons). */
  readonly actionEnCours = signal<string | null>(null);

  readonly cabinetsEnAttente = () => this.cabinets().filter((c) => c.statutValidation === 'enAttente');

  ngOnInit(): void {
    this.chargerCabinets();
  }

  chargerCabinets(): void {
    this.chargement.set(true);
    this.erreur.set(null);

    this.cabinetService.listerEnAttente().subscribe({
      next: (cabinets) => {
        this.cabinets.set(cabinets);
        this.chargement.set(false);
      },
      error: () => {
        this.chargement.set(false);
        this.erreur.set('Impossible de charger les cabinets en attente. Réessayez.');
      },
    });
  }

  valider(id: string): void {
    this.actionEnCours.set(id);
    this.erreur.set(null);

    this.cabinetService.valider(id).subscribe({
      next: () => {
        this.actionEnCours.set(null);
        this.cabinets.update((liste) => liste.filter((c) => c.id !== id));
      },
      error: (erreur: HttpErrorResponse) => {
        this.actionEnCours.set(null);
        this.erreur.set(
          erreur.status === 404
            ? 'Ce cabinet n\'existe plus ou a déjà été traité.'
            : 'La validation a échoué. Réessayez.',
        );
      },
    });
  }

  rejeter(id: string): void {
    this.actionEnCours.set(id);
    this.erreur.set(null);

    this.cabinetService.rejeter(id).subscribe({
      next: () => {
        this.actionEnCours.set(null);
        this.cabinets.update((liste) => liste.filter((c) => c.id !== id));
      },
      error: (erreur: HttpErrorResponse) => {
        this.actionEnCours.set(null);
        this.erreur.set(
          erreur.status === 404
            ? 'Ce cabinet n\'existe plus ou a déjà été traité.'
            : 'Le rejet a échoué. Réessayez.',
        );
      },
    });
  }

  deconnexion(): void {
    this.auth.logout();
    this.router.navigateByUrl('/auth/connexion');
  }
}
