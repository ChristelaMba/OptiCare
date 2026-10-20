import { Component, computed, HostListener, inject, OnInit, signal } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';

import { Auth } from '../../../core/services/auth';
import { CabinetCourant } from '../../../core/services/cabinet-courant';
import { initialesUtilisateur, nomCompletUtilisateur } from '../../../core/utils/identite-utilisateur';
import { libelleRole } from '../../../models/utilisateur.model';
import { BoutonDeconnexion } from '../bouton-deconnexion/bouton-deconnexion';
import { LogoOpticare } from '../logo-opticare/logo-opticare';

/**
 * Menu de l'espace propriétaire, partagé par les 6 pages (dashboard-comptable, historique-rdv,
 * patients-cabinet, factures, gestion-employes, vitrine-edition) : évite de recopier le même
 * menu dans chaque page.
 *
 * Sur ordinateur : barre latérale fixe à gauche (logo, navigation, profil, déconnexion).
 * Sur téléphone : la barre latérale devient un menu rétractable (drawer) qui glisse depuis la
 * gauche, ouvert par le bouton hamburger de la barre du haut. Il se ferme au clic sur le voile
 * sombre (overlay), sur la touche Échap, ou sur n'importe quel lien de navigation.
 * La barre du haut mobile reprend celle de l'espace opticien : hamburger, cloche de
 * notifications et avatar/initiales, avec le nom du cabinet.
 */
@Component({
  selector: 'app-menu-proprietaire',
  standalone: true,
  imports: [RouterLink, RouterLinkActive, LogoOpticare, BoutonDeconnexion],
  templateUrl: './menu-proprietaire.html',
  styleUrl: './menu-proprietaire.css',
})
export class MenuProprietaire implements OnInit {
  private readonly auth = inject(Auth);
  private readonly cabinetCourant = inject(CabinetCourant);

  /** Ouverture du menu rétractable (mobile uniquement ; sans effet sur ordinateur). */
  readonly menuOuvert = signal(false);

  /** Panneau de notifications de la barre du haut (mobile). */
  readonly notificationsOuvertes = signal(false);

  /**
   * Entrées de navigation, avec le tracé SVG au trait — même facture que les
   * icônes de l'espace patient (`patient-layout.html`), et non plus la police
   * `material-symbols`.
   */
  readonly entrees = [
    {
      lien: '/proprietaire/dashboard-comptable',
      libelle: 'Dashboard',
      chemin: 'M4 13h6V4H4v9Zm0 7h6v-4H4v4Zm10 0h6v-9h-6v9Zm0-16v4h6V4h-6Z',
    },
    {
      lien: '/proprietaire/historique-rdv',
      libelle: 'Rendez-vous',
      chemin:
        'M5 5h14a2 2 0 0 1 2 2v13a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2ZM3 10h18M8 3v4M16 3v4',
    },
    {
      lien: '/proprietaire/patients',
      libelle: 'Patients',
      chemin:
        'M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8ZM22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75',
    },
    {
      lien: '/proprietaire/factures',
      libelle: 'Factures',
      chemin: 'M6 3h12v18l-3-2-3 2-3-2-3 2V3ZM9 8h6M9 12h6M9 16h4',
    },
    {
      lien: '/proprietaire/gestion-employes',
      libelle: 'Employés',
      chemin:
        'M12 3 3 7v5c0 5 3.8 8.6 9 9.8 5.2-1.2 9-4.8 9-9.8V7l-9-4ZM9.5 12.2l1.8 1.8 3.4-3.5',
    },
    {
      lien: '/proprietaire/vitrine-edition',
      libelle: 'Ma vitrine',
      chemin: 'M4 9.5V20h16V9.5M3 9.5 5 4h14l2 5.5c0 1.4-1.1 2.5-2.5 2.5S16 10.9 16 9.5c0 1.4-1.1 2.5-2.5 2.5S11 10.9 11 9.5c0 1.4-1.1 2.5-2.5 2.5S6 10.9 6 9.5C6 10.9 4.9 12 3.5 12S1 10.9 1 9.5',
    },
  ] as const;

  /** Identité de la session (jamais de nom écrit en dur). */
  readonly nomComplet = computed(() => nomCompletUtilisateur(this.auth.utilisateur()));
  readonly initiales = computed(() => initialesUtilisateur(this.auth.utilisateur()));
  readonly roleLibelle = computed(() => libelleRole(this.auth.role()));

  /** Nom du cabinet (chaîne vide tant que l'API n'a pas répondu). */
  readonly cabinetNom = this.cabinetCourant.nom;

  ngOnInit(): void {
    // Une seule requête partagée avec le tableau de bord (cf. CabinetCourant.statistiques()).
    // En cas d'échec de l'API, le nom reste vide et le repli s'affiche : aucune erreur à propager.
    this.cabinetCourant.statistiques()?.subscribe({ error: () => undefined });
  }

  basculerMenu(): void {
    this.menuOuvert.update((ouvert) => !ouvert);
    if (!this.menuOuvert()) this.notificationsOuvertes.set(false);
  }

  fermerMenu(): void {
    this.menuOuvert.set(false);
  }

  basculerNotifications(): void {
    this.notificationsOuvertes.update((ouvert) => !ouvert);
  }

  /** Ferme le menu sur la touche Échap (exigence d'accessibilité du drawer). */
  @HostListener('document:keydown.escape')
  surEchap(): void {
    this.fermerMenu();
    this.notificationsOuvertes.set(false);
  }
}
