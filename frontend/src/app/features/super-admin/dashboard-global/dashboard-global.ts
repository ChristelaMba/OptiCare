import { DatePipe } from '@angular/common';
import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { RouterLink } from '@angular/router';

import { SuperAdminDemo } from '../../../core/services/super-admin-demo';
import {
  KpiPlateforme,
  LIBELLES_SEVERITE,
  PointMensuel,
  SeveriteAudit,
  TableauDeBordGlobal,
} from '../../../models/super-admin.model';

/**
 * Dashboard global de la plateforme (`/admin/dashboard`).
 *
 * Données **factices** fournies par `SuperAdminDemo` (aucune route serveur
 * pour cet écran — voir le service). Les cartes KPI, la ventilation des
 * comptes et les graphiques sont calculés à partir du tableau de bord.
 */
@Component({
  selector: 'app-dashboard-global',
  imports: [DatePipe, RouterLink],
  templateUrl: './dashboard-global.html',
  styleUrl: './dashboard-global.css',
})
export class DashboardGlobal implements OnInit {
  private readonly demo = inject(SuperAdminDemo);

  readonly chargement = signal(true);
  readonly erreur = signal<string | null>(null);
  readonly donnees = signal<TableauDeBordGlobal | null>(null);

  readonly libelleSeverite = LIBELLES_SEVERITE;

  /** Cartes KPI reconstruites à partir des données de démo. */
  readonly kpis = computed<KpiPlateforme[]>(() => {
    const d = this.donnees();
    if (!d) return [];
    return [
      {
        cle: 'cabinets',
        libelle: 'Cabinets enregistrés',
        icone: 'storefront',
        valeur: d.cabinetsEnregistres,
        ventilation: d.cabinets,
        lien: 'cabinets',
      },
      {
        cle: 'comptes',
        libelle: 'Comptes utilisateurs',
        icone: 'group',
        valeur: d.comptesTotal,
        ventilation: d.repartitionRoles.map((r) => ({ libelle: r.libelle, total: r.total, couleur: r.couleur })),
        lien: 'comptes',
      },
      {
        cle: 'consultations',
        libelle: 'Consultations du mois',
        icone: 'visibility',
        valeur: d.consultationsMois,
        ventilation: [],
      },
      {
        cle: 'attente',
        libelle: 'Demandes en attente',
        icone: 'pending_actions',
        valeur: d.demandesEnAttente,
        ventilation: [],
        lien: 'cabinets/validation',
        alerte: d.demandesEnAttente > 0,
      },
    ];
  });

  /** Hauteur relative (%) de chaque barre d'un graphique mensuel. */
  readonly hauteurMaxInscriptions = computed(() => DashboardGlobal.maximum(this.donnees()?.inscriptions ?? []));
  readonly hauteurMaxConsultations = computed(() => DashboardGlobal.maximum(this.donnees()?.consultations ?? []));

  /** Nombre maximal de cabinets par ville (pour dimensionner les barres). */
  readonly maxCabinetsVille = computed(() => {
    const villes = this.donnees()?.cabinetsParVille ?? [];
    return villes.reduce((max, v) => Math.max(max, v.total), 0);
  });

  /** Décalage du camembert pour la part des patients (décor simple, non interactif). */
  readonly styleDonutRoles = computed(() => {
    const roles = this.donnees()?.repartitionRoles ?? [];
    const total = roles.reduce((somme, r) => somme + r.total, 0);
    if (!total) return 'conic-gradient(#e2e8f0 0 100%)';

    let cumul = 0;
    const segments = roles.map((r) => {
      const debut = (cumul / total) * 100;
      cumul += r.total;
      const fin = (cumul / total) * 100;
      return `${DashboardGlobal.couleurHex(r.couleur)} ${debut}% ${fin}%`;
    });
    return `conic-gradient(${segments.join(', ')})`;
  });

  ngOnInit(): void {
    this.demo.obtenirTableauDeBord().subscribe({
      next: (donnees) => {
        this.donnees.set(donnees);
        this.chargement.set(false);
      },
      error: () => {
        this.chargement.set(false);
        this.erreur.set('Impossible de charger le tableau de bord.');
      },
    });
  }

  /** Pourcentage d'une barre par rapport au maximum de la série (0 si série vide). */
  pourcentage(point: PointMensuel, maximum: number): number {
    return maximum > 0 ? (point.valeur / maximum) * 100 : 0;
  }

  private static maximum(points: PointMensuel[]): number {
    return points.reduce((max, p) => Math.max(max, p.valeur), 0);
  }

  /** Classe Tailwind → couleur CSS, pour le camembert (conic-gradient). */
  private static couleurHex(classe: string): string {
    const correspondances: Record<string, string> = {
      'bg-primary': '#2f6aec',
      'bg-info': '#2563eb',
      'bg-success': '#16a34a',
      'bg-warning': '#f59e0b',
      'bg-error': '#dc2626',
      'bg-outline': '#737686',
    };
    return correspondances[classe] ?? '#94a3b8';
  }

  /** Classe de la pastille de sévérité (résumé des dernières activités). */
  severiteClasse(severite: SeveriteAudit): string {
    const classes: Record<SeveriteAudit, string> = {
      info: 'bg-info',
      warning: 'bg-warning',
      critique: 'bg-error',
    };
    return classes[severite];
  }
}
