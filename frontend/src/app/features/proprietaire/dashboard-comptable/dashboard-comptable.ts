import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { DecimalPipe } from '@angular/common';
import { RouterLink } from '@angular/router';

import { Auth } from '../../../core/services/auth';
import { Statistiques as StatistiquesService } from '../../../core/services/statistiques';
import { StatistiquesCabinet } from '../../../core/mocks/statistiques-mock-data';

type Periode = 'jour' | 'semaine' | 'mois';

/**
 * Reproduction de la maquette `maquette/dashboard_comptable_opticare_admin/`.
 * Graphiques en CSS/HTML pur (barres à hauteur en %, donut en
 * conic-gradient) — aucune librairie de charts n'est installée, cohérent
 * avec la maquette elle-même qui utilise la même technique. Palette du
 * donut validée avec le script du skill dataviz (bleu/vert/ambre, tous
 * checks passés) plutôt que la palette bleu/bleu clair de la maquette
 * (peu distinguable, aurait probablement échoué la vérification CVD).
 */
@Component({
  selector: 'app-dashboard-comptable',
  imports: [DecimalPipe, RouterLink],
  templateUrl: './dashboard-comptable.html',
  styleUrl: './dashboard-comptable.css',
})
export class DashboardComptable implements OnInit {
  private readonly auth = inject(Auth);
  private readonly statistiquesService = inject(StatistiquesService);

  private readonly cabinetId = this.auth.utilisateur()?.cabinetId ?? null;

  readonly chargement = signal(true);
  readonly erreur = signal<string | null>(null);
  readonly periodes: Periode[] = ['jour', 'semaine', 'mois'];
  readonly periode = signal<Periode>('mois');
  readonly stats = signal<StatistiquesCabinet | null>(null);

  readonly montantMax = computed(() => Math.max(...(this.stats()?.evolutionRevenus.map((e) => e.montant) ?? [1])));
  readonly rdvMax = computed(() => Math.max(...(this.stats()?.joursAffluence.map((j) => j.nombreRdv) ?? [1])));

  /** Angles cumulés pour le donut en conic-gradient — [couleur, %départ, %fin]. */
  readonly segmentsDonut = computed(() => {
    const distribution = this.stats()?.distributionAge ?? [];
    const couleurs = ['#0050ce', '#1baf7a', '#eda100'];
    let cumul = 0;
    return distribution.map((segment, i) => {
      const depart = cumul;
      cumul += segment.pourcentage;
      return { ...segment, couleur: couleurs[i % couleurs.length], depart, fin: cumul };
    });
  });

  readonly styleDonut = computed(() => {
    const parts = this.segmentsDonut().map((s) => `${s.couleur} ${s.depart}% ${s.fin}%`);
    return `conic-gradient(${parts.join(', ')})`;
  });

  ngOnInit(): void {
    this.charger();
  }

  changerPeriode(periode: Periode): void {
    this.periode.set(periode);
    this.charger();
  }

  private charger(): void {
    if (!this.cabinetId) {
      this.chargement.set(false);
      this.erreur.set('Aucun cabinet rattaché à ce compte — impossible d\'afficher le dashboard.');
      return;
    }

    this.chargement.set(true);
    this.statistiquesService.obtenirPourCabinet(this.cabinetId, this.periode()).subscribe({
      next: (stats) => {
        this.stats.set(stats);
        this.chargement.set(false);
      },
      error: () => {
        this.chargement.set(false);
        this.erreur.set('Impossible de charger les statistiques pour le moment. Réessayez plus tard.');
      },
    });
  }
}
