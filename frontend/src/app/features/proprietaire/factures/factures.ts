import { DatePipe } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { catchError, of, Subject, switchMap, tap } from 'rxjs';

import { Auth } from '../../../core/services/auth';
import { FactureService } from '../../../core/services/facture';
import { messageErreurApi } from '../../../core/utils/api-errors';
import { formaterFcfa } from '../../../core/utils/montant';
import {
  bornesSelection,
  dateDansBornes,
  formaterDateFr,
  LIBELLE_PERIODE,
  ModePeriode,
  PeriodePredefinie,
} from '../../../core/utils/periode-filtre';
import { Facture, STATUTS_FACTURE, StatutFacture, TypeFacture } from '../../../models/facture.model';
import { BoutonDeconnexion } from '../../../shared/components/bouton-deconnexion/bouton-deconnexion';
import { LogoOpticare } from '../../../shared/components/logo-opticare/logo-opticare';

const LIBELLE_STATUT: Record<StatutFacture, string> = {
  impaye: 'Impayée',
  partiel: 'Partielle',
  paye: 'Payée',
  annule: 'Annulée',
};

const LIBELLE_TYPE: Record<TypeFacture, string> = {
  acompte: 'Acompte',
  solde: 'Solde',
  unique: 'Facture unique',
};

/**
 * Factures du cabinet — vue **propriétaire**, lecture seule (21/10/2026).
 *
 * Le tableau de bord affiche un chiffre d'affaires ; cet écran en permet le
 * détail : qui a payé quoi et ce qui reste en attente. Le propriétaire ne crée
 * ni ne modifie de facture (rôle de l'opticien) : **aucune** action d'écriture ici.
 *
 * Source : `GET /cabinets/{id}/factures` (§11.2, accès autorisé au propriétaire),
 * filtres `statut` et `search` délégués au serveur. Les montants sont en francs
 * CFA, affichés arrondis à l'entier (`formaterFcfa`).
 *
 * Filtres de date : l'API n'offre aucune plage de dates sur cette route, la
 * sélection (période prédéfinie, date précise ou plage) porte donc sur la date
 * d'émission et agit dans le navigateur sur la liste chargée. Les cartes de
 * synthèse suivent les filtres actifs.
 */
@Component({
  selector: 'app-factures-proprietaire',
  imports: [LogoOpticare, FormsModule, RouterLink, DatePipe, BoutonDeconnexion],
  templateUrl: './factures.html',
  styleUrl: './factures.css',
})
export class FacturesProprietaire implements OnInit {
  private readonly auth = inject(Auth);
  private readonly factureService = inject(FactureService);

  private readonly cabinetId = this.auth.utilisateur()?.cabinetId ?? null;

  readonly formaterFcfa = formaterFcfa;
  readonly formaterDateFr = formaterDateFr;
  readonly libelleStatut = LIBELLE_STATUT;
  readonly libelleType = LIBELLE_TYPE;
  readonly statuts = STATUTS_FACTURE;

  readonly chargement = signal(true);
  readonly erreur = signal<string | null>(null);
  readonly chargementEnCours = signal(false);
  readonly factures = signal<Facture[]>([]);

  readonly filtreStatut = signal<StatutFacture | ''>('');
  readonly recherche = signal('');

  /** Filtre de date sur la date d'émission. */
  readonly periodes: PeriodePredefinie[] = ['tous', 'jour', 'semaine', 'mois', 'annee'];
  readonly libellePeriode = LIBELLE_PERIODE;
  readonly modePeriode = signal<ModePeriode>('tous');
  readonly datePrecise = signal('');
  readonly debutPlage = signal('');
  readonly finPlage = signal('');

  /** Aujourd'hui figé une fois : les bornes ne changent pas entre deux rendus. */
  private readonly aujourdHui = new Date();

  /** Bornes de la sélection de date, ou `null` pour « tous ». */
  readonly bornes = computed(() =>
    bornesSelection(
      this.modePeriode(),
      { date: this.datePrecise(), debut: this.debutPlage(), fin: this.finPlage() },
      this.aujourdHui,
    ),
  );

  /** Factures affichées : liste serveur (statut + recherche) puis filtre de date local. */
  readonly facturesAffichees = computed(() => {
    const bornes = this.bornes();
    return this.factures().filter((f) => dateDansBornes(f.dateEmission, bornes));
  });

  /**
   * Synthèse calculée sur les factures **affichées** (donc sur les filtres
   * actifs) : total facturé, total encaissé et ce qui reste en attente sur les
   * factures non soldées. Les factures annulées sont exclues des trois totaux.
   */
  readonly totalFacture = computed(() =>
    this.facturesAffichees().filter((f) => f.statut !== 'annule').reduce((somme, f) => somme + f.montant, 0),
  );
  readonly totalEncaisse = computed(() =>
    this.facturesAffichees().filter((f) => f.statut !== 'annule').reduce((somme, f) => somme + f.montantPaye, 0),
  );
  readonly totalEnAttente = computed(() =>
    this.facturesAffichees()
      .filter((f) => f.statut === 'impaye' || f.statut === 'partiel')
      .reduce((somme, f) => somme + f.soldeRestant, 0),
  );

  /** Libellé lisible de la sélection de date, pour les cartes (« Ce mois », « 01/10/2026 »…). */
  readonly libellePeriodeActive = computed(() => {
    const mode = this.modePeriode();
    if (mode === 'date') return this.datePrecise() ? `le ${formaterDateFr(this.datePrecise())}` : 'tous';
    if (mode === 'plage') {
      if (!this.debutPlage() || !this.finPlage()) return 'tous';
      return `du ${formaterDateFr(this.debutPlage())} au ${formaterDateFr(this.finPlage())}`;
    }
    return this.libellePeriode[mode];
  });

  /** Vrai si une période restreint la liste (≠ « tous »). */
  readonly periodeActive = computed(() => this.bornes() !== null);

  /** Vrai si un filtre serveur est actif (les totaux ne portent alors que sur un sous-ensemble). */
  readonly filtresActifs = computed(
    () => this.filtreStatut() !== '' || this.recherche().trim() !== '' || this.periodeActive(),
  );

  /** Déclenche un rechargement côté serveur à chaque changement de filtre ou de recherche. */
  private readonly recharger$ = new Subject<void>();

  ngOnInit(): void {
    if (!this.cabinetId) {
      this.chargement.set(false);
      this.erreur.set('Aucun cabinet rattaché à ce compte — impossible d’afficher les factures.');
      return;
    }

    this.recharger$
      .pipe(
        tap(() => this.chargementEnCours.set(true)),
        switchMap(() => {
          const statut = this.filtreStatut();
          const search = this.recherche().trim();
          return this.factureService
            .listerParCabinet(this.cabinetId as string, { ...(statut ? { statut } : {}), ...(search ? { search } : {}) })
            .pipe(
              catchError((e: HttpErrorResponse) => {
                const messageServeur = (e.error as { message?: string } | null)?.message;
                this.erreur.set(
                  messageErreurApi(
                    e,
                    `Impossible de charger les factures.${messageServeur ? ` Le serveur répond : ${messageServeur}` : ' Réessayez plus tard.'}`,
                  ),
                );
                return of(null);
              }),
            );
        }),
      )
      .subscribe((factures) => {
        if (factures) {
          // Le serveur ne garantit pas d'ordre : la plus récente d'abord (id décroissant).
          this.factures.set([...factures].sort((a, b) => Number(b.id) - Number(a.id)));
          this.erreur.set(null);
        }
        this.chargement.set(false);
        this.chargementEnCours.set(false);
      });

    this.recharger$.next();
  }

  filtrerStatut(statut: StatutFacture | ''): void {
    this.filtreStatut.set(statut);
    this.recharger$.next();
  }

  /** Recherche activée uniquement au clic ou sur Entrée (évite un appel par frappe). */
  rechercher(): void {
    this.recharger$.next();
  }

  effacerRecherche(): void {
    if (!this.recherche()) return;
    this.recherche.set('');
    this.recharger$.next();
  }

  /** Change la sélection de date (période prédéfinie, date précise ou plage). Filtre local : pas d'appel serveur. */
  changerMode(mode: ModePeriode): void {
    this.modePeriode.set(mode);
  }

  reinitialiserFiltres(): void {
    this.filtreStatut.set('');
    this.recherche.set('');
    this.modePeriode.set('tous');
    this.datePrecise.set('');
    this.debutPlage.set('');
    this.finPlage.set('');
    this.recharger$.next();
  }
}
