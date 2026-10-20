import {
  Component,
  computed,
  inject,
  signal
} from '@angular/core';

import { DatePipe } from '@angular/common';
import { remplacerDatesBrutes } from '../../../core/utils/dates-fr';
import { RouterLink } from '@angular/router';

import {
  ApiNotificationBrute,
  Notification as NotificationService
} from '../../../core/services/notification';


/* =========================================================
   MODÈLE NOTIFICATION
========================================================= */

export interface Notification {
  id: string;

  type:
    | 'rendez-vous'
    | 'dossier'
    | 'message'
    | 'rappel'
    | 'systeme';

  titre: string;

  message: string;

  date: string | Date;

  lue: boolean;

  lien?: string;
}


/* =========================================================
   FILTRES
========================================================= */

type FiltreNotification =
  | 'toutes'
  | 'non-lues'
  | 'rendez-vous'
  | 'dossier'
  | 'message'
  | 'rappel';


/* =========================================================
   COMPOSANT
========================================================= */

@Component({
  selector: 'app-mes-notifications',

  standalone: true,

  imports: [
    DatePipe,
    RouterLink
  ],

  templateUrl: './mes-notifications.html',

  styleUrl: './mes-notifications.css'
})
export class MesNotifications {

  private readonly notificationService = inject(NotificationService);


  /* =======================================================
     ÉTAT
  ======================================================== */

  chargement = signal<boolean>(true);

  erreur = signal<string | null>(null);

  filtreActif =
    signal<FiltreNotification>('toutes');

  recherche =
    signal<string>('');

  notifications =
    signal<Notification[]>([]);


  /* =======================================================
     NOTIFICATIONS NON LUES
  ======================================================== */

  /** Échec d'un marquage « lu » : message au-dessus de la liste, l'état affiché reste celui du serveur. */
  erreurAction = signal<string | null>(null);

  /** Compteur renvoyé par le serveur (`non_lu_count`) — jamais calculé sur des données inventées. */
  notificationsNonLues = signal<number>(0);


  /* =======================================================
     NOTIFICATIONS FILTRÉES
  ======================================================== */

  notificationsFiltrees = computed(() => {

    let liste = [...this.notifications()];

    const filtre = this.filtreActif();


    /* -----------------------------------------------------
       FILTRE
    ----------------------------------------------------- */

    if (filtre === 'non-lues') {

      liste = liste.filter(
        notification => !notification.lue
      );

    } else if (filtre !== 'toutes') {

      liste = liste.filter(
        notification =>
          notification.type === filtre
      );

    }


    /* -----------------------------------------------------
       RECHERCHE
    ----------------------------------------------------- */

    const recherche =
      this.recherche()
        .trim()
        .toLowerCase();


    if (recherche) {

      liste = liste.filter(notification => {

        return (

          notification.titre
            .toLowerCase()
            .includes(recherche)

          ||

          notification.message
            .toLowerCase()
            .includes(recherche)

        );

      });

    }


    /* -----------------------------------------------------
       TRI PAR DATE
    ----------------------------------------------------- */

    liste.sort((a, b) => {

      return (
        new Date(b.date).getTime()
        -
        new Date(a.date).getTime()
      );

    });


    return liste;

  });


  /* =======================================================
     LISTE VIDE
  ======================================================== */

  listeVide = computed(() => {

    return this.notificationsFiltrees().length === 0;

  });


  /* =======================================================
     CONSTRUCTEUR
  ======================================================== */

  constructor() {

    this.chargerNotifications();

  }


  /* =======================================================
     CHARGER LES NOTIFICATIONS
  ======================================================== */

  /** Message affiché : les dates brutes (AAAA-MM-JJ HH:MM:SS) du serveur sont écrites en français ; la donnée reçue n'est pas modifiée. */
  messageAffiche(message: string): string {
    return remplacerDatesBrutes(message);
  }

  chargerNotifications(): void {

    this.chargement.set(true);

    this.erreur.set(null);

    // GET /notifications (réel). Liste vide = état vide honnête du template ;
    // erreur = bloc d'erreur avec « Réessayer ». Lecture seule : aucun marquage « lu ».
    this.notificationService.lister().subscribe({

      next: ({ notifications, nonLues }) => {

        this.notifications.set(
          notifications.map(MesNotifications.depuisApi)
        );

        this.notificationsNonLues.set(nonLues);

        this.chargement.set(false);

      },

      error: () => {

        this.erreur.set(
          'Impossible de charger vos notifications pour le moment.'
        );

        this.chargement.set(false);

      }

    });

  }


  /** PUT /notifications/{id}/read — l'affichage ne change qu'après le succès côté serveur. */
  marquerCommeLue(
    notification: Notification
  ): void {

    if (notification.lue) {
      return;
    }

    this.erreurAction.set(null);

    this.notificationService.marquerLue(notification.id).subscribe({

      next: () => {

        this.notifications.update(liste =>
          liste.map(item =>
            item.id === notification.id
              ? { ...item, lue: true }
              : item
          )
        );

        this.notificationsNonLues.update(n => Math.max(0, n - 1));

      },

      error: () => {

        this.erreurAction.set(
          'Impossible de marquer cette notification comme lue pour le moment.'
        );

      }

    });

  }


  /** PUT /notifications/read-all — ne concerne que les notifications du compte connecté. */
  toutMarquerCommeLu(): void {

    this.erreurAction.set(null);

    this.notificationService.toutMarquerLu().subscribe({

      next: () => {

        this.notifications.update(liste =>
          liste.map(item => ({ ...item, lue: true }))
        );

        this.notificationsNonLues.set(0);

      },

      error: () => {

        this.erreurAction.set(
          'Impossible de marquer les notifications comme lues pour le moment.'
        );

      }

    });

  }


  /** Notification brute de l'API → modèle d'affichage. */
  private static depuisApi(brute: ApiNotificationBrute): Notification {

    let type: Notification['type'] = 'systeme';

    if (brute.type === 'rdv_rappel') {
      type = 'rappel';
    } else if (brute.type.startsWith('rdv_')) {
      type = 'rendez-vous';
    }

    return {

      id: String(brute.id),

      type,

      // L'API préfixe ses titres d'un emoji (« 📅 RDV confirmé ») : l'écran a ses propres icônes.
      titre: brute.title.replace(/^[^\p{L}\p{N}]+/u, ''),

      message: brute.message,

      date: brute.created_at,

      lue: brute.is_read,

      lien: type === 'rendez-vous' || type === 'rappel' ? '/patient/rendez-vous' : undefined

    };

  }


  /* =======================================================
     CHANGER LE FILTRE
  ======================================================== */

  changerFiltre(
    filtre: FiltreNotification
  ): void {

    this.filtreActif.set(filtre);

  }


  /* =======================================================
     CLASSE CSS SELON LE TYPE
  ======================================================== */

  classeNotification(
    type: Notification['type']
  ): string {

    switch (type) {

      case 'rendez-vous':

        return 'notification-rdv';


      case 'dossier':

        return 'notification-dossier';


      case 'message':

        return 'notification-message';


      case 'rappel':

        return 'notification-rappel';


      case 'systeme':

        return 'notification-systeme';


      default:

        return '';

    }

  }

}