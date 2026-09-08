
import {
  Component,
  OnInit,
  computed,
  inject,
  signal
} from '@angular/core';

import { Auth } from '../../../core/services/auth';
import { RendezVousService } from '../../../core/services/rendez-vous';
import { RendezVousAffichage } from '../../../core/mocks/rendez-vous-mock-data';
import { StatutRendezVous } from '../../../models/rendez-vous.model';

/**
 * Libellés visibles dans l'interface.
 *
 * Vocabulaire API :
 * - libre
 * - reserve
 * - confirme
 * - annule
 * - termine
 * - non_honore
 */
const LABEL_STATUT: Record<StatutRendezVous, string> = {
  libre: 'Libre',
  reserve: 'En attente',
  confirme: 'Confirmé',
  annule: 'Annulé',
  termine: 'Honoré',
  non_honore: 'Non honoré'
};

@Component({
  selector: 'app-agenda',
  standalone: true,
  templateUrl: './agenda.html',
  styleUrl: './agenda.css'
})
export class Agenda implements OnInit {

  private readonly auth = inject(Auth);
  private readonly rendezVousService = inject(RendezVousService);

  private readonly cabinetId =
    this.auth.utilisateur()?.cabinetId ?? null;

  // ============================================================
  // ÉTAT DE L'AGENDA
  // ============================================================

  dateActuelle = signal(new Date());

  vueActive = signal<'jour' | 'semaine'>('jour');

  chargement = signal(true);

  erreur = signal<string | null>(null);

  // Tous les rendez-vous récupérés depuis le backend
  private readonly rendezVousBruts =
    signal<RendezVousAffichage[]>([]);

  // ============================================================
  // RENDEZ-VOUS AFFICHÉS
  // ============================================================

  /**
   * Les créneaux "libre" ne sont pas affichés dans cet écran.
   */
  readonly rendezVous = computed(() => {

    const dateSelectionnee = this.dateActuelle();

    const annee = dateSelectionnee.getFullYear();
    const mois = dateSelectionnee.getMonth();
    const jour = dateSelectionnee.getDate();

    return this.rendezVousBruts().filter(rdv => {

      // Les créneaux libres ne sont pas des rendez-vous affichés
      if (rdv.statut === 'libre') {
        return false;
      }

      // Conversion de la date du rendez-vous
      const dateRdv = new Date(rdv.date);

      if (Number.isNaN(dateRdv.getTime())) {
        return false;
      }

      return (
        dateRdv.getFullYear() === annee &&
        dateRdv.getMonth() === mois &&
        dateRdv.getDate() === jour
      );
    });
  });

  /**
   * Rendez-vous actuellement sélectionné dans la fenêtre de détails.
   */
  rendezVousActif =
    signal<RendezVousAffichage | null>(null);

  // ============================================================
  // DATE
  // ============================================================

  dateFormatee = computed(() => {

    return new Intl.DateTimeFormat('fr-FR', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    }).format(this.dateActuelle());

  });

  // ============================================================
  // STATISTIQUES
  // ============================================================

  nombreConfirmes = computed(() =>
    this.rendezVous()
      .filter(rdv => rdv.statut === 'confirme')
      .length
  );

  nombreAttente = computed(() =>
    this.rendezVous()
      .filter(rdv => rdv.statut === 'reserve')
      .length
  );

  nombreAnnules = computed(() =>
    this.rendezVous()
      .filter(rdv => rdv.statut === 'annule')
      .length
  );

  // ============================================================
  // INITIALISATION
  // ============================================================

  ngOnInit(): void {

    if (!this.cabinetId) {

      this.chargement.set(false);

      this.erreur.set(
        "Aucun cabinet rattaché à ce compte — impossible d'afficher l'agenda."
      );

      return;
    }

    this.chargement.set(true);
    this.erreur.set(null);

    this.rendezVousService
      .listerParCabinet(this.cabinetId)
      .subscribe({

        next: (rendezVous) => {

          this.rendezVousBruts.set(rendezVous);

          this.chargement.set(false);
        },

        error: () => {

          this.chargement.set(false);

          this.erreur.set(
            "Impossible de charger l'agenda pour le moment. Réessayez plus tard."
          );
        }

      });
  }

  // ============================================================
  // DÉTAILS D'UN RENDEZ-VOUS
  // ============================================================

  ouvrirDetails(
    rdv: RendezVousAffichage
  ): void {

    this.rendezVousActif.set(rdv);
  }

  fermerDetails(): void {

    this.rendezVousActif.set(null);
  }

  // ============================================================
  // NAVIGATION ENTRE LES JOURS
  // ============================================================

  changerJour(direction: number): void {

    const nouvelleDate =
      new Date(this.dateActuelle());

    nouvelleDate.setDate(
      nouvelleDate.getDate() + direction
    );

    this.dateActuelle.set(nouvelleDate);

    // On ferme le détail lorsqu'on change de jour
    this.rendezVousActif.set(null);
  }

  allerAujourdHui(): void {

    this.dateActuelle.set(new Date());

    this.rendezVousActif.set(null);
  }

  // ============================================================
  // CHANGEMENT DE VUE
  // ============================================================

  changerVue(
    vue: 'jour' | 'semaine'
  ): void {

    this.vueActive.set(vue);
  }

  // ============================================================
  // STATUT
  // ============================================================

  statutLabel(
    statut: StatutRendezVous
  ): string {

    return LABEL_STATUT[statut];
  }

  // ============================================================
  // PATIENT
  // ============================================================

  nomAffiche(
    rdv: RendezVousAffichage
  ): string {

    return rdv.nomPatientAffiche ?? 'Patient';
  }

  // ============================================================
  // DURÉE
  // ============================================================

  duree(
    rdv: RendezVousAffichage
  ): string {

    if (!rdv.heureDebut || !rdv.heureFin) {
      return '';
    }

    const [
      heureDebut,
      minuteDebut
    ] = rdv.heureDebut
      .split(':')
      .map(Number);

    const [
      heureFin,
      minuteFin
    ] = rdv.heureFin
      .split(':')
      .map(Number);

    if (
      [
        heureDebut,
        minuteDebut,
        heureFin,
        minuteFin
      ].some(Number.isNaN)
    ) {
      return '';
    }

    const debut =
      heureDebut * 60 + minuteDebut;

    const fin =
      heureFin * 60 + minuteFin;

    const minutes = fin - debut;

    return minutes > 0
      ? `${minutes} min`
      : '';
  }

  // ============================================================
  // ACTIONS SUR LES RENDEZ-VOUS
  // ============================================================

  confirmerRendezVous(): void {

    this.changerStatut('confirme');
  }

  annulerRendezVous(): void {

    this.changerStatut('annule');
  }

  marquerHonore(): void {

    this.changerStatut('termine');
  }

  marquerAbsent(): void {

    this.changerStatut('non_honore');
  }

  // ============================================================
  // MODIFICATION DU STATUT
  // ============================================================

  private changerStatut(
    statut: StatutRendezVous
  ): void {

    const rdv = this.rendezVousActif();

    if (!rdv) {
      return;
    }

    this.rendezVousService
      .mettreAJourStatut(
        rdv.id,
        statut
      )
      .subscribe({

        next: () => {

          // Mise à jour locale uniquement après
          // confirmation du backend
          this.rendezVousBruts.update(
            liste =>
              liste.map(item =>
                item.id === rdv.id
                  ? {
                      ...item,
                      statut
                    }
                  : item
              )
          );

          // Mise à jour de la fenêtre de détails
          this.rendezVousActif.set({
            ...rdv,
            statut
          });
        },

        error: () => {

          this.erreur.set(
            "Impossible de mettre à jour le statut pour le moment. Réessayez plus tard."
          );
        }

      });
  }
}
