import { inject, Injectable, signal } from '@angular/core';
import { Observable, shareReplay, tap } from 'rxjs';

import { StatistiquesCabinet } from '../../models/statistiques.model';
import { Auth } from './auth';
import { StatistiquesService } from './statistiques';

/**
 * Données du cabinet de l'utilisateur connecté, partagées par les écrans du propriétaire.
 *
 * Le compte connecté ne contient que `cabinetId`, pas le nom du cabinet : les deux proviennent de
 * `GET /cabinets/{id}/statistiques` (§15.1, route déjà utilisée par le tableau de bord). Le menu
 * partagé (sur les 6 pages) et le tableau de bord ont donc besoin des mêmes données : ce service
 * joue le rôle de source unique.
 *
 * `statistiques()` est **mémorisée** (`shareReplay`) : quelle que soit la page qui l'appelle en
 * premier (le menu ou le tableau de bord), une seule requête est émise, et ses abonnés suivants
 * reçoivent la même réponse sans nouvel appel API.
 *
 * Tant que la réponse n'est pas arrivée (ou si l'API échoue), `nom()` vaut une chaîne vide : les
 * écrans affichent alors leur repli, jamais un nom inventé.
 */
@Injectable({ providedIn: 'root' })
export class CabinetCourant {
  private readonly statistiquesService = inject(StatistiquesService);
  private readonly auth = inject(Auth);

  private readonly nomSignal = signal('');

  /** Nom du cabinet, chaîne vide tant qu'il n'est pas connu. */
  readonly nom = this.nomSignal.asReadonly();

  private requete: Observable<StatistiquesCabinet> | null = null;
  private cabinetIdRequete: string | null = null;

  /**
   * Statistiques du cabinet connecté, mémorisées : une seule requête émise par session, partagée
   * par le menu et le tableau de bord. `null` si le compte n'a pas de cabinet (aucune requête).
   */
  statistiques(): Observable<StatistiquesCabinet> | null {
    const cabinetId = this.auth.utilisateur()?.cabinetId ?? null;
    if (!cabinetId) return null;

    if (this.requete && this.cabinetIdRequete === cabinetId) return this.requete;

    this.cabinetIdRequete = cabinetId;
    this.requete = this.statistiquesService.obtenirPourCabinet(cabinetId).pipe(
      tap((stats) => this.nomSignal.set(stats.cabinetNom ?? '')),
      shareReplay({ bufferSize: 1, refCount: false }),
    );

    return this.requete;
  }
}
