import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { map, Observable } from 'rxjs';

import { environment } from '../../../environments/environment';
import { ApiStatistiquesBrutes, StatistiquesCabinet } from '../../models/statistiques.model';

const BASE_URL = environment.apiUrl.replace(/\/$/, '');

const MOIS = ['janvier', 'février', 'mars', 'avril', 'mai', 'juin', 'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre'];

/**
 * GET /cabinets/{id}/statistiques (ROUTES-API-LIONEL §15.1, testé le 20/10/2026) — propriétaire, opticien, secrétaire.
 * Réponse dans `data`. Compteurs et montants (FCFA) renvoyés en entiers ; une valeur absente ou non numérique est
 * ramenée à 0 (sauf `evolution_pourcentage`, `null` : l'indicateur est alors masqué par l'écran).
 */
@Injectable({
  providedIn: 'root',
})
export class StatistiquesService {
  private readonly http = inject(HttpClient);

  obtenirPourCabinet(cabinetId: string): Observable<StatistiquesCabinet> {
    return this.http
      .get<{ data: ApiStatistiquesBrutes }>(`${BASE_URL}/cabinets/${cabinetId}/statistiques`)
      .pipe(map(({ data }) => StatistiquesService.normaliser(data ?? {})));
  }

  /** `"2026-05"` → « mai 2026 » ; à défaut, le libellé du serveur (en anglais) tel quel. */
  static libelleMois(mois: string | null | undefined, repli: string | null | undefined): string {
    const m = mois?.match(/^(\d{4})-(\d{2})/);
    if (m) {
      const nom = MOIS[Number(m[2]) - 1];
      if (nom) return `${nom} ${m[1]}`;
    }
    return repli ?? mois ?? '';
  }

  private static nombre(valeur: unknown): number {
    const n = typeof valeur === 'string' ? Number(valeur) : (valeur as number);
    return typeof n === 'number' && Number.isFinite(n) ? n : 0;
  }

  private static normaliser(d: ApiStatistiquesBrutes): StatistiquesCabinet {
    const n = StatistiquesService.nombre;
    const evolution = d.revenus?.evolution_pourcentage;
    const evolutionNumerique = typeof evolution === 'number' ? evolution : typeof evolution === 'string' && evolution.trim() !== '' ? Number(evolution) : NaN;

    return {
      cabinetNom: d.cabinet?.nom ?? null,
      rdv: {
        total: n(d.rdv?.total),
        ceMois: n(d.rdv?.ce_mois),
        cetteSemaine: n(d.rdv?.cette_semaine),
        aujourdHui: n(d.rdv?.aujourd_hui),
      },
      patients: {
        total: n(d.patients?.total),
        nouveauxCeMois: n(d.patients?.nouveaux_ce_mois),
        tranchesAge: Object.entries(d.patients?.tranches_age ?? {}).map(([tranche, total]) => ({ tranche, total: n(total) })),
      },
      revenus: {
        total: n(d.revenus?.total),
        ceMois: n(d.revenus?.ce_mois),
        moisPrecedent: n(d.revenus?.mois_precedent),
        enAttente: n(d.revenus?.en_attente),
        evolutionPourcentage: Number.isFinite(evolutionNumerique) ? evolutionNumerique : null,
      },
      tendances: (d.tendances ?? []).map((t) => ({
        mois: t.mois ?? '',
        libelle: StatistiquesService.libelleMois(t.mois, t.label),
        revenus: n(t.revenus),
      })),
    };
  }
}
