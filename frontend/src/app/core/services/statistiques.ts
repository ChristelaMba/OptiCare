import { Service, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

import { environment } from '../../../environments/environment';
import { StatistiquesCabinet } from '../mocks/statistiques-mock-data';

const BASE_URL = environment.apiUrl.replace(/\/$/, '');

/**
 * TODO : ressource NON confirmée avec le back-end — le Dashboard comptable
 * (§9.6 du cahier des charges) décrit le contenu visuel attendu mais aucune
 * route ni contrat de données n'est listé au §8. Route et forme de
 * `StatistiquesCabinet` (voir core/mocks/statistiques-mock-data.ts) sont
 * des hypothèses provisoires, à confirmer avant utilisation réelle.
 */
@Service()
export class Statistiques {
  private readonly http = inject(HttpClient);

  obtenirPourCabinet(cabinetId: string, periode: 'jour' | 'semaine' | 'mois'): Observable<StatistiquesCabinet> {
    return this.http.get<StatistiquesCabinet>(`${BASE_URL}/cabinets/${cabinetId}/statistiques`, {
      params: { periode },
    });
  }
}
