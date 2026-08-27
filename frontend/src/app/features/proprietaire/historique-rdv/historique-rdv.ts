import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';

import { Auth } from '../../../core/services/auth';
import { RendezVous as RendezVousService } from '../../../core/services/rendez-vous';
import { RendezVousAffichage } from '../../../core/mocks/rendez-vous-mock-data';
import { StatutRendezVous } from '../../../models/rendez-vous.model';

const TAILLE_PAGE = 8;

const LABEL_STATUT: Record<StatutRendezVous, string> = {
  enAttente: 'En attente',
  confirme: 'Confirmé',
  honore: 'Honoré',
  annule: 'Annulé',
};

/**
 * Reproduction de la maquette `maquette/historique_des_rendez_vous_opticare_admin/`.
 * Écart avec la maquette : le statut « Non présenté » qu'elle affiche
 * n'existe pas dans le modèle RendezVous officiel (§5 du cahier des
 * charges : enAttente | confirme | annule | honore) — remplacé par les 4
 * statuts réels. Le bouton « Exporter » télécharge un CSV des lignes
 * actuellement filtrées (fonctionnalité réelle, pas un simple visuel).
 */
@Component({
  selector: 'app-historique-rdv',
  imports: [DatePipe, FormsModule, RouterLink],
  templateUrl: './historique-rdv.html',
  styleUrl: './historique-rdv.css',
})
export class HistoriqueRdv implements OnInit {
  private readonly auth = inject(Auth);
  private readonly rendezVousService = inject(RendezVousService);

  private readonly cabinetId = this.auth.utilisateur()?.cabinetId ?? null;

  readonly chargement = signal(true);
  readonly erreur = signal<string | null>(null);
  private readonly rendezVous = signal<RendezVousAffichage[]>([]);

  readonly labelStatut = LABEL_STATUT;
  readonly statuts: StatutRendezVous[] = ['enAttente', 'confirme', 'honore', 'annule'];

  readonly texteRecherche = signal('');
  readonly filtreStatut = signal<StatutRendezVous | 'tous'>('tous');
  readonly filtreOpticien = signal<string>('tous');
  readonly pageActuelle = signal(1);

  readonly opticiensDisponibles = computed(() =>
    [...new Set(this.rendezVous().map((r) => r.opticienAffiche))].sort((a, b) => a.localeCompare(b)),
  );

  private readonly rendezVousFiltres = computed(() => {
    const texte = this.texteRecherche().trim().toLowerCase();
    const statut = this.filtreStatut();
    const opticien = this.filtreOpticien();

    return [...this.rendezVous()]
      .sort((a, b) => b.date.getTime() - a.date.getTime())
      .filter((r) => {
        const correspondTexte = !texte || r.nomPatientAffiche.toLowerCase().includes(texte) || r.motifAffiche.toLowerCase().includes(texte);
        const correspondStatut = statut === 'tous' || r.statut === statut;
        const correspondOpticien = opticien === 'tous' || r.opticienAffiche === opticien;
        return correspondTexte && correspondStatut && correspondOpticien;
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
        this.rendezVous.set(rendezVous as RendezVousAffichage[]);
        this.chargement.set(false);
      },
      error: () => {
        this.chargement.set(false);
        this.erreur.set("Impossible de charger l'historique pour le moment. Réessayez plus tard.");
      },
    });
  }

  allerPage(page: number): void {
    this.pageActuelle.set(Math.min(Math.max(1, page), this.nombrePages()));
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
      ['Patient', 'Motif', 'Date', 'Heure', 'Statut', 'Opticien(ne)'],
      ...this.rendezVousFiltres().map((r) => [
        r.nomPatientAffiche,
        r.motifAffiche,
        r.date.toLocaleDateString('fr-FR'),
        r.heure,
        this.labelStatut[r.statut],
        r.opticienAffiche,
      ]),
    ];
    const csv = lignes.map((ligne) => ligne.map((champ) => `"${champ.replace(/"/g, '""')}"`).join(';')).join('\n');
    const blob = new Blob([`﻿${csv}`], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const lien = document.createElement('a');
    lien.href = url;
    lien.download = `historique-rendez-vous-${new Date().toISOString().slice(0, 10)}.csv`;
    lien.click();
    URL.revokeObjectURL(url);
  }
}
