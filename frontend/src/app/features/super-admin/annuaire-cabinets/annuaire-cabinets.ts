import { HttpErrorResponse } from '@angular/common/http';
import { DatePipe, DecimalPipe } from '@angular/common';
import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';

import { Cabinet as CabinetService } from '../../../core/services/cabinet';
import { Cabinet as CabinetModel, StatutCabinet } from '../../../models/cabinet.model';
import { messageErreurApi } from '../../../core/utils/api-errors';

type FiltreStatutCabinet = StatutCabinet | 'tous';

/** Libellés lisibles d'un statut de cabinet, pour les filtres et les badges. */
const LIBELLES_STATUT: Record<StatutCabinet, string> = {
  en_attente: 'En attente',
  valide: 'Actif',
  refuse: 'Suspendu',
};

/** Classes du badge de statut (fond + texte). */
const CLASSES_BADGE: Record<StatutCabinet, string> = {
  en_attente: 'bg-warning/20 text-warning',
  valide: 'bg-secondary-container text-on-secondary-container',
  refuse: 'bg-error/15 text-error',
};

const TAILLE_PAGE = 8;

/**
 * Annuaire des cabinets (`/admin/cabinets`) — cabinets enregistrés
 * (validés, en attente ou suspendus), alimenté par l'API réelle
 * `GET /admin/cabinets` (mêmes données que la validation, sans le filtre
 * `en_attente`).
 *
 * Limite connue : `GET /admin/cabinets` renvoie `proprietaire` (nom/prénom)
 * mais **pas** le nombre de membres d'équipe ni l'e-mail du propriétaire —
 * voir `models/cabinet.model.ts`. La colonne « Membres de l'équipe » n'est
 * donc pas affichable en l'état : elle est remplacée par le quartier, seule
 * information d'équipe-équivalent disponible. À rebrancher quand le back
 * exposera ces compteurs (POINTS-A-CONFIRMER-BACKEND.md).
 */
@Component({
  selector: 'app-annuaire-cabinets',
  imports: [DatePipe, DecimalPipe, FormsModule],
  templateUrl: './annuaire-cabinets.html',
  styleUrl: './annuaire-cabinets.css',
})
export class AnnuaireCabinets implements OnInit {
  private readonly cabinetService = inject(CabinetService);

  readonly chargement = signal(true);
  readonly erreur = signal<string | null>(null);
  readonly erreurAction = signal<string | null>(null);
  readonly succesAction = signal<string | null>(null);

  private readonly cabinets = signal<CabinetModel[]>([]);
  readonly texteRecherche = signal('');
  readonly filtreStatut = signal<FiltreStatutCabinet>('tous');
  readonly pageActuelle = signal(1);
  readonly actionEnCours = signal<string | null>(null);

  /** Cabinet dont la fiche récapitulative est ouverte (drawer), ou null. */
  readonly cabinetDetail = signal<CabinetModel | null>(null);

  /** Cabinet visé par une confirmation de suspension/réactivation. */
  readonly cabinetASuspendre = signal<CabinetModel | null>(null);

  /** Libellés et classes exposés aux templates. */
  readonly libelleStatut = (statut: StatutCabinet) => LIBELLES_STATUT[statut];
  readonly classeBadge = (statut: StatutCabinet) => CLASSES_BADGE[statut];

  /** Seuls les cabinets déjà traités (valide/refuse) sont suspendables ; l'en_attente passe par la validation. */
  readonly estSuspendable = (cabinet: CabinetModel) => cabinet.status !== 'en_attente';

  private readonly cabinetsFiltres = computed(() => {
    const texte = this.texteRecherche().trim().toLowerCase();
    const statut = this.filtreStatut();

    return this.cabinets().filter((c) => {
      const correspondTexte =
        !texte ||
        c.nom.toLowerCase().includes(texte) ||
        c.ville.toLowerCase().includes(texte) ||
        c.quartier.toLowerCase().includes(texte) ||
        `${c.proprietaire?.prenom ?? ''} ${c.proprietaire?.nom ?? ''}`.toLowerCase().includes(texte);
      const correspondStatut = statut === 'tous' || c.status === statut;
      return correspondTexte && correspondStatut;
    });
  });

  readonly nombrePages = computed(() => Math.max(1, Math.ceil(this.cabinetsFiltres().length / TAILLE_PAGE)));
  readonly pageAffichee = computed(() => Math.min(this.pageActuelle(), this.nombrePages()));

  readonly cabinetsPage = computed(() => {
    const debut = (this.pageAffichee() - 1) * TAILLE_PAGE;
    return this.cabinetsFiltres().slice(debut, debut + TAILLE_PAGE);
  });

  readonly numerosPages = computed(() => Array.from({ length: this.nombrePages() }, (_, i) => i + 1));
  readonly totalCabinets = computed(() => this.cabinets().length);
  readonly totalResultats = computed(() => this.cabinetsFiltres().length);

  /** Ventilation par statut, affichée sous la barre d'outils. */
  readonly compteParStatut = computed(() => {
    const liste = this.cabinets();
    return {
      actif: liste.filter((c) => c.status === 'valide').length,
      attente: liste.filter((c) => c.status === 'en_attente').length,
      suspendu: liste.filter((c) => c.status === 'refuse').length,
    };
  });

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
      error: (e: HttpErrorResponse) => {
        this.chargement.set(false);
        this.erreur.set(messageErreurApi(e, 'Impossible de charger les cabinets. Réessayez.'));
      },
    });
  }

  reinitialiserFiltres(): void {
    this.texteRecherche.set('');
    this.filtreStatut.set('tous');
    this.pageActuelle.set(1);
  }

  allerPage(page: number): void {
    this.pageActuelle.set(Math.min(Math.max(1, page), this.nombrePages()));
  }

  ouvrirFiche(cabinet: CabinetModel): void {
    this.cabinetDetail.set(cabinet);
  }

  fermerFiche(): void {
    this.cabinetDetail.set(null);
  }

  ouvrirConfirmationSuspension(cabinet: CabinetModel): void {
    this.cabinetASuspendre.set(cabinet);
    this.erreurAction.set(null);
    this.succesAction.set(null);
  }

  fermerConfirmation(): void {
    this.cabinetASuspendre.set(null);
  }

  /**
   * Suspend (« refuse » côté API) ou réactive (« valide ») un cabinet.
   * Réutilise les routes confirmées `PUT /admin/cabinets/{id}/verify|reject`
   * — c'est la seule façon, à ce jour, de faire changer le statut d'un
   * cabinet depuis l'admin. Le motif de suspension est posé côté client
   * (l'API exige `motif_refus` non vide pour un rejet).
   */
  confirmerSuspension(): void {
    const cabinet = this.cabinetASuspendre();
    if (!cabinet || this.actionEnCours()) return;

    // Un cabinet actif est suspendu (reject) ; un cabinet suspendu est réactivé (verify).
    const suspendre = cabinet.status === 'valide';
    this.actionEnCours.set(cabinet.id);
    this.erreurAction.set(null);
    this.succesAction.set(null);

    const requete = suspendre
      ? this.cabinetService.refuser(cabinet.id, 'Suspension temporaire depuis l\'annuaire (super admin).')
      : this.cabinetService.valider(cabinet.id);

    requete.subscribe({
      next: (resultat) => {
        this.actionEnCours.set(null);
        this.cabinetASuspendre.set(null);
        this.cabinets.update((liste) => liste.map((c) => (c.id === cabinet.id ? { ...c, status: resultat.status } : c)));
        this.succesAction.set(
          suspendre
            ? `Le cabinet « ${cabinet.nom} » a été suspendu.`
            : `Le cabinet « ${cabinet.nom} » a été réactivé.`,
        );
      },
      error: (e: HttpErrorResponse) => {
        this.actionEnCours.set(null);
        this.erreurAction.set(messageErreurApi(e, "L'action a échoué. Réessayez."));
      },
    });
  }
}
