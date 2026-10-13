import { Component, inject, OnInit, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { HttpErrorResponse } from '@angular/common/http';

import { Cabinet as CabinetService } from '../../../core/services/cabinet';
import { Auth } from '../../../core/services/auth';
import { Cabinet as CabinetModel } from '../../../models/cabinet.model';

@Component({
  selector: 'app-validation-cabinets',
  imports: [DatePipe, FormsModule, RouterLink],
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
  /** id du cabinet dont l'action valider/refuser est en cours (désactive ses boutons). */
  readonly actionEnCours = signal<string | null>(null);

  // 2026-09-11 : vocabulaire aligné sur l'API réelle — 'enAttente' → 'en_attente'
  // (voir StatutCabinet, models/cabinet.model.ts).
  readonly cabinetsEnAttente = () => this.cabinets().filter((c) => c.status === 'en_attente');

  /**
   * id du cabinet en cours de refus — révèle le petit formulaire « motif »
   * à la place des 2 boutons d'action de sa carte. `motif_refus` est requis
   * par `PUT /admin/cabinets/{id}/reject` (confirmé 11/09), sans quoi
   * l'écran d'avant ne pouvait pas rejeter sans écrire quelque chose.
   */
  readonly cabinetARejeter = signal<string | null>(null);
  readonly motifRefus = signal('');

  ngOnInit(): void {
    this.chargerCabinets();
  }

  chargerCabinets(): void {
    this.chargement.set(true);
    this.erreur.set(null);

    this.cabinetService.listerAdmin().subscribe({
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

  ouvrirFormulaireRejet(id: string): void {
    this.cabinetARejeter.set(id);
    this.motifRefus.set('');
  }

  annulerRejet(): void {
    this.cabinetARejeter.set(null);
    this.motifRefus.set('');
  }

  confirmerRejet(id: string): void {
    const motif = this.motifRefus().trim();
    if (!motif) return;

    this.actionEnCours.set(id);
    this.erreur.set(null);

    this.cabinetService.refuser(id, motif).subscribe({
      next: () => {
        this.actionEnCours.set(null);
        this.cabinetARejeter.set(null);
        this.cabinets.update((liste) => liste.filter((c) => c.id !== id));
      },
      error: (erreur: HttpErrorResponse) => {
        this.actionEnCours.set(null);
        this.erreur.set(
          erreur.status === 404
            ? 'Ce cabinet n\'existe plus ou a déjà été traité.'
            : 'Le refus a échoué. Réessayez.',
        );
      },
    });
  }

  deconnexion(): void {
    this.auth.logout();
    this.router.navigateByUrl('/auth/connexion');
  }
}
