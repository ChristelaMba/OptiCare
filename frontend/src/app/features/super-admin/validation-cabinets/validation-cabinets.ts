import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpErrorResponse } from '@angular/common/http';

import { Cabinet as CabinetService } from '../../../core/services/cabinet';
import { Cabinet as CabinetModel } from '../../../models/cabinet.model';

/**
 * Validation des cabinets (`/admin/cabinets/validation`) — demandes
 * d'inscription `en_attente`, alimentées par `GET /admin/cabinets`.
 *
 * Rendu dans `SuperAdminLayout` (la sidebar, le profil et la déconnexion
 * sont portés par le layout, plus par cet écran).
 *
 * Actions :
 *  - « Valider & Activer » → `PUT /admin/cabinets/{id}/verify` (route réelle) ;
 *  - « Rejeter » (avec motif) → `PUT /admin/cabinets/{id}/reject` (route réelle) ;
 *  - « Demander des pièces » → **pas de route serveur** : la demande est
 *    consignée localement (bandeau de succès) et documentée comme telle.
 */
@Component({
  selector: 'app-validation-cabinets',
  imports: [DatePipe, FormsModule],
  templateUrl: './validation-cabinets.html',
  styleUrl: './validation-cabinets.css',
})
export class ValidationCabinets implements OnInit {
  private readonly cabinetService = inject(CabinetService);

  readonly cabinets = signal<CabinetModel[]>([]);
  readonly chargement = signal(true);
  readonly erreur = signal<string | null>(null);
  readonly succes = signal<string | null>(null);
  /** id du cabinet dont une action (valider/refuser) est en cours (désactive ses boutons). */
  readonly actionEnCours = signal<string | null>(null);

  // 2026-09-11 : vocabulaire aligné sur l'API réelle — 'enAttente' → 'en_attente'
  // (voir StatutCabinet, models/cabinet.model.ts).
  readonly cabinetsEnAttente = () => this.cabinets().filter((c) => c.status === 'en_attente');

  /**
   * id du cabinet en cours de refus — révèle le petit formulaire « motif »
   * à la place des boutons d'action de sa carte. `motif_refus` est requis
   * par `PUT /admin/cabinets/{id}/reject` (confirmé 11/09), sans quoi
   * l'écran ne pouvait pas rejeter sans écrire quelque chose.
   */
  readonly cabinetARejeter = signal<string | null>(null);
  readonly motifRefus = signal('');

  /** id du cabinet pour lequel on demande des pièces complémentaires (formulaire en mémoire). */
  readonly cabinetAPieces = signal<string | null>(null);
  readonly messagePieces = signal('');

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
    this.succes.set(null);

    this.cabinetService.valider(id).subscribe({
      next: (resultat) => {
        this.actionEnCours.set(null);
        this.cabinets.update((liste) => liste.map((c) => (c.id === id ? { ...c, status: resultat.status } : c)));
        this.succes.set('Le cabinet a été validé et activé.');
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
    this.succes.set(null);
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
    this.succes.set(null);

    this.cabinetService.refuser(id, motif).subscribe({
      next: (resultat) => {
        this.actionEnCours.set(null);
        this.cabinetARejeter.set(null);
        this.cabinets.update((liste) => liste.map((c) => (c.id === id ? { ...c, status: resultat.status } : c)));
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

  ouvrirDemandePieces(id: string): void {
    this.cabinetAPieces.set(id);
    this.messagePieces.set('');
    this.succes.set(null);
  }

  annulerDemandePieces(): void {
    this.cabinetAPieces.set(null);
    this.messagePieces.set('');
  }

  /**
   * Aucune route serveur pour « demander des pièces » : on consigne la
   * demande localement (bandeau de succès) et on revient à l'état normal.
   * Le message saisi n'est **pas** envoyé à l'API — voir le commentaire du
   * composant. À brancher quand le back exposera une route de relance.
   */
  confirmerDemandePieces(cabinet: CabinetModel): void {
    const message = this.messagePieces().trim();
    if (!message) return;

    this.cabinetAPieces.set(null);
    this.messagePieces.set('');
    this.succes.set(`Demande de pièces envoyée pour « ${cabinet.nom} » (consignée localement).`);
  }
}
