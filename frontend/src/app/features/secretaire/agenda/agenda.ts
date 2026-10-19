
import { HttpErrorResponse } from '@angular/common/http';
import {
  Component,
  OnInit,
  computed,
  inject,
  signal
} from '@angular/core';

import { Auth } from '../../../core/services/auth';
import { RendezVousService } from '../../../core/services/rendez-vous';
import { messageErreurApi } from '../../../core/utils/api-errors';
import { RendezVous, StatutRendezVous } from '../../../models/rendez-vous.model';

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

  /** Erreur d'une action (confirmer, annuler…), affichée dans la fenêtre de détails sans masquer l'agenda. */
  erreurAction = signal<string | null>(null);

  /** Vrai pendant l'appel d'une action : évite le double clic. */
  actionEnCours = signal(false);

  // Tous les rendez-vous récupérés depuis le backend
  private readonly rendezVousBruts =
    signal<RendezVous[]>([]);

  // ============================================================
  // RENDEZ-VOUS AFFICHÉS
  // ============================================================

  /**
   * Les créneaux "libre" ne sont pas affichés dans cet écran.
   */
  readonly rendezVous = computed(() => {

    const d = this.dateActuelle();
    // Jour local au format YYYY-MM-DD, comparé au champ `date` du rendez-vous (déjà ramené à YYYY-MM-DD).
    const jourSelectionne = [
      d.getFullYear(),
      String(d.getMonth() + 1).padStart(2, '0'),
      String(d.getDate()).padStart(2, '0'),
    ].join('-');

    return this.rendezVousBruts().filter(rdv => {

      // Les créneaux libres ne sont pas des rendez-vous affichés
      if (rdv.statut === 'libre') {
        return false;
      }

      return rdv.date === jourSelectionne;
    });
  });

  /**
   * Rendez-vous actuellement sélectionné dans la fenêtre de détails.
   */
  rendezVousActif =
    signal<RendezVous | null>(null);

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

        error: (e: HttpErrorResponse) => {

          this.chargement.set(false);

          const messageServeur =
            (e.error as { message?: string } | null)?.message;

          this.erreur.set(
            messageErreurApi(
              e,
              `Impossible de charger l'agenda.${messageServeur ? ` Le serveur répond : ${messageServeur}` : ' Réessayez plus tard.'}`
            )
          );
        }

      });
  }

  // ============================================================
  // DÉTAILS D'UN RENDEZ-VOUS
  // ============================================================

  ouvrirDetails(
    rdv: RendezVous
  ): void {

    this.erreurAction.set(null);
    this.rendezVousActif.set(rdv);
  }

  fermerDetails(): void {

    this.erreurAction.set(null);

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
    rdv: RendezVous
  ): string {

    return rdv.nomPatientAffiche ?? 'Patient';
  }

  // ============================================================
  // DURÉE
  // ============================================================

  duree(
    rdv: RendezVous
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

    if (!rdv || this.actionEnCours()) {
      return;
    }

    this.actionEnCours.set(true);
    this.erreurAction.set(null);

    this.rendezVousService
      .mettreAJourStatut(
        rdv.id,
        statut
      )
      .subscribe({

        next: (misAJour) => {

          // Mise à jour locale uniquement après confirmation du serveur
          // (statut renvoyé par l'API : PUT /rdv/{id}/confirmer|terminer|non-honore|annuler).
          this.rendezVousBruts.update(
            liste =>
              liste.map(item =>
                item.id === rdv.id
                  ? { ...item, statut: misAJour.statut }
                  : item
              )
          );

          this.rendezVousActif.set({
            ...rdv,
            statut: misAJour.statut
          });

          this.actionEnCours.set(false);
        },

        error: (e: HttpErrorResponse) => {

          this.actionEnCours.set(false);

          this.erreurAction.set(
            messageErreurApi(
              e,
              "Impossible de mettre à jour le statut pour le moment. Réessayez plus tard."
            )
          );
        }

      });
  }
}
