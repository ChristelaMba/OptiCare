import { Component, computed, DestroyRef, ElementRef, inject, OnInit, signal, ViewChild } from '@angular/core';
import { DecimalPipe, Location } from '@angular/common';
import { RouterLink, ActivatedRoute, Router } from '@angular/router';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { catchError, EMPTY, switchMap } from 'rxjs';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

import { Cabinet as CabinetService } from '../../../core/services/cabinet';
import { Cabinet as CabinetModel } from '../../../models/cabinet.model';

interface ServiceCabinet {
  icone: string;
  titre: string;
  description: string;
}

interface AvisPlaceholder {
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

/** Placeholder — avis.service.ts n'existe pas encore (sprint ultérieur), comme sur l'accueil. */
const AVIS_PLACEHOLDER: AvisPlaceholder[] = [
  { initiales: 'JD', nom: 'Jean Dupont', quand: 'Il y a 2 jours', note: 5, commentaire: "Service exceptionnel et personnel extrêmement professionnel. La clinique est impeccable et le nouvel équipement de diagnostic a rendu l'examen rapide et confortable." },
  { initiales: 'ML', nom: 'Marie Laurent', quand: 'Il y a 1 semaine', note: 4, commentaire: "Ambiance très accueillante. Ils ont pris le temps d'expliquer chaque étape de l'examen de la vue et m'ont aidé à trouver les montures parfaites." },
  { initiales: 'SM', nom: 'Sophie Martin', quand: 'Il y a 3 jours', note: 5, commentaire: "Excellent service d'optométrie pédiatrique. L'équipe a été très patiente avec mon fils, rendant son premier examen de la vue amusant et sans stress." },
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
  readonly avisPlaceholder = AVIS_PLACEHOLDER;
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
    return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${cabinet.adresse}, ${cabinet.quartier}, ${cabinet.ville}`)}`;
  });

  /** Embed Google Maps sans clé API (mode `output=embed`) — vraie carte plutôt qu'un visuel statique. */
  readonly carteEmbed = computed<SafeResourceUrl | null>(() => {
    const cabinet = this.cabinet();
    if (!cabinet) return null;
    const requete = encodeURIComponent(`${cabinet.adresse}, ${cabinet.quartier}, ${cabinet.ville}`);
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

          if (!id) {
            this.chargement.set(false);
            this.erreur.set('Ce cabinet est introuvable.');
            return EMPTY;
          }

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
