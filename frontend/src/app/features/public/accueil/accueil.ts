import { AfterViewInit, Component, computed, ElementRef, HostListener, inject, OnDestroy, OnInit, signal, ViewChild } from '@angular/core';
import { DecimalPipe } from '@angular/common';
import { RouterLink } from '@angular/router';
import { ActionsSession } from '../actions-session/actions-session';
import { BoutonDeconnexion } from '../../../shared/components/bouton-deconnexion/bouton-deconnexion';
import { LogoPiedDePage } from '../../../shared/components/logo-pied-de-page/logo-pied-de-page';
import { catchError, forkJoin, of } from 'rxjs';

import { Auth } from '../../../core/services/auth';
import { Avis as AvisService } from '../../../core/services/avis';
import { Cabinet as CabinetService } from '../../../core/services/cabinet';
import { Cabinet as CabinetModel } from '../../../models/cabinet.model';
import { LogoOpticare } from '../../../shared/components/logo-opticare/logo-opticare';

/** Nombre de cabinets mis en avant dans la section « Nos cabinets partenaires ». */
const NB_CABINETS_VITRINE = 6;
/** Nombre de cartes visibles avant de cliquer sur « Voir plus ». */
const NB_CABINETS_VITRINE_INITIAL = 3;

/** Nombre d'avis réels affichés dans « Avis de nos patients ». */
const NB_AVIS_VITRINE = 3;

/** Avis prêt à afficher (nom abrégé, cabinet concerné). */
interface AvisAccueil {
  id: string;
  note: number;
  commentaire: string;
  auteur: string;
  cabinetNom: string;
  date: string;
}

type IdSection = 'specialites' | 'cabinets-partenaires';

/**
 * Reproduction fidèle de la maquette `maquette/accueil_plateforme/` (voir
 * DESIGN.md + code.html + screen.png) — page marketing d'accueil, distincte
 * d'un écran de recherche/filtrage. Seule la section « Nos cabinets
 * partenaires » consomme une donnée réelle (cabinetService.listerPublics()),
 * les avis viennent de GET /cabinets/{id}/avis (section masquée s'il n'y en a aucun) ;
 * le reste (spécialités, proposition de valeur, CTA) est le contenu
 * éditorial de la maquette — au même titre que les visuels marketing déjà
 * en dur dans les écrans auth/choix-role, connexion, etc.
 */
@Component({
  selector: 'app-accueil',
  imports: [LogoOpticare, DecimalPipe, RouterLink, ActionsSession, BoutonDeconnexion, LogoPiedDePage],
  templateUrl: './accueil.html',
  styleUrl: './accueil.css',
})
export class Accueil implements OnInit, AfterViewInit, OnDestroy {
  private readonly cabinetService = inject(CabinetService);
  private readonly avisService = inject(AvisService);
  private readonly auth = inject(Auth);

  /** Menu de navigation mobile (< md) : ouvert/fermé par le bouton menu, fermé par Échap ou un clic sur un lien. */
  readonly menuMobileOuvert = signal(false);

  readonly utilisateurConnecte = computed(() => (this.auth.estConnecte() ? this.auth.utilisateur() : null));

  readonly espaceUtilisateur = computed(() => {
    const u = this.utilisateurConnecte();
    return u ? this.auth.routeParDefaut(u.role) : '/';
  });

  basculerMenuMobile(): void {
    this.menuMobileOuvert.update((ouvert) => !ouvert);
  }

  fermerMenuMobile(): void {
    this.menuMobileOuvert.set(false);
  }

  @HostListener('document:keydown.escape')
  fermerMenuMobileAvecEchap(): void {
    this.menuMobileOuvert.set(false);
  }

  /**
   * Un toucher/ clic n'importe où ailleurs sur la page referme le menu mobile.
   * Le bouton hamburger et le panneau du menu sont exclus (via `closest`) : sans
   * cela, ouvrir le menu par le bouton déclencherait aussitôt ce même écouteur
   * global et le refermerait instantanément.
   */
  @HostListener('document:click', ['$event'])
  fermerMenuMobileAuClicExterieur(evenement: MouseEvent): void {
    if (!this.menuMobileOuvert()) {
      return;
    }

    const cible = evenement.target as HTMLElement | null;
    if (cible?.closest('#menu-mobile, [aria-controls="menu-mobile"]')) {
      return;
    }

    this.menuMobileOuvert.set(false);
  }

  /**
   * Avis réels (`GET /cabinets/{id}/avis`). La section « Avis de nos patients »
   * n'est affichée que si cette liste n'est pas vide : plus de témoignages inventés.
   */
  readonly avisReels = signal<AvisAccueil[]>([]);

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
        this.chargerAvis(cabinets);
      },
      error: () => this.chargementCabinets.set(false),
    });
  }

  /** « Quartier, Ville » — la virgule n'apparaît que si les deux existent. */
  localisation(cabinet: CabinetModel): string {
    return [cabinet.quartier, cabinet.ville].filter((partie) => !!partie?.trim()).join(', ');
  }

  /** Avis des cabinets qui en ont (nombreAvis > 0) ; un cabinet en erreur est simplement ignoré. */
  private chargerAvis(cabinets: CabinetModel[]): void {
    const avecAvis = cabinets.filter((cabinet) => cabinet.nombreAvis > 0).slice(0, NB_CABINETS_VITRINE);

    if (avecAvis.length === 0) {
      return;
    }

    forkJoin(
      avecAvis.map((cabinet) =>
        this.avisService.listerParCabinet(cabinet.id).pipe(
          catchError(() => of([])),
        ),
      ),
    ).subscribe((parCabinet) => {
      const avis = parCabinet
        .flatMap((liste, i) =>
          liste
            .filter((a) => !!a.commentaire?.trim())
            .map((a): AvisAccueil => ({
              id: `${avecAvis[i].id}-${a.id}`,
              note: a.note,
              commentaire: a.commentaire as string,
              auteur: a.patient ? `${a.patient.prenom} ${a.patient.nom.charAt(0)}.`.trim() : 'Patient',
              cabinetNom: avecAvis[i].nom,
              date: a.created_at,
            })),
        )
        .sort((a, b) => b.note - a.note || b.date.localeCompare(a.date))
        .slice(0, NB_AVIS_VITRINE);

      this.avisReels.set(avis);
    });
  }

  etoiles(note: number): number[] {
    return Array.from({ length: Math.max(0, Math.min(5, Math.round(note))) }, (_, i) => i);
  }

  /**
   * Décompose une note (0 à 5) en 5 étoiles avec leur taux de remplissage :
   * 100 (pleine), 50 (demi) ou 0 (vide). Ex. 4,5 → 4 pleines + 1 demi + 0 vide.
   * La note est bornée à [0, 5] et arrondie à la demi-étoile la plus proche.
   */
  etoilesDetaillees(note: number): { index: number; remplissage: number }[] {
    const bornee = Math.max(0, Math.min(5, note));
    const arrondie = Math.round(bornee * 2) / 2;

    return Array.from({ length: 5 }, (_, index) => {
      const reste = arrondie - index;

      if (reste >= 1) {
        return { index, remplissage: 100 };
      }
      if (reste >= 0.5) {
        return { index, remplissage: 50 };
      }
      return { index, remplissage: 0 };
    });
  }

  /** Vrai si la note mérite un affichage chiffré (au moins une demi-étoile). */
  aUneNote(note: number): boolean {
    return note >= 0.5;
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
