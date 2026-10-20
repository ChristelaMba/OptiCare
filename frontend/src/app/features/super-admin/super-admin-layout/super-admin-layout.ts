import { Component, computed, inject, signal } from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';

import { Auth } from '../../../core/services/auth';
import { initialesUtilisateur, nomCompletUtilisateur } from '../../../core/utils/identite-utilisateur';
import { BoutonDeconnexion } from '../../../shared/components/bouton-deconnexion/bouton-deconnexion';
import { LogoOpticare } from '../../../shared/components/logo-opticare/logo-opticare';

/**
 * Entrée de navigation du menu Super Admin. `sections` regroupe les liens
 * sous un intitulé ; l'ordre du tableau est celui de la maquette validée
 * (Vue d'ensemble / Gestion / Système & Sécurité).
 *
 * `chemin` est le tracé SVG de l'icône (mêmes icônes au trait que l'espace
 * patient, plutôt que la police `material-symbols`) : c'est ce qui garantit
 * un rendu identique d'un espace à l'autre.
 */
interface LienNav {
  libelle: string;
  chemin: string;
  route: string;
}

interface SectionNav {
  titre: string;
  liens: LienNav[];
}

/**
 * Layout commun à tous les écrans Super Admin. Reprend la structure **et
 * l'habillage** de l'espace patient / opticien :
 *  - barre latérale fixe (ordinateur) avec logo, navigation à sections,
 *    puis profil + déconnexion en pied ;
 *  - barre du haut (téléphone) avec logo et bouton de déconnexion ;
 *  - `<router-outlet>` pour les écrans enfants.
 *
 * La sidebar (`.super-sidebar`) et ses entrées (`.nav-link`, `.active`) sont
 * stylées par `super-admin-layout.css` avec les mêmes règles que
 * `patient-layout.css` : survol (`--surface-soft` + bleu) et clic identiques.
 */
@Component({
  selector: 'app-super-admin-layout',
  imports: [LogoOpticare, BoutonDeconnexion, RouterLink, RouterLinkActive, RouterOutlet],
  templateUrl: './super-admin-layout.html',
  styleUrl: './super-admin-layout.css',
})
export class SuperAdminLayout {
  private readonly auth = inject(Auth);

  /** Identité de l'utilisateur connecté, affichée en pied de sidebar. */
  readonly nomComplet = computed(() => nomCompletUtilisateur(this.auth.utilisateur()));

  /**
   * Initiales de l'avatar. Le super administrateur connecté via l'outil de dev
   * porte un prénom de démo (« Super Administrateur ») qui donnerait « ST » :
   * on force « SA » pour rester lisible, sans toucher au calcul commun.
   */
  readonly initiales = computed(() =>
    this.auth.role() === 'super_admin' ? 'SA' : initialesUtilisateur(this.auth.utilisateur()),
  );

  /**
   * Navigation à 3 sections. Les chemins sont relatifs au parent `admin`
   * (voir `admin.routes.ts`) : ils restent valides si le préfixe change.
   */
  readonly sections: SectionNav[] = [
    {
      titre: "Vue d'ensemble",
      liens: [
        {
          libelle: 'Dashboard global',
          chemin: 'M4 13h6V4H4v9Zm0 7h6v-4H4v4Zm10 0h6v-9h-6v9Zm0-16v4h6V4h-6Z',
          route: 'dashboard',
        },
      ],
    },
    {
      titre: 'Gestion',
      liens: [
        {
          libelle: 'Validation des cabinets',
          chemin: 'M12 3.5 5 6.3v5c0 4.2 2.9 7.4 7 8.2 4.1-.8 7-4 7-8.2v-5L12 3.5Zm-1 11-2.6-2.6 1.1-1.1L11 12.3l4-4 1.1 1L11 14.5Z',
          route: 'cabinets/validation',
        },
        {
          libelle: 'Annuaire des cabinets',
          chemin: 'M4 9.5 5.5 5h13L20 9.5M4 9.5v10h16v-10M4 9.5h16M9.5 19.5v-5h5v5',
          route: 'cabinets',
        },
        {
          libelle: 'Gestion des comptes',
          chemin: 'M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8Zm-7 8c.9-3.6 3.6-5.5 7-5.5s6.1 1.9 7 5.5M18.5 15.5v3M17 17h3',
          route: 'comptes',
        },
      ],
    },
    {
      titre: 'Système & Sécurité',
      liens: [
        {
          libelle: "Journal d'audit",
          chemin: 'M12 4a8 8 0 1 1-7.5 5.3M4 4v4h4M12 8v4.3l3 1.8',
          route: 'audit-logs',
        },
        {
          libelle: 'Paramètres généraux',
          chemin: 'M12 8.5a3.5 3.5 0 1 0 0 7 3.5 3.5 0 0 0 0-7Zm8.4-2.2-1.3-1.3-1.9.6a6.7 6.7 0 0 0-1.3-.8l-.4-1.9h-3l-.4 1.9c-.5.2-.9.5-1.3.8l-1.9-.6-1.3 1.3.6 1.9c-.3.4-.6.8-.8 1.3L5 10.5v3l1.9.4c.2.5.5.9.8 1.3l-.6 1.9 1.3 1.3 1.9-.6c.4.3.8.6 1.3.8l.4 1.9h3l.4-1.9c.5-.2.9-.5 1.3-.8l1.9.6 1.3-1.3-.6-1.9c.3-.4.6-.8.8-1.3l1.9-.4v-3l-1.9-.4a6.7 6.7 0 0 0-.8-1.3l.6-1.9Z',
          route: 'parametres',
        },
      ],
    },
  ];

  /** Ouverture du tiroir latéral (téléphone uniquement). */
  readonly menuOuvert = signal(false);

  basculerMenu(): void {
    this.menuOuvert.update((ouvert) => !ouvert);
  }

  fermerMenu(): void {
    this.menuOuvert.set(false);
  }
}
