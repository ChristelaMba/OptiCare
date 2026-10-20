import { DatePipe } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { catchError, of, Subject, switchMap, tap } from 'rxjs';

import { Auth } from '../../../core/services/auth';
import { PatientCabinet, PatientsCabinet } from '../../../core/services/patients-cabinet';
import { messageErreurApi } from '../../../core/utils/api-errors';
import { bornesSelection, dateDansBornes, LIBELLE_PERIODE, PeriodePredefinie } from '../../../core/utils/periode-filtre';
import { MenuProprietaire } from '../../../shared/components/menu-proprietaire/menu-proprietaire';

/**
 * Patients du cabinet — vue **propriétaire**, lecture seule (21/10/2026).
 *
 * Un propriétaire a besoin de savoir qui est suivi chez lui ; il ne saisit
 * pas de patients (c'est le rôle de la secrétaire et de l'opticien). L'écran
 * n'a donc **aucune** action d'écriture : pas de « Nouveau patient », pas de
 * modification, pas de suppression.
 *
 * Source : `GET /cabinets/{id}/patients` (§7.1, accès autorisé au propriétaire),
 * recherche déléguée au serveur via le paramètre `search`. L'API ne renvoie ni
 * âge, ni sexe, ni nombre de consultations : aucune de ces données n'est inventée.
 *
 * 21/10/2026 — filtres de période : « nouveaux inscrits » s'appuie sur la seule
 * date par patient fournie par l'API (`created_at`, exposée en `dateInscription`).
 * Comme l'API n'offre aucune plage de dates sur cette route, le filtre agit dans
 * le navigateur sur la liste complète chargée (voir `periode-filtre.ts`).
 */
@Component({
  selector: 'app-patients-cabinet',
  imports: [MenuProprietaire, FormsModule, DatePipe],
  templateUrl: './patients-cabinet.html',
  styleUrl: './patients-cabinet.css',
})
export class PatientsCabinetProprietaire implements OnInit {
  private readonly auth = inject(Auth);
  private readonly patientsService = inject(PatientsCabinet);

  private readonly cabinetId = this.auth.utilisateur()?.cabinetId ?? null;

  readonly chargement = signal(true);
  readonly erreur = signal<string | null>(null);
  readonly chargementEnCours = signal(false);
  readonly patients = signal<PatientCabinet[]>([]);
  readonly recherche = signal('');

  /** Périodes de la date d'inscription proposées à l'écran. */
  readonly periodes: PeriodePredefinie[] = ['tous', 'jour', 'semaine', 'mois'];
  readonly libellePeriode = LIBELLE_PERIODE;
  readonly periode = signal<PeriodePredefinie>('tous');

  /** Aujourd'hui figé une fois : les bornes ne changent pas entre deux rendus. */
  private readonly aujourdHui = new Date();

  /** Bornes de la période choisie (date d'inscription), ou `null` pour « tous ». */
  readonly bornes = computed(() => bornesSelection(this.periode(), {}, this.aujourdHui));

  /** Patients listés, filtrés par la période sur leur date d'inscription. */
  readonly patientsFiltres = computed(() => {
    const bornes = this.bornes();
    return this.patients().filter((p) => dateDansBornes(p.dateInscription, bornes));
  });

  /** Carte fixe : effectif total du cabinet, indépendant de la période. */
  readonly totalPatients = computed(() => this.patients().length);

  /**
   * Carte dynamique : patients inscrits sur la période. Sur « tous », il n'y a
   * pas de datedebut — on affiche alors l'effectif total, seule lecture utile.
   */
  readonly nouveauxSurPeriode = computed(() => {
    const bornes = this.bornes();
    return bornes ? this.patients().filter((p) => dateDansBornes(p.dateInscription, bornes)).length : this.totalPatients();
  });

  /** Vrai quand une période restreint la liste (≠ « tous »). */
  readonly periodeActive = computed(() => this.bornes() !== null);

  /** Déclenche un rechargement côté serveur à chaque changement de recherche. */
  private readonly recharger$ = new Subject<void>();

  ngOnInit(): void {
    if (!this.cabinetId) {
      this.chargement.set(false);
      this.erreur.set('Aucun cabinet rattaché à ce compte — impossible d’afficher les patients.');
      return;
    }

    this.recharger$
      .pipe(
        tap(() => this.chargementEnCours.set(true)),
        switchMap(() => {
          const search = this.recherche().trim();
          return this.patientsService.lister(this.cabinetId as string, search || undefined).pipe(
            catchError((e: HttpErrorResponse) => {
              const messageServeur = (e.error as { message?: string } | null)?.message;
              this.erreur.set(
                messageErreurApi(
                  e,
                  `Impossible de charger les patients.${messageServeur ? ` Le serveur répond : ${messageServeur}` : ' Réessayez plus tard.'}`,
                ),
              );
              return of(null);
            }),
          );
        }),
      )
      .subscribe((patients) => {
        if (patients) {
          this.patients.set(patients);
          this.erreur.set(null);
        }
        this.chargement.set(false);
        this.chargementEnCours.set(false);
      });

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

  changerPeriode(periode: PeriodePredefinie): void {
    this.periode.set(periode);
  }

  /** Initiales pour l'avatar (deux lettres au plus). */
  initiales(patient: PatientCabinet): string {
    return `${patient.prenom.charAt(0)}${patient.nom.charAt(0)}`.toUpperCase();
  }
}
