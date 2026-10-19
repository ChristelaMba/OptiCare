
import {
  Component,
  OnInit,
  inject,
  signal,
  computed
} from '@angular/core';

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
  imports: [CommonModule, RouterLink],
  templateUrl: './mes-rendez-vous.html',
  styleUrl: './mes-rendez-vous.css'
})

export class MesRendezVous implements OnInit {

  private readonly rdvService = inject(RendezVousService);
  private readonly auth = inject(Auth);

  chargement = signal(true);
  erreur = signal<string | null>(null);
  rendezVous = signal<RendezVous[]>([]);
  ongletActif = signal<Onglet>('a-venir');
  recherche = signal('');
  filtreStatut = signal<StatutRendezVous | 'tous'>('tous');
  annulationEnCours = signal<number | string | null>(null);

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

  private obtenirDate(rdv: RendezVous): Date | null {
    const date = new Date(rdv.date);

    if (Number.isNaN(date.getTime())) {
      return null;
    }

    return date;
  }

  private estAVenir(rdv: RendezVous): boolean {
    const dateRdv = this.obtenirDate(rdv);

    if (!dateRdv) {
      return false;
    }

    const aujourdhui = new Date();
    aujourdhui.setHours(0, 0, 0, 0);
    dateRdv.setHours(0, 0, 0, 0);

    return (
      dateRdv >= aujourdhui &&
      rdv.statut !== 'annule' &&
      rdv.statut !== 'non_honore' &&
      rdv.statut !== 'termine'
    );
  }

  private readonly rendezVousReels = computed(() =>
    this.rendezVous().filter(
      rdv => rdv.statut !== 'libre'
    )
  );

  rendezVousAVenir = computed(() =>
    this.rendezVousReels().filter(
      rdv => this.estAVenir(rdv)
    )
  );

  rendezVousPasses = computed(() =>
    this.rendezVousReels().filter(
      rdv => !this.estAVenir(rdv)
    )
  );

  rendezVousFiltres = computed(() => {
    const source =
      this.ongletActif() === 'a-venir'
        ? this.rendezVousAVenir()
        : this.rendezVousPasses();

    const texte = this.recherche().trim().toLowerCase();
    const statut = this.filtreStatut();

    return source.filter(rdv => {
      const cabinet = rdv.cabinetNom ?? '';
      const motif = rdv.motif ?? '';
      const praticien = rdv.praticienNom ?? '';

      const correspondTexte =
        !texte ||
        cabinet.toLowerCase().includes(texte) ||
        motif.toLowerCase().includes(texte) ||
        praticien.toLowerCase().includes(texte);

      const correspondStatut =
        statut === 'tous' || rdv.statut === statut;

      return correspondTexte && correspondStatut;
    });
  });

  listeVide = computed(() =>
    !this.chargement() &&
    this.rendezVousFiltres().length === 0
  );

  ngOnInit(): void {
    this.chargerRendezVous();
  }

  chargerRendezVous(): void {
    this.chargement.set(true);
    this.erreur.set(null);

    const patientId = this.auth.utilisateur()?.id;

    if (patientId == null) {
      this.rendezVous.set([]);
      this.chargement.set(false);
      this.erreur.set(
        'Impossible de retrouver votre compte patient. Veuillez vous reconnecter.'
      );
      return;
    }

    this.rdvService.getMesRendezVous(patientId).subscribe({
      next: data => {
        this.rendezVous.set(data ?? []);
        this.chargement.set(false);
      },
      error: err => {
        console.error(
          'Erreur lors du chargement des rendez-vous :',
          err
        );

        this.rendezVous.set([]);
        this.erreur.set(
          err.status === 401
            ? 'Votre session a expiré. Veuillez vous reconnecter.'
            : 'Impossible de charger vos rendez-vous. Veuillez réessayer.'
        );
        this.chargement.set(false);
      }
    });
  }

  changerOnglet(onglet: Onglet): void {
    this.ongletActif.set(onglet);
  }

  annulerRendezVous(rdv: RendezVous): void {
    if (
      rdv.statut !== 'confirme' &&
      rdv.statut !== 'reserve'
    ) {
      return;
    }

    if (this.annulationEnCours() !== null) {
      return;
    }

    const dateRdv = this.obtenirDate(rdv);

    if (!dateRdv || dateRdv.getTime() <= Date.now()) {
      this.erreur.set(
        'Ce rendez-vous ne peut plus être annulé depuis cette page.'
      );
      return;
    }

    const confirmation = window.confirm(
      `Voulez-vous vraiment annuler le rendez-vous du ${dateRdv.toLocaleDateString('fr-FR')} ?`
    );

    if (!confirmation) {
      return;
    }

    this.annulationEnCours.set(rdv.id);

    this.rdvService.annulerRendezVous(rdv.id).subscribe({
      next: () => {
        this.rendezVous.update(liste =>
          liste.map(r =>
            r.id === rdv.id
              ? { ...r, statut: 'annule' }
              : r
          )
        );

        this.annulationEnCours.set(null);
      },
      error: err => {
        console.error(
          'Erreur lors de l’annulation du rendez-vous :',
          err
        );

        this.erreur.set(
          err.status === 401
            ? 'Votre session a expiré. Veuillez vous reconnecter.'
            : err.status === 403
              ? 'Vous n’êtes pas autorisé à annuler ce rendez-vous.'
              : err.status === 404
                ? 'Ce rendez-vous est introuvable.'
                : err.status === 500
                  ? 'Le serveur rencontre un problème. Réessayez plus tard.'
                  : 'Impossible d’annuler ce rendez-vous. Veuillez réessayer.'
        );

        this.annulationEnCours.set(null);
      }
    });
  }

  libelleStatut(statut: StatutRendezVous): string {
    const libelles: Record<StatutRendezVous, string> = {
      libre: 'Libre',
      reserve: 'En attente',
      confirme: 'Confirmé',
      annule: 'Annulé',
      termine: 'Terminé',
      non_honore: 'Non honoré'
    };

    return libelles[statut] ?? 'Inconnu';
  }
}
