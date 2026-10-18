import { Injectable, inject } from '@angular/core';
import { Observable, of, throwError } from 'rxjs';

import { PatientDossier } from '../../models/dossier-visuel.model';
import { Auth } from './auth';

/**
 * 19/10/2026 : le faux dossier « Jean Dupont » et l'URL `localhost:8000`
 * sont retirés. L'identité affichée vient de la session réelle.
 *
 * Les fiches de consultation viennent de `GET /patients/{patientId}/consultations`
 * (ROUTES-API-LIONEL §8.5), qui renvoie 500 tant que `CheckRole` n'est pas
 * corrigé côté back (Lot 2). En attendant, on ne l'appelle pas : le dossier
 * est renvoyé sans fiche et `historiqueDisponible: false` permet à l'écran
 * de ne PAS affirmer « aucune consultation » (elles existent peut-être).
 */
@Injectable({
  providedIn: 'root'
})
export class DossierVisuelService {

  private readonly auth = inject(Auth);

  getMonDossier(): Observable<PatientDossier> {
    const utilisateur = this.auth.utilisateur();

    if (!utilisateur) {
      return throwError(() => new Error('Aucun utilisateur connecté'));
    }

    return of({
      prenom: utilisateur.prenom,
      nom: utilisateur.nom,
      fiches: [],
      historiqueDisponible: false,
    });
  }
}
