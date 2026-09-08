import { AfterViewInit, Component, computed, ElementRef, inject, OnDestroy, OnInit, signal, ViewChild } from '@angular/core';
import { DecimalPipe } from '@angular/common';
import { RouterLink } from '@angular/router';

import { Cabinet as CabinetService } from '../../../core/services/cabinet';
import { Cabinet as CabinetModel } from '../../../models/cabinet.model';

/** Nombre de cabinets mis en avant dans la section « Nos cabinets partenaires ». */
const NB_CABINETS_VITRINE = 6;
/** Nombre de cartes visibles avant de cliquer sur « Voir plus ». */
const NB_CABINETS_VITRINE_INITIAL = 3;

type IdSection = 'specialites' | 'cabinets-partenaires';

/**
 * Reproduction fidèle de la maquette `maquette/accueil_plateforme/` (voir
 * DESIGN.md + code.html + screen.png) — page marketing d'accueil, distincte
 * d'un écran de recherche/filtrage. Seule la section « Nos cabinets
 * partenaires » consomme une donnée réelle (cabinetService.listerPublics()),
 * le reste (spécialités, proposition de valeur, avis, CTA) est le contenu
 * éditorial de la maquette — au même titre que les visuels marketing déjà
 * en dur dans les écrans auth/choix-role, connexion, etc.
 */
@Component({
  selector: 'app-accueil',
  imports: [DecimalPipe, RouterLink],
  templateUrl: './accueil.html',
  styleUrl: './accueil.css',
})
export class Accueil implements OnInit, AfterViewInit, OnDestroy {
  private readonly cabinetService = inject(CabinetService);

  @ViewChild('specialitesSection') private specialitesSection?: ElementRef<HTMLElement>;
  @ViewChild('cabinetsSection') private cabinetsSection?: ElementRef<HTMLElement>;
  private observateurSections?: IntersectionObserver;

  /** Section actuellement visible sous la navbar — colore le lien de nav correspondant (« scrollspy »). */
  readonly sectionActive = signal<IdSection | null>(null);

  readonly chargementCabinets = signal(true);
  private readonly cabinets = signal<CabinetModel[]>([]);

  /** false = seules les 3 premières cartes sont affichées, jusqu'au clic sur « Voir plus ». */
  readonly tousLesCabinetsVisibles = signal(false);

  /** Les mieux notés en premier — cohérent avec « nos meilleurs spécialistes » (sous-titre de la maquette). */
  private readonly cabinetsVitrine = computed(() =>
    [...this.cabinets()].sort((a, b) => b.noteMoyenne - a.noteMoyenne).slice(0, NB_CABINETS_VITRINE),
  );

  readonly cabinetsAffiches = computed(() =>
    this.tousLesCabinetsVisibles() ? this.cabinetsVitrine() : this.cabinetsVitrine().slice(0, NB_CABINETS_VITRINE_INITIAL),
  );

  /** Le bouton « Voir plus » n'a de sens que s'il reste des cartes cachées. */
  readonly aPlusDeCabinetsAVoir = computed(
    () => !this.tousLesCabinetsVisibles() && this.cabinetsVitrine().length > NB_CABINETS_VITRINE_INITIAL,
  );

  ngOnInit(): void {
    this.cabinetService.listerPublics().subscribe({
      next: (cabinets) => {
        this.cabinets.set(cabinets);
        this.chargementCabinets.set(false);
      },
      error: () => this.chargementCabinets.set(false),
    });
  }

  ngAfterViewInit(): void {
    // rootMargin resserre la zone de détection sous la navbar fixe (80px) et
    // s'arrête avant le bas du viewport (-60%) : la section suivante ne
    // s'active pas dès qu'elle pointe le bout de son nez en bas d'écran.
    this.observateurSections = new IntersectionObserver(
      (entrees) => {
        for (const entree of entrees) {
          if (entree.isIntersecting) {
            this.sectionActive.set((entree.target as HTMLElement).id as IdSection);
          }
        }
      },
      { rootMargin: '-80px 0px -60% 0px', threshold: 0 },
    );

    if (this.specialitesSection) this.observateurSections.observe(this.specialitesSection.nativeElement);
    if (this.cabinetsSection) this.observateurSections.observe(this.cabinetsSection.nativeElement);
  }

  ngOnDestroy(): void {
    this.observateurSections?.disconnect();
  }
}
