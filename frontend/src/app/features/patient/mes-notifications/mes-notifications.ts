import {
  Component,
  computed,
  inject,
  signal
} from '@angular/core';

import { DatePipe } from '@angular/common';
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