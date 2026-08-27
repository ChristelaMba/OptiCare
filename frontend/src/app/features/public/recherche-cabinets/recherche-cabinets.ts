import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { DecimalPipe, Location } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';

import { Cabinet as CabinetService } from '../../../core/services/cabinet';
import { Cabinet as CabinetModel } from '../../../models/cabinet.model';

type OptionTri = 'recommandes' | 'mieux-notes' | 'alphabetique';

const TAILLE_PAGE = 6;

/**
 * Reproduction de la maquette `maquette/recherche_de_cabinets_liste_tendue/`
 * (annuaire des cabinets avec filtres). Deux sections de la maquette n'ont
 * pas d'équivalent dans le modèle `Cabinet` (§5 du cahier des charges) et
 * ont donc été omises plutôt qu'inventées : le filtre « Services » (aucun
 * champ services sur Cabinet) et le filtre « Disponibilité » (nécessiterait
 * les créneaux de RendezVous, hors périmètre). Le bouton favori (icône
 * cœur) a été omis pour la même raison : aucun service de favoris.
 */
@Component({
  selector: 'app-recherche-cabinets',
  imports: [DecimalPipe, FormsModule, RouterLink],
  templateUrl: './recherche-cabinets.html',
  styleUrl: './recherche-cabinets.css',
})
export class RechercheCabinets implements OnInit {
  private readonly cabinetService = inject(CabinetService);
  private readonly location = inject(Location);
  private readonly router = inject(Router);

  readonly chargement = signal(true);
  readonly erreur = signal<string | null>(null);
  private readonly cabinets = signal<CabinetModel[]>([]);

  readonly vue = signal<'grille' | 'carte'>('grille');
  readonly texteRecherche = signal('');
  readonly quartiersSelectionnes = signal<Set<string>>(new Set());
  readonly noteMinFiltre = signal(0);
  readonly tri = signal<OptionTri>('recommandes');
  readonly pageActuelle = signal(1);

  readonly quartiersDisponibles = computed(() =>
    [...new Set(this.cabinets().map((c) => c.quartier))].sort((a, b) => a.localeCompare(b)),
  );

  private readonly cabinetsFiltres = computed(() => {
    const texte = this.texteRecherche().trim().toLowerCase();
    const quartiers = this.quartiersSelectionnes();
    const noteMin = this.noteMinFiltre();

    return this.cabinets().filter((cabinet) => {
      const correspondTexte =
        !texte || cabinet.nom.toLowerCase().includes(texte) || cabinet.quartier.toLowerCase().includes(texte);
      const correspondQuartier = quartiers.size === 0 || quartiers.has(cabinet.quartier);
      const correspondNote = cabinet.noteMoyenne >= noteMin;
      return correspondTexte && correspondQuartier && correspondNote;
    });
  });

  readonly cabinetsTries = computed(() => {
    const tri = this.tri();
    return [...this.cabinetsFiltres()].sort((a, b) => {
      if (tri === 'alphabetique') return a.nom.localeCompare(b.nom);
      if (tri === 'mieux-notes') return b.noteMoyenne - a.noteMoyenne;
      // « Recommandés » : Premium en premier, puis par note décroissante.
      if (a.abonnementPremium !== b.abonnementPremium) return a.abonnementPremium ? -1 : 1;
      return b.noteMoyenne - a.noteMoyenne;
    });
  });

  readonly nombrePages = computed(() => Math.max(1, Math.ceil(this.cabinetsTries().length / TAILLE_PAGE)));

  /** Page réellement affichée — se rabat sur la dernière page valide si les filtres réduisent le nombre de résultats. */
  readonly pageAffichee = computed(() => Math.min(this.pageActuelle(), this.nombrePages()));

  readonly cabinetsPage = computed(() => {
    const debut = (this.pageAffichee() - 1) * TAILLE_PAGE;
    return this.cabinetsTries().slice(debut, debut + TAILLE_PAGE);
  });

  readonly numerosPages = computed(() => Array.from({ length: this.nombrePages() }, (_, i) => i + 1));

  ngOnInit(): void {
    this.cabinetService.listerPublics().subscribe({
      next: (cabinets) => {
        this.cabinets.set(cabinets);
        this.chargement.set(false);
      },
      error: () => {
        this.chargement.set(false);
        this.erreur.set('Impossible de charger les cabinets pour le moment. Réessayez plus tard.');
      },
    });
  }

  toggleQuartier(quartier: string): void {
    const selection = new Set(this.quartiersSelectionnes());
    selection.has(quartier) ? selection.delete(quartier) : selection.add(quartier);
    this.quartiersSelectionnes.set(selection);
    this.pageActuelle.set(1);
  }

  setNoteMin(valeur: number): void {
    this.noteMinFiltre.set(valeur);
    this.pageActuelle.set(1);
  }

  setTri(valeur: string): void {
    this.tri.set(valeur as OptionTri);
    this.pageActuelle.set(1);
  }

  reinitialiserFiltres(): void {
    this.texteRecherche.set('');
    this.quartiersSelectionnes.set(new Set());
    this.noteMinFiltre.set(0);
    this.tri.set('recommandes');
    this.pageActuelle.set(1);
  }

  allerPage(page: number): void {
    this.pageActuelle.set(Math.min(Math.max(1, page), this.nombrePages()));
  }

  /**
   * Retour à l'écran précédent. `window.history.length <= 1` signifie qu'on
   * est arrivé directement sur cette URL (lien externe, rechargement) : pas
   * d'historique vers lequel revenir, on retombe sur l'accueil plutôt que de
   * laisser le bouton ne rien faire.
   */
  retour(): void {
    if (window.history.length > 1) {
      this.location.back();
    } else {
      this.router.navigateByUrl('/');
    }
  }
}
