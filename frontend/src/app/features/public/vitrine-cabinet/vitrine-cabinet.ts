import { Component, computed, DestroyRef, ElementRef, inject, OnInit, signal, ViewChild } from '@angular/core';
import { DecimalPipe, Location } from '@angular/common';
import { RouterLink, ActivatedRoute, Router } from '@angular/router';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { catchError, EMPTY, of, switchMap } from 'rxjs';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

import { Avis as AvisService, AvisPublic } from '../../../core/services/avis';
import { Cabinet as CabinetService } from '../../../core/services/cabinet';
import { Cabinet as CabinetModel } from '../../../models/cabinet.model';

interface ServiceCabinet {
  icone: string;
  titre: string;
  description: string;
}

/** Avis réel prêt à afficher (nom abrégé, ancienneté relative). */
interface AvisAffiche {
  id: number;
  initiales: string;
  nom: string;
  quand: string;
  note: number;
  commentaire: string;
}

/**
 * OUTIL DE DEV — services proposés génériques, identiques pour tous les
 * cabinets. Reproduction de la maquette `maquette/accueil_cabinet/` : le
 * modèle Cabinet (§5 du cahier des charges) n'a pas de champ « services »,
 * donc ce contenu est éditorial/statique plutôt qu'inventé par cabinet —
 * même principe que la section « Avis » ci-dessous.
 */
const SERVICES_GENERIQUES: ServiceCabinet[] = [
  { icone: 'visibility', titre: 'Examen de la vue', description: 'Des tests complets pour évaluer votre santé oculaire et votre vision.' },
  { icone: 'lens', titre: 'Lentilles de contact', description: 'Ajustement personnalisé pour un confort optimal tout au long de la journée.' },
  { icone: 'build', titre: 'Atelier de réparation', description: 'Ajustement et réparation experte de vos montures préférées.' },
  { icone: 'child_care', titre: 'Optométrie pédiatrique', description: 'Des soins doux et spécialisés pour la vision de vos enfants.' },
];

/** Reproduction de la maquette `maquette/accueil_cabinet/` — page publique d'un cabinet. */
@Component({
  selector: 'app-vitrine-cabinet',
  imports: [DecimalPipe, RouterLink],
  templateUrl: './vitrine-cabinet.html',
  styleUrl: './vitrine-cabinet.css',
})
export class VitrineCabinet implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly cabinetService = inject(CabinetService);
  private readonly avisService = inject(AvisService);
  private readonly sanitizer = inject(DomSanitizer);
  private readonly location = inject(Location);
  private readonly router = inject(Router);
  // Injecté explicitement en champ de classe : takeUntilDestroyed() sans
  // argument exige un contexte d'injection actif (constructeur/champ), ce
  // qui n'est PAS le cas dans ngOnInit → NG0203 en runtime (voir bug corrigé
  // ici). Passer la référence explicitement contourne cette contrainte.
  private readonly destroyRef = inject(DestroyRef);

  @ViewChild('galerie') private galerieRef?: ElementRef<HTMLElement>;

  readonly cabinet = signal<CabinetModel | null>(null);
  readonly chargement = signal(true);
  readonly erreur = signal<string | null>(null);

  readonly services = SERVICES_GENERIQUES;
  /** Avis réels (GET /cabinets/{id}/avis). Jamais de contenu inventé : liste vide → « Aucun avis pour le moment ». */
  readonly avis = signal<AvisAffiche[]>([]);
  readonly chargementAvis = signal(true);
  readonly etoiles = [1, 2, 3, 4, 5];

  /** Lien wa.me : whatsappNumero peut contenir espaces/+ dans les données, wa.me n'accepte que des chiffres. */
  readonly lienWhatsapp = computed(() => {
    const cabinet = this.cabinet();
    if (!cabinet) return null;
    const numero = cabinet.whatsappNumero.replace(/\D/g, '');
    return numero ? `https://wa.me/${numero}` : null;
  });

  readonly lienGoogleMaps = computed(() => {
    const cabinet = this.cabinet();
    if (!cabinet) return '#';
    return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(this.adresseComplete(cabinet))}`;
  });

  /** Embed Google Maps sans clé API (mode `output=embed`) — vraie carte plutôt qu'un visuel statique. */
  readonly carteEmbed = computed<SafeResourceUrl | null>(() => {
    const cabinet = this.cabinet();
    if (!cabinet) return null;
    const requete = encodeURIComponent(this.adresseComplete(cabinet));
    return this.sanitizer.bypassSecurityTrustResourceUrl(`https://www.google.com/maps?q=${requete}&output=embed`);
  });

  ngOnInit(): void {
    // paramMap (pas snapshot) : la même instance de composant est réutilisée
    // si on navigue d'une vitrine à une autre (ex. depuis un lien "cabinets similaires").
    this.route.paramMap
      .pipe(
        switchMap((params) => {
          const id = params.get('id');
          this.chargement.set(true);
          this.erreur.set(null);
          this.cabinet.set(null);
          this.avis.set([]);
          this.chargementAvis.set(true);

          if (!id) {
            this.chargement.set(false);
            this.erreur.set('Ce cabinet est introuvable.');
            return EMPTY;
          }

          this.chargerAvis(id);

          return this.cabinetService.obtenirDetail(id).pipe(
            catchError(() => {
              this.chargement.set(false);
              this.erreur.set("Ce cabinet n'existe pas ou n'est plus disponible.");
              return EMPTY;
            }),
          );
        }),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe((cabinet) => {
        this.cabinet.set(cabinet);
        this.chargement.set(false);
      });
  }

  private chargerAvis(cabinetId: string): void {
    this.avisService
      .listerParCabinet(cabinetId)
      .pipe(
        catchError(() => of([] as AvisPublic[])),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe((liste) => {
        this.avis.set(
          liste.map((a) => ({
            id: a.id,
            initiales: a.patient ? `${a.patient.prenom.charAt(0)}${a.patient.nom.charAt(0)}`.toUpperCase() : 'P',
            nom: a.patient ? `${a.patient.prenom} ${a.patient.nom.charAt(0)}.` : 'Patient',
            quand: VitrineCabinet.ancienneteRelative(a.created_at),
            note: a.note,
            commentaire: a.commentaire ?? '',
          })),
        );
        this.chargementAvis.set(false);
      });
  }

  private static ancienneteRelative(dateIso: string): string {
    const jours = Math.floor((Date.now() - new Date(dateIso).getTime()) / 86_400_000);
    if (!Number.isFinite(jours) || jours < 1) return "Aujourd'hui";
    if (jours === 1) return 'Hier';
    if (jours < 7) return `Il y a ${jours} jours`;
    if (jours < 30) return `Il y a ${Math.floor(jours / 7)} semaine${jours >= 14 ? 's' : ''}`;
    return `Il y a ${Math.floor(jours / 30)} mois`;
  }

  /** « adresse, quartier, ville » sans virgule orpheline quand un champ est vide. */
  adresseComplete(cabinet: CabinetModel): string {
    return [cabinet.adresse, cabinet.quartier, cabinet.ville].filter((p) => !!p?.trim()).join(', ');
  }

  defilerGalerie(direction: -1 | 1): void {
    const conteneur = this.galerieRef?.nativeElement;
    if (!conteneur) return;
    conteneur.scrollBy({ left: direction * conteneur.clientWidth * 0.8, behavior: 'smooth' });
  }

  /** Comportement identique à recherche-cabinets.ts : retombe sur l'accueil si aucun historique. */
  retour(): void {
    if (window.history.length > 1) {
      this.location.back();
    } else {
      this.router.navigateByUrl('/');
    }
  }
}
