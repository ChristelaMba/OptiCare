import { HttpErrorResponse } from '@angular/common/http';
import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { AbstractControl, FormsModule, ReactiveFormsModule, FormBuilder, ValidationErrors, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';

import { Auth } from '../../../core/services/auth';
import { CreerEmployePayload, Personnel } from '../../../core/services/personnel';
import { erreursParChamp, messageErreurApi } from '../../../core/utils/api-errors';
import { Employe, libelleRole, RoleUtilisateur } from '../../../models/utilisateur.model';
import { BoutonDeconnexion } from '../../../shared/components/bouton-deconnexion/bouton-deconnexion';

/** Les deux mots de passe doivent être identiques. */
function motsDePasseIdentiques(groupe: AbstractControl): ValidationErrors | null {
  return groupe.get('password')?.value === groupe.get('password_confirmation')?.value ? null : { confirmation: true };
}

/**
 * Reproduction de la maquette `maquette/gestion_des_employ_s_opticare_admin/`.
 * §9.6 du cahier des charges : « c'est ici, et uniquement ici, que sont créés
 * les comptes Opticien/Secrétaire ».
 * 19/10/2026 : branché sur le service `Personnel` (GET/POST/PUT/DELETE /cabinets/{id}/personnel, §12).
 * Activer/désactiver = PUT avec `is_active`. Pas de formulaire de modification : non demandé pour l'instant.
 */
@Component({
  selector: 'app-gestion-employes',
  imports: [FormsModule, ReactiveFormsModule, RouterLink, BoutonDeconnexion],
  templateUrl: './gestion-employes.html',
  styleUrl: './gestion-employes.css',
})
export class GestionEmployes implements OnInit {
  private readonly auth = inject(Auth);
  private readonly personnelService = inject(Personnel);
  private readonly fb = inject(FormBuilder);

  private readonly cabinetId = this.auth.utilisateur()?.cabinetId ?? null;

  readonly chargement = signal(true);
  readonly erreur = signal<string | null>(null);
  private readonly employes = signal<Employe[]>([]);

  /** Libellé lisible d'un rôle pour l'affichage (carte employé). */
  readonly libelleRole = libelleRole;

  readonly texteRecherche = signal('');
  readonly actionEnCours = signal<string | null>(null);
  readonly formulaireOuvert = signal(false);
  readonly envoiEnCours = signal(false);
  /** Erreur générale du formulaire (champs inconnus du formulaire, 403, erreur serveur…). */
  readonly erreurFormulaire = signal<string | null>(null);
  /** Erreurs 422 du serveur, par champ (`telephone`, `email`, `password`…). */
  readonly erreursChamps = signal<Record<string, string>>({});

  /** Employé dont la suppression attend confirmation. */
  readonly employeASupprimer = signal<Employe | null>(null);

  readonly formulaire = this.fb.nonNullable.group(
    {
      prenom: ['', Validators.required],
      nom: ['', Validators.required],
      role: ['opticien' as Extract<RoleUtilisateur, 'opticien' | 'secretaire'>, Validators.required],
      telephone: ['', Validators.required],
      email: ['', Validators.email],
      ville: ['Douala', Validators.required],
      poste: [''],
      embauche_le: [''],
      password: ['', [Validators.required, Validators.minLength(8)]],
      password_confirmation: ['', Validators.required],
    },
    { validators: motsDePasseIdentiques },
  );

  readonly employesFiltres = computed(() => {
    const texte = this.texteRecherche().trim().toLowerCase();
    if (!texte) return this.employes();
    return this.employes().filter(
      (e) =>
        `${e.prenom} ${e.nom}`.toLowerCase().includes(texte) ||
        e.role.toLowerCase().includes(texte) ||
        libelleRole(e.role).toLowerCase().includes(texte) ||
        e.telephone.toLowerCase().includes(texte) ||
        (e.poste ?? '').toLowerCase().includes(texte),
    );
  });

  readonly aucunEmploye = computed(() => this.employes().length === 0);

  ngOnInit(): void {
    if (!this.cabinetId) {
      this.chargement.set(false);
      this.erreur.set("Aucun cabinet rattaché à ce compte — impossible d'afficher les employés.");
      return;
    }

    this.personnelService.lister(this.cabinetId).subscribe({
      next: (employes) => {
        this.employes.set(employes);
        this.chargement.set(false);
      },
      error: (e: HttpErrorResponse) => {
        this.chargement.set(false);
        this.erreur.set(this.message(e, 'Impossible de charger les employés'));
      },
    });
  }

  /** « Accès refusé. » sur 403, sinon erreurs 422 du serveur, sinon message générique complété du message serveur. */
  private message(e: HttpErrorResponse, debut: string): string {
    const messageServeur = (e.error as { message?: string } | null)?.message;
    return messageErreurApi(e, `${debut}.${messageServeur ? ` Le serveur répond : ${messageServeur}` : ' Réessayez plus tard.'}`);
  }

  toggleActivation(employe: Employe): void {
    if (!this.cabinetId || this.actionEnCours()) return;
    this.actionEnCours.set(employe.id);
    this.erreur.set(null);

    this.personnelService.modifier(this.cabinetId, employe.id, { is_active: !employe.actif }).subscribe({
      next: (maj) => {
        this.actionEnCours.set(null);
        this.employes.update((liste) => liste.map((e) => (e.id === maj.id ? maj : e)));
      },
      error: (e: HttpErrorResponse) => {
        this.actionEnCours.set(null);
        this.erreur.set(this.message(e, "L'action a échoué"));
      },
    });
  }

  demanderSuppression(employe: Employe): void {
    this.employeASupprimer.set(employe);
  }

  annulerSuppression(): void {
    this.employeASupprimer.set(null);
  }

  confirmerSuppression(): void {
    const employe = this.employeASupprimer();
    if (!employe || !this.cabinetId || this.actionEnCours()) return;
    this.actionEnCours.set(employe.id);
    this.erreur.set(null);

    this.personnelService.supprimer(this.cabinetId, employe.id).subscribe({
      next: () => {
        this.actionEnCours.set(null);
        this.employeASupprimer.set(null);
        this.employes.update((liste) => liste.filter((e) => e.id !== employe.id));
      },
      error: (e: HttpErrorResponse) => {
        this.actionEnCours.set(null);
        this.employeASupprimer.set(null);
        this.erreur.set(this.message(e, 'La suppression a échoué'));
      },
    });
  }

  ouvrirFormulaire(): void {
    this.formulaire.reset({
      prenom: '',
      nom: '',
      role: 'opticien',
      telephone: '',
      email: '',
      ville: 'Douala',
      poste: '',
      embauche_le: '',
      password: '',
      password_confirmation: '',
    });
    this.erreurFormulaire.set(null);
    this.erreursChamps.set({});
    this.formulaireOuvert.set(true);
  }

  fermerFormulaire(): void {
    this.formulaire.reset();
    this.formulaireOuvert.set(false);
  }

  soumettreFormulaire(): void {
    if (this.formulaire.invalid || !this.cabinetId) {
      this.formulaire.markAllAsTouched();
      return;
    }

    this.envoiEnCours.set(true);
    this.erreurFormulaire.set(null);
    this.erreursChamps.set({});

    const v = this.formulaire.getRawValue();
    const payload: CreerEmployePayload = {
      nom: v.nom,
      prenom: v.prenom,
      telephone: v.telephone,
      ville: v.ville,
      role: v.role,
      password: v.password,
      password_confirmation: v.password_confirmation,
      ...(v.email.trim() ? { email: v.email.trim() } : {}),
      ...(v.poste.trim() ? { poste: v.poste.trim() } : {}),
      ...(v.embauche_le ? { embauche_le: v.embauche_le } : {}),
    };

    this.personnelService.creer(this.cabinetId, payload).subscribe({
      next: (nouvelEmploye) => {
        this.envoiEnCours.set(false);
        this.employes.update((liste) => [...liste, nouvelEmploye]);
        this.fermerFormulaire();
      },
      error: (e: HttpErrorResponse) => {
        this.envoiEnCours.set(false);
        const champs = erreursParChamp(e);
        const connus = Object.keys(this.formulaire.controls);
        const affichables: Record<string, string> = {};
        const autres: string[] = [];
        for (const [champ, texte] of Object.entries(champs)) {
          if (connus.includes(champ)) affichables[champ] = texte;
          else autres.push(texte);
        }
        this.erreursChamps.set(affichables);
        if (e.status === 422) {
          // 422 : les messages par champ sont sous les champs ; le reste (ex. `general`) en bandeau.
          this.erreurFormulaire.set(autres.length ? autres.join(' ') : Object.keys(affichables).length ? null : this.message(e, "La création du compte a échoué"));
        } else {
          this.erreurFormulaire.set(this.message(e, 'La création du compte a échoué'));
        }
      },
    });
  }
}
