import { HttpErrorResponse } from '@angular/common/http';
import { DatePipe, DecimalPipe } from '@angular/common';
import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { catchError, of } from 'rxjs';

import { Avis as AvisService, AvisPublic } from '../../../core/services/avis';
import { Cabinet as CabinetService } from '../../../core/services/cabinet';
import { Cabinet as CabinetModel } from '../../../models/cabinet.model';
import { messageErreurApi } from '../../../core/utils/api-errors';

/** Avis prêt à afficher : auteur abrégé (« Prénom N. ») et date mise en forme. */
interface AvisModeration {
  id: number;
  note: number;
  commentaire: string | null;
  date: string;
  auteur: string;
}

/**
 * Modération des avis (`/admin/avis`) — le super admin peut retirer un avis
 * abusif sur `DELETE /avis/{id}` (ROUTES-API-LIONEL §14.5, ouvert au patient
 * propriétaire **et** au super admin).
 *
 * L'API n'expose pas de route « tous les avis » : l'écran part donc de la
 * liste des cabinets (`GET /cabinets`, public) et affiche les avis de celui
 * qui est sélectionné (`GET /cabinets/{id}/avis`, §14.1). Aucun avis n'est
 * inventé : la liste est celle du serveur, un tableau vide affiche un état
 * vide honnête.
 */
@Component({
  selector: 'app-moderation-avis',
  imports: [DatePipe, DecimalPipe, FormsModule],
  templateUrl: './moderation-avis.html',
  styleUrl: './moderation-avis.css',
})
export class ModerationAvis implements OnInit {
  private readonly avisService = inject(AvisService);
  private readonly cabinetService = inject(CabinetService);

  readonly chargementCabinets = signal(true);
  readonly chargementAvis = signal(false);
  readonly erreur = signal<string | null>(null);
  readonly erreurAction = signal<string | null>(null);
  readonly succesAction = signal<string | null>(null);

  readonly cabinets = signal<CabinetModel[]>([]);
  readonly cabinetSelectionne = signal<CabinetModel | null>(null);
  readonly avis = signal<AvisModeration[]>([]);

  /** Agrégat public du cabinet sélectionné (moyenne, total des avis). */
  readonly moyenneAvis = signal(0);
  readonly totalAvis = signal(0);

  /** Avis visé par une confirmation de suppression. */
  readonly avisASupprimer = signal<AvisModeration | null>(null);
  readonly actionEnCours = signal<number | null>(null);

  readonly texteRecherche = signal('');

  /** Cabinets filtrés par la recherche (nom, ville, quartier). */
  readonly cabinetsFiltres = computed(() => {
    const texte = this.texteRecherche().trim().toLowerCase();
    if (!texte) {
      return this.cabinets();
    }
    return this.cabinets().filter(
      (c) =>
        c.nom.toLowerCase().includes(texte) ||
        c.ville.toLowerCase().includes(texte) ||
        c.quartier.toLowerCase().includes(texte),
    );
  });

  readonly aucunAvis = computed(() => !this.chargementAvis() && this.avis().length === 0);

  ngOnInit(): void {
    this.chargerCabinets();
  }

  chargerCabinets(): void {
    this.chargementCabinets.set(true);
    this.erreur.set(null);

    this.cabinetService
      .listerPublics()
      .pipe(catchError(() => of<CabinetModel[]>([])))
      .subscribe((cabinets) => {
        this.cabinets.set(cabinets);
        this.chargementCabinets.set(false);
      });
  }

  /** Change le cabinet sélectionné et charge ses avis. */
  selectionner(cabinetId: string): void {
    const cabinet = this.cabinets().find((c) => c.id === cabinetId) ?? null;
    this.cabinetSelectionne.set(cabinet);
    this.erreur.set(null);
    this.erreurAction.set(null);
    this.succesAction.set(null);
    this.avisASupprimer.set(null);
    this.avis.set([]);
    this.moyenneAvis.set(0);
    this.totalAvis.set(0);

    if (!cabinet) {
      return;
    }

    this.chargerAvis(cabinet.id);
  }

  chargerAvis(cabinetId: string): void {
    this.chargementAvis.set(true);
    this.erreur.set(null);

    this.avisService.listerParCabinetAvecAgregat(cabinetId).subscribe({
      next: (agregat) => {
        this.avis.set(agregat.avis.map(ModerationAvis.depuisApi));
        this.moyenneAvis.set(agregat.moyenne);
        this.totalAvis.set(agregat.total);
        this.chargementAvis.set(false);
      },
      error: (e: HttpErrorResponse) => {
        this.chargementAvis.set(false);
        this.erreur.set(messageErreurApi(e, 'Impossible de charger les avis de ce cabinet. Réessayez.'));
      },
    });
  }

  ouvrirConfirmation(avis: AvisModeration): void {
    this.avisASupprimer.set(avis);
    this.erreurAction.set(null);
    this.succesAction.set(null);
  }

  fermerConfirmation(): void {
    this.avisASupprimer.set(null);
  }

  /** `DELETE /avis/{id}` — l'avis n'est retiré de la liste qu'après succès côté serveur. */
  confirmerSuppression(): void {
    const avis = this.avisASupprimer();
    if (!avis || this.actionEnCours()) {
      return;
    }

    this.actionEnCours.set(avis.id);
    this.erreurAction.set(null);
    this.succesAction.set(null);

    this.avisService.supprimer(String(avis.id)).subscribe({
      next: () => {
        this.avis.update((liste) => liste.filter((a) => a.id !== avis.id));
        this.avisASupprimer.set(null);
        this.actionEnCours.set(null);
        this.succesAction.set('L’avis a été supprimé.');
      },
      error: (e: HttpErrorResponse) => {
        this.actionEnCours.set(null);
        this.erreurAction.set(messageErreurApi(e, 'La suppression a échoué. Réessayez.'));
      },
    });
  }

  /** « Prénom N. » — jamais le nom complet du patient. */
  private static auteur(patient: AvisPublic['patient']): string {
    if (!patient) {
      return 'Patient';
    }
    const initiale = patient.nom ? ` ${patient.nom.charAt(0).toUpperCase()}.` : '';
    return `${patient.prenom}${initiale}`.trim() || 'Patient';
  }

  private static depuisApi(brut: AvisPublic): AvisModeration {
    return {
      id: brut.id,
      note: brut.note,
      commentaire: brut.commentaire,
      date: brut.created_at,
      auteur: ModerationAvis.auteur(brut.patient),
    };
  }
}
