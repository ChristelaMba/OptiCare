
import { Injectable, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment';
import { catchError, map, of, tap } from 'rxjs';

const BASE_URL = environment.apiUrl.replace(/\/$/, '');

interface CompteurResponse {
  status: string;
  data: {
    count: number;
  };
}

@Injectable({
  providedIn: 'root',
})
export class NotificationState {
  private readonly http = inject(HttpClient);

  private readonly compteurSignal = signal(0);
  readonly nombreNotificationsNonLues =
    this.compteurSignal.asReadonly();

  chargerCompteur() {
    return this.http
      .get<CompteurResponse>(
        `${BASE_URL}/notifications/unread-count`
      )
      .pipe(
        map(reponse => reponse.data.count),
        tap(nombre => this.compteurSignal.set(nombre)),
        catchError(erreur => {
          console.error(
            'Erreur de chargement du compteur de notifications',
            erreur
          );
          return of(this.compteurSignal());
        })
      );
  }

  definirCompteur(nombre: number): void {
    this.compteurSignal.set(Math.max(0, nombre));
  }

  reinitialiser(): void {
    this.compteurSignal.set(0);
  }
}
