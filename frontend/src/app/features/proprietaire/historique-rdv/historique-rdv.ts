import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { FormsModule } from '@angular/forms';

import { Auth } from '../../../core/services/auth';
import { RendezVousService } from '../../../core/services/rendez-vous';
import { messageErreurApi } from '../../../core/utils/api-errors';
import {
  bornesSelection,
  dateDansBornes,
  formaterDateFr,
  LIBELLE_PERIODE,
  ModePeriode,
  PeriodePredefinie,
} from '../../../core/utils/periode-filtre';
import { RendezVous, StatutRendezVous } from '../../../models/rendez-vous.model';
import { MenuProprietaire } from '../../../shared/components/menu-proprietaire/menu-proprietaire';

const TAILLE_PAGE = 8;

const LABEL_STATUT: Record<StatutRendezVous, string> = {
  libre: 'Libre',
  reserve: 'En attente',
  confirme: 'Confirmé',
  termine: 'Terminé',
  annule: 'Annulé',
  non_honore: 'Non honoré',
};

/**
 * Reproduction de la maquette `maquette/historique_des_rendez_vous_opticare_admin/`.
 * 2026-09-07 : le statut « Non présenté » de la maquette est de retour —
 * il correspond à la valeur `non_honore` du back-end réel (avant, ce
 * statut avait été retiré faute d'équivalent dans le modèle). Vocabulaire
 * complet aligné sur l'API : libre | reserve | confirme | annule |
 * termine | non_honore. `libre` est un état de créneau et n'apparaît
 * jamais dans cet historique. Le bouton « Exporter » télécharge un CSV
 * des lignes actuellement filtrées (fonctionnalité réelle).
 * 19/10/2026 : branché sur GET /cabinets/{id}/rdv ; colonne et filtre « Opticien(ne) » retirés (l'API ne renvoie pas d'opticien par RDV).
 * 21/10/2026 : filtres de période (aujourd'hui / cette semaine / ce mois / cette
 * année, date précise, plage de dates) — par défaut « cette semaine ». L'API
 * n'offre aucune plage de dates sur cette route (et son filtre `date` est cassé),
 * le filtrage agit donc dans le navigateur sur la liste complète (voir `periode-filtre.ts`).
 * Un bandeau de cartes de métriques résume la période et les statuts.
 */
@Component({
  selector: 'app-historique-rdv',
  imports: [MenuProprietaire, DatePipe, FormsModule],
  templateUrl: './historique-rdv.html',
  styleUrl: './historique-rdv.css',
})
export class HistoriqueRdv implements OnInit {
  private readonly auth = inject(Auth);
  private readonly rendezVousService = inject(RendezVousService);

  private readonly cabinetId = this.auth.utilisateur()?.cabinetId ?? null;

  readonly chargement = signal(true);
  readonly erreur = signal<string | null>(null);
  private readonly rendezVous = signal<RendezVous[]>([]);

  readonly labelStatut = LABEL_STATUT;
  // 'libre' volontairement absent : état de créneau, pas un rendez-vous.
  readonly statuts: StatutRendezVous[] = ['reserve', 'confirme', 'termine', 'annule', 'non_honore'];

  readonly texteRecherche = signal('');
  readonly filtreStatut = signal<StatutRendezVous | 'tous'>('tous');
  readonly pageActuelle = signal(1);

  /** Filtre de date. Par défaut : « cette semaine ». */
  readonly periodes: PeriodePredefinie[] = ['tous', 'jour', 'semaine', 'mois', 'annee'];
  readonly libellePeriode = LIBELLE_PERIODE;
  readonly modePeriode = signal<ModePeriode>('semaine');
  readonly datePrecise = signal('');
  readonly debutPlage = signal('');
  readonly finPlage = signal('');

  /** Aujourd'hui figé une fois : les bornes ne changent pas entre deux rendus. */
  private readonly aujourdHui = new Date();

  /** Bornes de la sélection de date, ou `null` pour « tous ». */
  readonly bornes = computed(() =>
    bornesSelection(
      this.modePeriode(),
      { date: this.datePrecise(), debut: this.debutPlage(), fin: this.finPlage() },
      this.aujourdHui,
    ),
  );

  readonly formaterDateFr = formaterDateFr;

  /** Vrai quand une période restreint la liste (≠ « tous »). */
  readonly periodeActive = computed(() => this.bornes() !== null);

  /** Libellé lisible de la sélection de date, pour le bandeau de cartes. */
  readonly libellePeriodeActive = computed(() => {
    const mode = this.modePeriode();
    if (mode === 'date') return this.datePrecise() ? `le ${formaterDateFr(this.datePrecise())}` : 'tous';
    if (mode === 'plage') {
      if (!this.debutPlage() || !this.finPlage()) return 'tous';
      return `du ${formaterDateFr(this.debutPlage())} au ${formaterDateFr(this.finPlage())}`;
    }
    return this.libellePeriode[mode];
  });

  /** Tous les rendez-vous du cabinet (hors créneaux « libre »). */
  private readonly tousLesRendezVous = computed(() => this.rendezVous().filter((r) => r.statut !== 'libre'));

  /** Vrai quand le cabinet n'a aucun rendez-vous (≠ aucun résultat pour les filtres). */
  readonly aucunRendezVous = computed(() => this.tousLesRendezVous().length === 0);

  /** Rendez-vous de la période sélectionnée (avant recherche et statut). */
  private readonly rendezVousPeriode = computed(() => {
    const bornes = this.bornes();
    return this.tousLesRendezVous().filter((r) => dateDansBornes(r.date, bornes));
  });

  /** Bandeau de métriques : effectifs par statut sur la période sélectionnée. */
  readonly statsPeriode = computed(() => {
    const periodes = this.rendezVousPeriode();
    const parStatut = (statut: StatutRendezVous) => periodes.filter((r) => r.statut === statut).length;
    return {
      total: periodes.length,
      enAttente: parStatut('reserve'),
      confirmes: parStatut('confirme'),
      termines: parStatut('termine'),
      annules: parStatut('annule'),
      nonHonores: parStatut('non_honore'),
    };
  });

  /** Rendez-vous affichés : période, puis recherche et statut, triés du plus récent au plus ancien. */
  private readonly rendezVousFiltres = computed(() => {
    const texte = this.texteRecherche().trim().toLowerCase();
    const statut = this.filtreStatut();

    return [...this.rendezVousPeriode()]
      // `date` (YYYY-MM-DD) puis heure : triables lexicalement, du plus récent au plus ancien.
      .sort((a, b) => b.date.localeCompare(a.date) || b.heureDebut.localeCompare(a.heureDebut))
      .filter((r) => {
        const nomPatient = (r.nomPatientAffiche ?? '').toLowerCase();
        const correspondTexte = !texte || nomPatient.includes(texte) || r.motif.toLowerCase().includes(texte);
        const correspondStatut = statut === 'tous' || r.statut === statut;
        return correspondTexte && correspondStatut;
      });
  });

  readonly nombrePages = computed(() => Math.max(1, Math.ceil(this.rendezVousFiltres().length / TAILLE_PAGE)));
  readonly pageAffichee = computed(() => Math.min(this.pageActuelle(), this.nombrePages()));
  readonly totalResultats = computed(() => this.rendezVousFiltres().length);

  readonly rendezVousPage = computed(() => {
    const debut = (this.pageAffichee() - 1) * TAILLE_PAGE;
    return this.rendezVousFiltres().slice(debut, debut + TAILLE_PAGE);
  });

  readonly numerosPages = computed(() => Array.from({ length: this.nombrePages() }, (_, i) => i + 1));

  ngOnInit(): void {
    if (!this.cabinetId) {
      this.chargement.set(false);
      this.erreur.set("Aucun cabinet rattaché à ce compte — impossible d'afficher l'historique.");
      return;
    }

    this.rendezVousService.listerParCabinet(this.cabinetId).subscribe({
      next: (rendezVous) => {
        this.rendezVous.set(rendezVous);
        this.chargement.set(false);
      },
      error: (e: HttpErrorResponse) => {
        this.chargement.set(false);
        const messageServeur = (e.error as { message?: string } | null)?.message;
        this.erreur.set(
          messageErreurApi(
            e,
            `Impossible de charger l'historique.${messageServeur ? ` Le serveur répond : ${messageServeur}` : ' Réessayez plus tard.'}`,
          ),
        );
      },
    });
  }

  allerPage(page: number): void {
    this.pageActuelle.set(Math.min(Math.max(1, page), this.nombrePages()));
  }

  /** Change la sélection de date (période prédéfinie, date précise ou plage). Filtre local. */
  changerMode(mode: ModePeriode): void {
    this.modePeriode.set(mode);
    this.pageActuelle.set(1);
  }

  /** Un changement de filtre invalide la pagination : retour en page 1. */
  changerPeriode(periode: PeriodePredefinie): void {
    this.modePeriode.set(periode);
    this.pageActuelle.set(1);
  }

  initiales(nom: string): string {
    return nom
      .split(' ')
      .map((mot) => mot.charAt(0))
      .slice(0, 2)
      .join('')
      .toUpperCase();
  }

  /** Export CSV des lignes filtrées — fonctionnalité réelle, purement côté client. */
  exporterCsv(): void {
    const lignes = [
      ['Patient', 'Téléphone', 'Motif', 'Date', 'Heure', 'Statut'],
      ...this.rendezVousFiltres().map((r) => [
        r.nomPatientAffiche ?? 'Patient',
        r.patientTelephone ?? '',
        r.motif,
        r.date.split('-').reverse().join('/'),
        `${r.heureDebut} - ${r.heureFin}`,
        this.labelStatut[r.statut],
      ]),
    ];
    const csv = lignes.map((ligne) => ligne.map((champ) => `"${champ.replace(/"/g, '""')}"`).join(';')).join('\n');
    const blob = new Blob([`\ufeff${csv}`], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const lien = document.createElement('a');
    lien.href = url;
    lien.download = `historique-rendez-vous-${new Date().toISOString().slice(0, 10)}.csv`;
    lien.click();
    URL.revokeObjectURL(url);
  }
}
