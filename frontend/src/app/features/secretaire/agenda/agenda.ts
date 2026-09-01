 import { Component, OnInit, computed, inject, signal } from '@angular/core';

import { Auth } from '../../../core/services/auth';
import { RendezVousService } from '../../../core/services/rendez-vous';
import { RendezVousAffichage } from '../../../core/mocks/rendez-vous-mock-data';
import { StatutRendezVous } from '../../../models/rendez-vous.model';

// 2026-09-03 : labels conservés à l'identique de la version précédente
// (mêmes textes visibles pour la secrétaire, notamment « Honoré » pour
// l'état termine) — seules les clés changent, pour pointer vers le vrai
// StatutRendezVous (§5) au lieu de l'ancien vocabulaire local à 3 valeurs
// divergentes. Voir JOURNAL-MODIFICATIONS-PARTAGEES.md.
const LABEL_STATUT: Record<StatutRendezVous, string> = {
  confirme: 'Confirmé',
  en_attente: 'En attente',
  annule: 'Annulé',
  termine: 'Honoré',
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

  private readonly cabinetId = this.auth.utilisateur()?.cabinetId ?? null;

  dateActuelle = signal(new Date());

  vueActive = signal<'jour' | 'semaine'>('jour');

  chargement = signal(true);
  erreur = signal<string | null>(null);

  // 2026-09-03 : branché sur RendezVousService.listerParCabinet() (remplace
  // le tableau codé en dur). Type RendezVousAffichage (même type que
  // historique-rdv.ts, défini dans core/mocks/rendez-vous-mock-data.ts) et
  // non RendezVous brut : le modèle officiel (§5) ne porte aucune identité
  // patient, seul ce type dénormalisé ajoute nomPatientAffiche (optionnel,
  // dégradation propre si absent). Voir JOURNAL-MODIFICATIONS-PARTAGEES.md.
  rendezVous = signal<RendezVousAffichage[]>([]);

  rendezVousActif = signal<RendezVousAffichage | null>(null);

  dateFormatee = computed(() => {
    return new Intl.DateTimeFormat('fr-FR', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    }).format(this.dateActuelle());
  });

  nombreConfirmes = computed(() =>
    this.rendezVous().filter(r => r.statut === 'confirme').length
  );

  nombreAttente = computed(() =>
    this.rendezVous().filter(r => r.statut === 'en_attente').length
  );

  nombreAnnules = computed(() =>
    this.rendezVous().filter(r => r.statut === 'annule').length
  );

  ngOnInit(): void {
    if (!this.cabinetId) {
      this.chargement.set(false);
      this.erreur.set("Aucun cabinet rattaché à ce compte — impossible d'afficher l'agenda.");
      return;
    }

    this.rendezVousService.listerParCabinet(this.cabinetId).subscribe({
      next: (rendezVous) => {
        // Pas de cast : RendezVousAffichage n'ajoute qu'un champ optionnel
        // à RendezVous, donc un RendezVous[] est déjà assignable tel quel
        // (même remarque que historique-rdv.ts).
        this.rendezVous.set(rendezVous);
        this.chargement.set(false);
      },
      error: () => {
        this.chargement.set(false);
        this.erreur.set("Impossible de charger l'agenda pour le moment. Réessayez plus tard.");
      }
    });
  }

  ouvrirDetails(rdv: RendezVousAffichage): void {
    this.rendezVousActif.set(rdv);
  }

  fermerDetails(): void {
    this.rendezVousActif.set(null);
  }

  changerJour(direction: number): void {
    const nouvelleDate = new Date(this.dateActuelle());

    nouvelleDate.setDate(
      nouvelleDate.getDate() + direction
    );

    this.dateActuelle.set(nouvelleDate);
  }

  allerAujourdHui(): void {
    this.dateActuelle.set(new Date());
  }

  changerVue(vue: 'jour' | 'semaine'): void {
    this.vueActive.set(vue);
  }

  statutLabel(statut: StatutRendezVous): string {
    return LABEL_STATUT[statut];
  }

  /**
   * Nom du patient à afficher — nomPatientAffiche est optionnel (le
   * contrat réel de listerParCabinet() ne le garantit pas), dégradation
   * propre plutôt que d'afficher "undefined".
   */
  nomAffiche(rdv: RendezVousAffichage): string {
    return rdv.nomPatientAffiche ?? 'Patient';
  }

  /**
   * 2026-09-03 : duree n'existe pas sur RendezVous (§5) — dérivée ici de
   * heureDebut/heureFin plutôt que retirée, comme demandé. Chaîne vide
   * (masquée au template) si les heures sont absentes/mal formées ou si
   * l'écart est nul/négatif, plutôt que d'afficher une durée fausse.
   */
  duree(rdv: RendezVousAffichage): string {
    const [heureDebut, minuteDebut] = rdv.heureDebut.split(':').map(Number);
    const [heureFin, minuteFin] = rdv.heureFin.split(':').map(Number);

    if ([heureDebut, minuteDebut, heureFin, minuteFin].some(Number.isNaN)) {
      return '';
    }

    const minutes = (heureFin * 60 + minuteFin) - (heureDebut * 60 + minuteDebut);

    return minutes > 0 ? `${minutes} min` : '';
  }

  confirmerRendezVous(): void {
    this.changerStatut('confirme');
  }

  annulerRendezVous(): void {
    this.changerStatut('annule');
  }

  marquerHonore(): void {
    this.changerStatut('termine');
  }

  /**
   * 2026-09-03 : remplace les 3 méthodes qui mutaient rendezVousActif()
   * localement — appelle désormais le vrai
   * RendezVousService.mettreAJourStatut(id, statut) (PATCH /rendezvous/{id},
   * §8) et ne met à jour l'état local qu'après confirmation du serveur.
   */
  private changerStatut(statut: StatutRendezVous): void {
    const rdv = this.rendezVousActif();

    if (!rdv) {
      return;
    }

    this.rendezVousService.mettreAJourStatut(rdv.id, statut).subscribe({
      next: () => {
        this.rendezVous.update(liste =>
          liste.map(item =>
            item.id === rdv.id
              ? { ...item, statut }
              : item
          )
        );

        this.rendezVousActif.set({
          ...rdv,
          statut
        });
      },
      error: () => {
        this.erreur.set("Impossible de mettre à jour le statut pour le moment. Réessayez plus tard.");
      }
    });
  }
}
