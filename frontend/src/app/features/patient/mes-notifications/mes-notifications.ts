import {
  Component,
  computed,
  signal
} from '@angular/core';

import { DatePipe } from '@angular/common';
import { RouterLink } from '@angular/router';


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


  /* =======================================================
     ÉTAT
  ======================================================== */

  chargement = signal<boolean>(false);

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

  notificationsNonLues = computed(() => {

    return this.notifications()
      .filter(notification => !notification.lue)
      .length;

  });


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


    /*
     * Données temporaires de démonstration.
     * Elles pourront être remplacées plus tard
     * par l'appel à ton backend.
     */

    const donnees: Notification[] = [

      {
        id: 'notification-1',

        type: 'rendez-vous',

        titre: 'Rendez-vous confirmé',

        message:
          'Votre rendez-vous avec le Dr. Jean Mbarga a été confirmé pour le 10 septembre 2026 à 09h00.',

        date: '2026-09-04T09:30:00',

        lue: false,

        lien: '/patient/rendez-vous'
      },


      {
        id: 'notification-2',

        type: 'rappel',

        titre: 'Rappel de rendez-vous',

        message:
          'N’oubliez pas votre consultation prévue le 10 septembre à 09h00.',

        date: '2026-09-03T16:45:00',

        lue: false,

        lien: '/patient/rendez-vous'
      },


      {
        id: 'notification-3',

        type: 'dossier',

        titre: 'Dossier visuel mis à jour',

        message:
          'Votre dossier visuel a été mis à jour à la suite de votre dernière consultation.',

        date: '2026-09-02T11:20:00',

        lue: true,

        lien: '/patient/dossier-visuel'
      },


      {
        id: 'notification-4',

        type: 'message',

        titre: 'Nouveau message',

        message:
          'Vous avez reçu un nouveau message de votre spécialiste.',

        date: '2026-09-01T14:10:00',

        lue: false,

        lien: '/patient/messages'
      },


      {
        id: 'notification-5',

        type: 'rendez-vous',

        titre: 'Rendez-vous reprogrammé',

        message:
          'Votre rendez-vous du 15 septembre a été déplacé à 14h00.',

        date: '2026-08-30T10:15:00',

        lue: true,

        lien: '/patient/rendez-vous'
      },


      {
        id: 'notification-6',

        type: 'systeme',

        titre: 'Bienvenue sur OptiCare',

        message:
          'Votre espace patient est maintenant configuré. Vous pouvez consulter votre dossier et gérer vos rendez-vous.',

        date: '2026-08-28T08:00:00',

        lue: true

      }

    ];


    this.notifications.set(donnees);

    this.chargement.set(false);

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
     MARQUER UNE NOTIFICATION COMME LUE
  ======================================================== */

  marquerCommeLue(
    notification: Notification
  ): void {

    this.notifications.update(liste =>

      liste.map(item => {

        if (item.id !== notification.id) {

          return item;

        }


        return {

          ...item,

          lue: true

        };

      })

    );

  }


  /* =======================================================
     TOUT MARQUER COMME LU
  ======================================================== */

  toutMarquerCommeLu(): void {

    this.notifications.update(liste =>

      liste.map(notification => ({

        ...notification,

        lue: true

      }))

    );

  }


  /* =======================================================
     SUPPRIMER UNE NOTIFICATION
  ======================================================== */

  supprimerNotification(
    notification: Notification
  ): void {

    this.notifications.update(liste =>

      liste.filter(
        item => item.id !== notification.id
      )

    );

  }


  /* =======================================================
     SUPPRIMER TOUTES LES NOTIFICATIONS
  ======================================================== */

  supprimerToutes(): void {

    this.notifications.set([]);

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