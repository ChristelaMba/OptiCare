import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';

import { Auth } from '../../../core/services/auth';
import { CabinetCourant } from '../../../core/services/cabinet-courant';
import { messageErreurApi } from '../../../core/utils/api-errors';
import { formaterFcfa } from '../../../core/utils/montant';
import { StatistiquesCabinet } from '../../../models/statistiques.model';
import { MenuProprietaire } from '../../../shared/components/menu-proprietaire/menu-proprietaire';

/** Période du compteur de rendez-vous : `aujourd_hui`, `cette_semaine`, `ce_mois` (seules périodes fournies par l'API). */
type Periode = 'jour' | 'semaine' | 'mois';

const LIBELLE_PERIODE: Record<Periode, string> = { jour: "aujourd'hui", semaine: 'cette semaine', mois: 'ce mois' };
const COULEURS = ['#0050ce', '#1baf7a', '#eda100', '#8e44ad', '#e0457b', '#64748b'];

/**
 * Tableau de bord du propriétaire (20/10/2026), branché sur `GET /cabinets/{id}/statistiques` (§15.1) : chiffre
 * d'affaires du mois (revenus.ce_mois) avec son évolution quand elle existe, rendez-vous (sélecteur
 * jour/semaine/mois limité à cette carte), nouveaux patients du mois, évolution des revenus (`tendances`) et répartition
 * par âge (`patients.tranches_age`). Retirés faute de donnée côté API : panier moyen, jours d'affluence.
 * Graphiques en CSS/HTML pur (barres en %, donut en conic-gradient).
 */
@Component({
  selector: 'app-dashboard-comptable',
  imports: [MenuProprietaire],
  templateUrl: './dashboard-comptable.html',
  styleUrl: './dashboard-comptable.css',
})
export class DashboardComptable implements OnInit {
  private readonly auth = inject(Auth);
  private readonly cabinetCourant = inject(CabinetCourant);

  private readonly cabinetId = this.auth.utilisateur()?.cabinetId ?? null;

  readonly formaterFcfa = formaterFcfa;
  readonly chargement = signal(true);
  readonly erreur = signal<string | null>(null);
  readonly stats = signal<StatistiquesCabinet | null>(null);

  readonly periodes: Periode[] = ['jour', 'semaine', 'mois'];
  readonly libellePeriode = LIBELLE_PERIODE;
  readonly periode = signal<Periode>('mois');

  /** Rendez-vous de la période choisie. */
  readonly rendezVous = computed(() => {
    const rdv = this.stats()?.rdv;
    if (!rdv) return 0;
    const parPeriode: Record<Periode, number> = { jour: rdv.aujourdHui, semaine: rdv.cetteSemaine, mois: rdv.ceMois };
    return parPeriode[this.periode()];
  });

  /**
   * Évolution du chiffre d'affaires : affichée seulement si le serveur la renvoie sous forme numérique et s'il y a
   * quelque chose à comparer (un mois à 0 contre un mois précédent à 0 n'a pas de sens).
   */
  readonly evolution = computed(() => {
    const revenus = this.stats()?.revenus;
    if (!revenus || revenus.evolutionPourcentage === null) return null;
    if (revenus.ceMois === 0 && revenus.moisPrecedent === 0) return null;
    return revenus.evolutionPourcentage;
  });

  readonly texteEvolution = computed(() => {
    const valeur = this.evolution();
    if (valeur === null) return '';
    const texte = new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 1 }).format(Math.abs(valeur));
    return `${valeur < 0 ? '−' : valeur > 0 ? '+' : ''}${texte} %`;
  });

  /** Évolution des revenus : vide (« Pas encore de données ») sans tendance ou si tous les revenus valent 0. */
  readonly tendances = computed(() => this.stats()?.tendances ?? []);
  readonly aDesRevenus = computed(() => this.tendances().some((t) => t.revenus > 0));
  readonly montantMax = computed(() => Math.max(1, ...this.tendances().map((t) => t.revenus)));

  /** Répartition par âge : tranches non vides, en pourcentage du total renseigné. */
  readonly segmentsAge = computed(() => {
    const tranches = (this.stats()?.patients.tranchesAge ?? []).filter((t) => t.total > 0);
    const somme = tranches.reduce((s, t) => s + t.total, 0);
    let cumul = 0;
    return tranches.map((t, i) => {
      const pourcentage = (t.total / somme) * 100;
      const depart = cumul;
      cumul += pourcentage;
      return {
        tranche: t.tranche === 'non_renseigne' ? 'Non renseigné' : t.tranche.replace('-', ' – ') + ' ans',
        total: t.total,
        pourcentage: Math.round(pourcentage),
        couleur: COULEURS[i % COULEURS.length],
        depart,
        fin: cumul,
      };
    });
  });

  readonly styleDonut = computed(() => `conic-gradient(${this.segmentsAge().map((s) => `${s.couleur} ${s.depart}% ${s.fin}%`).join(', ')})`);

  ngOnInit(): void {
    if (!this.cabinetId) {
      this.chargement.set(false);
      this.erreur.set("Aucun cabinet rattaché à ce compte — impossible d'afficher le tableau de bord.");
      return;
    }
    this.charger();
  }

  charger(): void {
    if (!this.cabinetId) return;
    // Données partagées avec le menu (une seule requête par session, cf. CabinetCourant).
    const requete = this.cabinetCourant.statistiques();
    if (!requete) return;

    this.chargement.set(true);
    this.erreur.set(null);
    requete.subscribe({
      next: (stats) => {
        this.stats.set(stats);
        this.chargement.set(false);
      },
      error: (e: HttpErrorResponse) => {
        this.chargement.set(false);
        const messageServeur = (e.error as { message?: string } | null)?.message;
        this.erreur.set(
          messageErreurApi(e, `Impossible de charger les statistiques.${messageServeur ? ` Le serveur répond : ${messageServeur}` : ' Réessayez plus tard.'}`),
        );
      },
    });
  }

  changerPeriode(periode: Periode): void {
    this.periode.set(periode);
  }
}
