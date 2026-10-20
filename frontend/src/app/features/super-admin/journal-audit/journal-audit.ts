import { DatePipe, KeyValuePipe } from '@angular/common';
import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';

import { SuperAdminDemo } from '../../../core/services/super-admin-demo';
import {
  EvenementAudit,
  LIBELLES_SEVERITE,
  LIBELLES_TYPE_EVENEMENT,
  SeveriteAudit,
  TypeEvenementAudit,
} from '../../../models/super-admin.model';
import { libelleRole } from '../../../models/utilisateur.model';

type FiltreSeverite = SeveriteAudit | 'tous';
type FiltreType = TypeEvenementAudit | 'tous';

const TAILLE_PAGE = 10;

/**
 * Journal d'audit (`/admin/audit-logs`).
 *
 * Données **factices** fournies par `SuperAdminDemo` (aucune route serveur
 * pour cet écran — voir le service). Filtres par période, sévérité et type
 * d'événement, appliqués côté client.
 */
@Component({
  selector: 'app-journal-audit',
  imports: [DatePipe, KeyValuePipe, FormsModule],
  templateUrl: './journal-audit.html',
  styleUrl: './journal-audit.css',
})
export class JournalAudit implements OnInit {
  private readonly demo = inject(SuperAdminDemo);

  readonly chargement = signal(true);
  readonly erreur = signal<string | null>(null);
  private readonly evenements = signal<EvenementAudit[]>([]);

  readonly texteRecherche = signal('');
  readonly filtreSeverite = signal<FiltreSeverite>('tous');
  readonly filtreType = signal<FiltreType>('tous');
  /** Bornes de dates (chaînes 'AAAA-MM-JJ' du champ `date`). */
  readonly dateDebut = signal('');
  readonly dateFin = signal('');
  readonly pageActuelle = signal(1);

  readonly libelleSeverite = LIBELLES_SEVERITE;
  readonly libelleType = LIBELLES_TYPE_EVENEMENT;
  readonly severites: SeveriteAudit[] = ['info', 'warning', 'critique'];

  /** Nombre d'événements critiques (affiché dans l'en-tête, comme la maquette). */
  readonly totalCritiques = computed(() => this.evenements().filter((e) => e.severite === 'critique').length);

  private readonly evenementsFiltres = computed(() => {
    const texte = this.texteRecherche().trim().toLowerCase();
    const severite = this.filtreSeverite();
    const type = this.filtreType();
    const debut = this.dateDebut() ? new Date(`${this.dateDebut()}T00:00:00`) : null;
    const fin = this.dateFin() ? new Date(`${this.dateFin()}T23:59:59`) : null;

    return this.evenements()
      .filter((e) => {
        const correspondTexte =
          !texte ||
          e.description.toLowerCase().includes(texte) ||
          e.utilisateur.toLowerCase().includes(texte) ||
          e.ressource.toLowerCase().includes(texte) ||
          e.adresseIp.includes(texte);
        const correspondSeverite = severite === 'tous' || e.severite === severite;
        const correspondType = type === 'tous' || e.type === type;
        const correspondDebut = !debut || e.horodatage >= debut;
        const correspondFin = !fin || e.horodatage <= fin;
        return correspondTexte && correspondSeverite && correspondType && correspondDebut && correspondFin;
      })
      .sort((a, b) => b.horodatage.getTime() - a.horodatage.getTime());
  });

  readonly nombrePages = computed(() => Math.max(1, Math.ceil(this.evenementsFiltres().length / TAILLE_PAGE)));
  readonly pageAffichee = computed(() => Math.min(this.pageActuelle(), this.nombrePages()));

  readonly evenementsPage = computed(() => {
    const debut = (this.pageAffichee() - 1) * TAILLE_PAGE;
    return this.evenementsFiltres().slice(debut, debut + TAILLE_PAGE);
  });

  readonly numerosPages = computed(() => Array.from({ length: this.nombrePages() }, (_, i) => i + 1));
  readonly totalResultats = computed(() => this.evenementsFiltres().length);
  readonly totalEvenements = computed(() => this.evenements().length);

  ngOnInit(): void {
    this.demo.listerEvenementsAudit().subscribe({
      next: (evenements) => {
        this.evenements.set(evenements);
        this.chargement.set(false);
      },
      error: () => {
        this.chargement.set(false);
        this.erreur.set("Impossible de charger le journal d'audit.");
      },
    });
  }

  reinitialiserFiltres(): void {
    this.texteRecherche.set('');
    this.filtreSeverite.set('tous');
    this.filtreType.set('tous');
    this.dateDebut.set('');
    this.dateFin.set('');
    this.pageActuelle.set(1);
  }

  allerPage(page: number): void {
    this.pageActuelle.set(Math.min(Math.max(1, page), this.nombrePages()));
  }

  readonly filtreActif = computed(
    () =>
      !!this.texteRecherche() ||
      this.filtreSeverite() !== 'tous' ||
      this.filtreType() !== 'tous' ||
      !!this.dateDebut() ||
      !!this.dateFin(),
  );

  /** Classe de la pastille de sévérité (badge de tableau). */
  severiteClasse(severite: SeveriteAudit): string {
    const classes: Record<SeveriteAudit, string> = {
      info: 'bg-info/15 text-info',
      warning: 'bg-warning/20 text-warning',
      critique: 'bg-error/15 text-error',
    };
    return classes[severite];
  }

  /** Couleur du point de sévérité. */
  severitePoint(severite: SeveriteAudit): string {
    const classes: Record<SeveriteAudit, string> = {
      info: 'bg-info',
      warning: 'bg-warning',
      critique: 'bg-error',
    };
    return classes[severite];
  }

  /** Libellé du rôle de l'utilisateur initiateur (pastille discrète). */
  readonly libelleRole = libelleRole;
}
