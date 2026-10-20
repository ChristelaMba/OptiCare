import { HttpErrorResponse } from '@angular/common/http';
import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';

import { Utilisateur as UtilisateurService } from '../../../core/services/utilisateur';
import { messageErreurApi } from '../../../core/utils/api-errors';
import { CompteAdmin, libelleRole, RoleUtilisateur, StatsComptes } from '../../../models/utilisateur.model';

type FiltreStatut = 'tous' | 'actif' | 'inactif';

const TAILLE_PAGE = 8;

/**
 * 19/10/2026 : branché sur GET /admin/users (liste + stats), PUT /admin/users/{id}/toggle-active et /reset-password.
 * Reproduction de la maquette `maquette/gestion_des_comptes_opticare_super_admin/`.
 * Le bouton « Add Account » de la maquette a été retiré : §9.6 du cahier des
 * charges est explicite, les comptes Opticien/Secretaire ne se créent que
 * depuis « Gestion des employés » (Propriétaire). Le bouton « Edit » a
 * également été omis — pas de formulaire d'édition de compte prévu au
 * cahier des charges, ni de route associée.
 */
@Component({
  selector: 'app-gestion-comptes',
  imports: [FormsModule],
  templateUrl: './gestion-comptes.html',
  styleUrl: './gestion-comptes.css',
})
export class GestionComptes implements OnInit {
  private readonly utilisateurService = inject(UtilisateurService);

  readonly chargement = signal(true);
  readonly erreur = signal<string | null>(null);
  private readonly utilisateurs = signal<CompteAdmin[]>([]);
  readonly stats = signal<StatsComptes | null>(null);

  /** Erreur d'une action (activer/désactiver), affichée sans masquer la liste. */
  readonly erreurAction = signal<string | null>(null);

  // Réinitialisation du mot de passe : formulaire en mémoire uniquement, vidé à la fermeture.
  readonly compteReinit = signal<CompteAdmin | null>(null);
  readonly nouveauMotDePasse = signal('');
  readonly confirmationMotDePasse = signal('');
  readonly erreurReinit = signal<string | null>(null);
  readonly succesReinit = signal<string | null>(null);

  /** Libellé lisible d'un rôle pour l'affichage (cellule « Rôle » du tableau). */
  readonly libelleRole = libelleRole;

  readonly texteRecherche = signal('');
  readonly filtreRole = signal<RoleUtilisateur | 'tous'>('tous');
  readonly filtreStatut = signal<FiltreStatut>('tous');
  readonly pageActuelle = signal(1);

  /** id du compte dont une action (activer/désactiver/réinitialiser) est en cours. */
  readonly actionEnCours = signal<string | null>(null);

  private readonly utilisateursFiltres = computed(() => {
    const texte = this.texteRecherche().trim().toLowerCase();
    const role = this.filtreRole();
    const statut = this.filtreStatut();

    return this.utilisateurs().filter((u) => {
      const correspondTexte =
        !texte ||
        `${u.prenom} ${u.nom}`.toLowerCase().includes(texte) ||
        (u.email ?? '').toLowerCase().includes(texte) ||
        u.telephone.toLowerCase().includes(texte) ||
        (u.cabinetNom ?? '').toLowerCase().includes(texte);
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
  readonly totalComptes = computed(() => this.utilisateurs().length);
  readonly totalResultats = computed(() => this.utilisateursFiltres().length);

  ngOnInit(): void {
    this.utilisateurService.listerComptes().subscribe({
      next: ({ comptes, stats }) => {
        this.utilisateurs.set(comptes);
        this.stats.set(stats);
        this.chargement.set(false);
      },
      error: (e: HttpErrorResponse) => {
        this.chargement.set(false);
        this.erreur.set(this.messageErreur(e, 'Impossible de charger les comptes'));
      },
    });
  }

  /** « Accès refusé. » sur 403, sinon erreurs 422 du serveur, sinon message générique complété du message serveur. */
  private messageErreur(e: HttpErrorResponse, debut: string): string {
    const messageServeur = (e.error as { message?: string } | null)?.message;
    return messageErreurApi(e, `${debut}.${messageServeur ? ` Le serveur répond : ${messageServeur}` : ' Réessayez plus tard.'}`);
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

  toggleActivation(utilisateur: CompteAdmin): void {
    if (this.actionEnCours()) return;
    this.actionEnCours.set(utilisateur.id);
    this.erreurAction.set(null);

    this.utilisateurService.basculerActivation(utilisateur.id).subscribe({
      next: (maj) => {
        this.actionEnCours.set(null);
        // État renvoyé par le serveur ; les compteurs `stats` sont recalculés en local.
        const avait = utilisateur.actif;
        this.utilisateurs.update((liste) => liste.map((u) => (u.id === maj.id ? { ...u, actif: maj.actif } : u)));
        if (avait !== maj.actif) {
          this.stats.update((s) =>
            s ? { ...s, actifs: s.actifs + (maj.actif ? 1 : -1), inactifs: s.inactifs + (maj.actif ? -1 : 1) } : s,
          );
        }
      },
      error: (e: HttpErrorResponse) => {
        this.actionEnCours.set(null);
        this.erreurAction.set(this.messageErreur(e, "L'action a échoué"));
      },
    });
  }

  ouvrirReinitialisation(utilisateur: CompteAdmin): void {
    this.compteReinit.set(utilisateur);
    this.nouveauMotDePasse.set('');
    this.confirmationMotDePasse.set('');
    this.erreurReinit.set(null);
    this.succesReinit.set(null);
  }

  fermerReinitialisation(): void {
    this.compteReinit.set(null);
    this.nouveauMotDePasse.set('');
    this.confirmationMotDePasse.set('');
    this.erreurReinit.set(null);
  }

  confirmerReinitialisation(): void {
    const compte = this.compteReinit();
    if (!compte || this.actionEnCours()) return;

    const mdp = this.nouveauMotDePasse();
    if (mdp.length < 8) {
      this.erreurReinit.set('Le mot de passe doit contenir au moins 8 caractères.');
      return;
    }
    if (mdp !== this.confirmationMotDePasse()) {
      this.erreurReinit.set('La confirmation ne correspond pas au mot de passe.');
      return;
    }

    this.actionEnCours.set(compte.id);
    this.erreurReinit.set(null);
    this.utilisateurService.reinitialiserMotDePasse(compte.id, mdp, this.confirmationMotDePasse()).subscribe({
      next: () => {
        this.actionEnCours.set(null);
        this.fermerReinitialisation();
        this.succesReinit.set(`Mot de passe de ${compte.prenom} ${compte.nom} réinitialisé.`);
      },
      error: (e: HttpErrorResponse) => {
        this.actionEnCours.set(null);
        this.erreurReinit.set(this.messageErreur(e, 'La réinitialisation a échoué'));
      },
    });
  }
}
