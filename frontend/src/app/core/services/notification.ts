import { Service, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { map, Observable } from 'rxjs';

import { environment } from '../../../environments/environment';

const BASE_URL = environment.apiUrl.replace(/\/$/, '');

/** Types renvoyés par l'API (ROUTES-API-LIONEL, « STATUTS » → Notifications). */
export type TypeNotificationApi =
  | 'cabinet_valide'
  | 'cabinet_refuse'
  | 'rdv_confirme'
  | 'rdv_attente'
  | 'rdv_annule'
  | 'rdv_rappel'
  | 'rdv_modifie'
  | 'commande_terminee'
  | 'bienvenue_patient'
  | 'bienvenue_cabinet';

/** Forme brute de `GET /notifications` (200 observé le 19/10/2026 avec un compte patient). */
export interface ApiNotificationBrute {
  id: number;
  type: TypeNotificationApi;
  title: string;
  message: string;
  data: Record<string, unknown> | null;
  is_read: boolean;
  read_at: string | null;
  created_at: string;
}

interface ApiNotificationsEnveloppe {
  status: string;
  message: string;
  data: {
    notifications: ApiNotificationBrute[];
    non_lu_count: number;
  };
}

export interface ListeNotifications {
  notifications: ApiNotificationBrute[];
  /** Compteur de non lues fourni par le serveur (peut dépasser la taille de la page renvoyée). */
  nonLues: number;
}

@Service()
export class Notification {
  private readonly http = inject(HttpClient);

  /** GET /notifications (200 observé le 19/10/2026 avec un compte patient). */
  lister(): Observable<ListeNotifications> {
    return this.http
      .get<ApiNotificationsEnveloppe>(`${BASE_URL}/notifications`)
      .pipe(
        map((enveloppe) => ({
          notifications: enveloppe.data.notifications,
          nonLues: enveloppe.data.non_lu_count,
        })),
      );
  }

  /**
   * PUT /notifications/{id}/read — ✅ RÉEL, testé le 19/10/2026 sur une notification du compte patient
   * de test (200, « Notification marquée comme lue. », `non_lu_count` 4 → 3).
   */
  marquerLue(id: string): Observable<void> {
    return this.http.put<unknown>(`${BASE_URL}/notifications/${id}/read`, {}).pipe(map(() => undefined));
  }

  /**
   * PUT /notifications/read-all — ✅ RÉEL, testé le 19/10/2026 (200, ne concerne que les
   * notifications du compte authentifié ; `non_lu_count` → 0).
   */
  toutMarquerLu(): Observable<void> {
    return this.http.put<unknown>(`${BASE_URL}/notifications/read-all`, {}).pipe(map(() => undefined));
  }
}
