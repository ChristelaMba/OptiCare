import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';

import { Auth } from '../../../core/services/auth';
import { RendezVousService } from '../../../core/services/rendez-vous';
import {
  RendezVous,
  StatutRendezVous
} from '../../../models/rendez-vous.model';

type Onglet = 'a-venir' | 'passes';

@Component({
  selector: 'app-mes-rendez-vous',
  standalone: true,
  imports: [
    CommonModule,
    RouterLink
],
  templateUrl: './mes-rendez-vous.html',
  styleUrl: './mes-rendez-vous.css'
})
export class MesRendezVous implements OnInit {

  private readonly rdvService = inject(RendezVousService);
  private readonly auth = inject(Auth);

  /* =====================================================
     ÉTATS
  ===================================================== */

  chargement = signal(true);

  erreur = signal<string | null>(null);

  rendezVous = signal<RendezVous[]>([]);

  ongletActif = signal<Onglet>('a-venir');

  recherche = signal('');

  filtreStatut =
    signal<StatutRendezVous | 'tous'>('tous');

  /* =====================================================
     MENU MOBILE
  ===================================================== */

  menuOuvert = signal(false);

  ouvrirMenu(): void {
    this.menuOuvert.set(true);
  }

  fermerMenu(): void {
    this.menuOuvert.set(false);
  }

  toggleMenu(): void {
    this.menuOuvert.update(ouvert => !ouvert);
  }

  /* =====================================================
     RENDEZ-VOUS
  ===================================================== */

  private estAVenir(rdv: RendezVous): boolean {

    const aujourdhui = new Date();

    aujourdhui.setHours(0, 0, 0, 0);

    return (
      new Date(rdv.date) >= aujourdhui &&
      rdv.statut !== 'annule' &&
      rdv.statut !== 'non_honore'
    );
  }

  /**
   * 'libre' est un état de créneau, pas un rendez-vous réel du patient :
   * on ne l'affiche jamais dans cet écran (voir StatutRendezVous). Le
   * mock peut en renvoyer pour exercer la valeur — on les écarte ici.
   */
  private readonly rendezVousReels = computed(() =>
    this.rendezVous().filter(rdv => rdv.statut !== 'libre')
  );

  rendezVousAVenir = computed(() =>
    this.rendezVousReels().filter(rdv =>
      this.estAVenir(rdv)
    )
  );

  rendezVousPasses = computed(() =>
    this.rendezVousReels().filter(rdv =>
      !this.estAVenir(rdv)
    )
  );

  rendezVousFiltres = computed(() => {

    const source =
      this.ongletActif() === 'a-venir'
        ? this.rendezVousAVenir()
        : this.rendezVousPasses();

    const texte =
      this.recherche().trim().toLowerCase();

    const statut =
      this.filtreStatut();

    return source.filter(rdv => {

      const correspondTexte =
        !texte ||
        rdv.cabinetNom
          .toLowerCase()
          .includes(texte) ||
        rdv.motif
          .toLowerCase()
          .includes(texte) ||
        (
          rdv.praticienNom
            ?.toLowerCase()
            .includes(texte) ?? false
        );

      const correspondStatut =
        statut === 'tous' ||
        rdv.statut === statut;

      return (
        correspondTexte &&
        correspondStatut
      );
    });
  });

  listeVide = computed(() =>
    !this.chargement() &&
    this.rendezVousFiltres().length === 0
  );

  /* =====================================================
     INIT
  ===================================================== */

  ngOnInit(): void {
    this.chargerRendezVous();
  }

  /* =====================================================
     CHARGEMENT
  ===================================================== */

  chargerRendezVous(): void {

    this.chargement.set(true);
    this.erreur.set(null);

    // GET /patients/{patientId}/rdv réel — l'id attendu est celui de la
    // table `patients` (`user.patient.id` du login), PAS l'id utilisateur :
    // avec ce dernier la liste est toujours vide. Il manque après une
    // inscription (le register ne le renvoie pas) et sur les sessions
    // ouvertes avant le 19/10/2026 : une reconnexion le fournit.
    const patientId = this.auth.utilisateur()?.patientId;

    if (!patientId) {
      this.chargement.set(false);
      this.erreur.set("Votre profil patient n'est pas encore chargé. Déconnectez-vous puis reconnectez-vous pour afficher vos rendez-vous.");
      return;
    }

    this.rdvService.getMesRendezVous(patientId)
      .subscribe({

        next: (data) => {

          this.rendezVous.set(data);

          this.chargement.set(false);
        },

        error: () => {

          this.erreur.set(
            'Impossible de charger vos rendez-vous.'
          );

          this.chargement.set(false);
        }

      });
  }

  /* =====================================================
     ONGLET
  ===================================================== */

  /** Recherche de l'adresse renvoyée par l'API (`cabinet.adresse`, `cabinet.ville`) dans Google Maps. */
  lienEmplacement(adresse: string): string {
    return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(adresse)}`;
  }

  changerOnglet(onglet: Onglet): void {

    this.ongletActif.set(onglet);

  }

  /* =====================================================
     ANNULATION
  ===================================================== */

  annulerRendezVous(
    rdv: RendezVous
  ): void {

    this.rdvService
      .annulerRendezVous(rdv.id)
      .subscribe({

        next: () => {

          this.rendezVous.update(liste =>
            liste.map(r =>
              r.id === rdv.id
                ? {
                    ...r,
                    statut: 'annule' as const
                  }
                : r
            )
          );

        },

        error: () => {

          this.erreur.set(
            "Impossible d'annuler ce rendez-vous."
          );

        }

      });
  }

  /* =====================================================
     LIBELLÉ STATUT
  ===================================================== */

  libelleStatut(
    statut: StatutRendezVous
  ): string {

    const libelles:
      Record<StatutRendezVous, string> = {

      libre: 'Libre',

      reserve: 'En attente',

      confirme: 'Confirmé',

      annule: 'Annulé',

      termine: 'Terminé',

      non_honore: 'Non honoré'

    };

    return libelles[statut];
  }
}