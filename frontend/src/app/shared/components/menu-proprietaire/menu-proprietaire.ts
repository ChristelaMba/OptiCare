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

  readonly entrees = [
    { lien: '/proprietaire/dashboard-comptable', icone: 'dashboard', libelle: 'Dashboard' },
    { lien: '/proprietaire/historique-rdv', icone: 'calendar_today', libelle: 'Rendez-vous' },
    { lien: '/proprietaire/patients', icone: 'groups', libelle: 'Patients' },
    { lien: '/proprietaire/factures', icone: 'receipt_long', libelle: 'Factures' },
    { lien: '/proprietaire/gestion-employes', icone: 'badge', libelle: 'Employés' },
    { lien: '/proprietaire/vitrine-edition', icone: 'storefront', libelle: 'Ma vitrine' },
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
