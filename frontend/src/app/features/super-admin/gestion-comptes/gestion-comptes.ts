import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';

import { Auth } from '../../../core/services/auth';
import { Utilisateur as UtilisateurService } from '../../../core/services/utilisateur';
import { Cabinet as CabinetService } from '../../../core/services/cabinet';
import { RoleUtilisateur, Utilisateur as UtilisateurModel } from '../../../models/utilisateur.model';
import { Cabinet as CabinetModel } from '../../../models/cabinet.model';

type FiltreStatut = 'tous' | 'actif' | 'inactif';

const TAILLE_PAGE = 8;

/**
 * Reproduction de la maquette `maquette/gestion_des_comptes_opticare_super_admin/`.
 * Le bouton « Add Account » de la maquette a été retiré : §9.6 du cahier des
 * charges est explicite, les comptes Opticien/Secretaire ne se créent que
 * depuis « Gestion des employés » (Propriétaire). Le bouton « Edit » a
 * également été omis — pas de formulaire d'édition de compte prévu au
 * cahier des charges, ni de route associée.
 */
@Component({
  selector: 'app-gestion-comptes',
  imports: [FormsModule, RouterLink],
  templateUrl: './gestion-comptes.html',
  styleUrl: './gestion-comptes.css',
})
export class GestionComptes implements OnInit {
  private readonly auth = inject(Auth);
  private readonly router = inject(Router);
  private readonly utilisateurService = inject(UtilisateurService);
  private readonly cabinetService = inject(CabinetService);

  readonly chargement = signal(true);
  readonly erreur = signal<string | null>(null);
  private readonly utilisateurs = signal<UtilisateurModel[]>([]);
  private readonly cabinets = signal<CabinetModel[]>([]);

  readonly texteRecherche = signal('');
  readonly filtreRole = signal<RoleUtilisateur | 'tous'>('tous');
  readonly filtreStatut = signal<FiltreStatut>('tous');
  readonly pageActuelle = signal(1);

  /** id du compte dont une action (activer/désactiver/réinitialiser) est en cours. */
  readonly actionEnCours = signal<string | null>(null);

  private readonly nomsCabinets = computed(() => {
    const map = new Map<string, string>();
    for (const cabinet of this.cabinets()) map.set(cabinet.id, cabinet.nom);
    return map;
  });

  nomCabinet(utilisateur: UtilisateurModel): string {
    if (!utilisateur.cabinetId) return 'N/A';
    return this.nomsCabinets().get(utilisateur.cabinetId) ?? 'N/A';
  }

  private readonly utilisateursFiltres = computed(() => {
    const texte = this.texteRecherche().trim().toLowerCase();
    const role = this.filtreRole();
    const statut = this.filtreStatut();

    return this.utilisateurs().filter((u) => {
      const correspondTexte =
        !texte ||
        `${u.prenom} ${u.nom}`.toLowerCase().includes(texte) ||
        u.email.toLowerCase().includes(texte);
      const correspondRole = role === 'tous' || u.role === role;
      const correspondStatut = statut === 'tous' || (statut === 'actif' ? u.actif : !u.actif);
      return correspondTexte && correspondRole && correspondStatut;
    });
  });

  readonly nombrePages = computed(() => Math.max(1, Math.ceil(this.utilisateursFiltres().length / TAILLE_PAGE)));
  readonly pageAffichee = computed(() => Math.min(this.pageActuelle(), this.nombrePages()));

  readonly utilisateursPage = computed(() => {
    const debut = (this.pageAffichee() - 1) * TAILLE_PAGE;
    return this.utilisateursFiltres().slice(debut, debut + TAILLE_PAGE);
  });

  readonly numerosPages = computed(() => Array.from({ length: this.nombrePages() }, (_, i) => i + 1));
  readonly totalResultats = computed(() => this.utilisateursFiltres().length);

  ngOnInit(): void {
    this.utilisateurService.listerTous().subscribe({
      next: (utilisateurs) => {
        this.utilisateurs.set(utilisateurs);
        this.chargement.set(false);
      },
      error: () => {
        this.chargement.set(false);
        this.erreur.set('Impossible de charger les comptes pour le moment. Réessayez plus tard.');
      },
    });

    // Chargé en parallèle, indépendamment — une erreur ici ne bloque pas la liste des comptes,
    // seuls les noms de cabinet retombent sur « N/A ».
    this.cabinetService.listerEnAttente().subscribe({
      next: (cabinets) => this.cabinets.set(cabinets),
    });
  }

  reinitialiserFiltres(): void {
    this.texteRecherche.set('');
    this.filtreRole.set('tous');
    this.filtreStatut.set('tous');
    this.pageActuelle.set(1);
  }

  allerPage(page: number): void {
    this.pageActuelle.set(Math.min(Math.max(1, page), this.nombrePages()));
  }

  toggleActivation(utilisateur: UtilisateurModel): void {
    this.actionEnCours.set(utilisateur.id);
    const appel = utilisateur.actif
      ? this.utilisateurService.desactiver(utilisateur.id)
      : this.utilisateurService.activer(utilisateur.id);

    appel.subscribe({
      next: (maj) => {
        this.actionEnCours.set(null);
        this.utilisateurs.update((liste) => liste.map((u) => (u.id === maj.id ? maj : u)));
      },
      error: () => {
        this.actionEnCours.set(null);
        this.erreur.set("L'action a échoué. Réessayez.");
      },
    });
  }

  reinitialiserMotDePasse(utilisateur: UtilisateurModel): void {
    this.actionEnCours.set(utilisateur.id);
    this.utilisateurService.reinitialiserMotDePasse(utilisateur.id).subscribe({
      next: () => this.actionEnCours.set(null),
      error: () => {
        this.actionEnCours.set(null);
        this.erreur.set('La réinitialisation a échoué. Réessayez.');
      },
    });
  }

  deconnexion(): void {
    this.auth.logout();
    this.router.navigateByUrl('/auth/connexion');
  }
}
