import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { FormsModule, ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';

import { Auth } from '../../../core/services/auth';
import { CreerPersonnelPayload, Utilisateur as UtilisateurService } from '../../../core/services/utilisateur';
import { RoleUtilisateur, Utilisateur as UtilisateurModel } from '../../../models/utilisateur.model';

/**
 * Reproduction de la maquette `maquette/gestion_des_employ_s_opticare_admin/`.
 * §9.6 du cahier des charges : « c'est ici, et uniquement ici, que sont créés
 * les comptes Opticien/Secrétaire ».
 */
@Component({
  selector: 'app-gestion-employes',
  imports: [FormsModule, ReactiveFormsModule, RouterLink],
  templateUrl: './gestion-employes.html',
  styleUrl: './gestion-employes.css',
})
export class GestionEmployes implements OnInit {
  private readonly auth = inject(Auth);
  private readonly utilisateurService = inject(UtilisateurService);
  private readonly fb = inject(FormBuilder);

  private readonly cabinetId = this.auth.utilisateur()?.cabinetId ?? null;

  readonly chargement = signal(true);
  readonly erreur = signal<string | null>(null);
  private readonly employes = signal<UtilisateurModel[]>([]);

  readonly texteRecherche = signal('');
  readonly actionEnCours = signal<string | null>(null);
  readonly formulaireOuvert = signal(false);
  readonly envoiEnCours = signal(false);
  readonly erreurFormulaire = signal<string | null>(null);

  readonly formulaire = this.fb.nonNullable.group({
    prenom: ['', Validators.required],
    nom: ['', Validators.required],
    role: ['Opticien' as Extract<RoleUtilisateur, 'Opticien' | 'Secretaire'>, Validators.required],
    email: ['', [Validators.required, Validators.email]],
    telephone: ['', Validators.required],
    ville: ['Douala', Validators.required],
  });

  readonly employesFiltres = computed(() => {
    const texte = this.texteRecherche().trim().toLowerCase();
    if (!texte) return this.employes();
    return this.employes().filter(
      (e) => `${e.prenom} ${e.nom}`.toLowerCase().includes(texte) || e.role.toLowerCase().includes(texte),
    );
  });

  ngOnInit(): void {
    if (!this.cabinetId) {
      this.chargement.set(false);
      this.erreur.set("Aucun cabinet rattaché à ce compte — impossible d'afficher les employés.");
      return;
    }

    this.utilisateurService.listerParCabinet(this.cabinetId).subscribe({
      next: (employes) => {
        this.employes.set(employes);
        this.chargement.set(false);
      },
      error: () => {
        this.chargement.set(false);
        this.erreur.set('Impossible de charger les employés pour le moment. Réessayez plus tard.');
      },
    });
  }

  toggleActivation(employe: UtilisateurModel): void {
    this.actionEnCours.set(employe.id);
    const appel = employe.actif
      ? this.utilisateurService.desactiver(employe.id)
      : this.utilisateurService.activer(employe.id);

    appel.subscribe({
      next: (maj) => {
        this.actionEnCours.set(null);
        this.employes.update((liste) => liste.map((e) => (e.id === maj.id ? maj : e)));
      },
      error: () => {
        this.actionEnCours.set(null);
        this.erreur.set("L'action a échoué. Réessayez.");
      },
    });
  }

  ouvrirFormulaire(): void {
    this.formulaire.reset({ prenom: '', nom: '', role: 'Opticien', email: '', telephone: '', ville: 'Douala' });
    this.erreurFormulaire.set(null);
    this.formulaireOuvert.set(true);
  }

  fermerFormulaire(): void {
    this.formulaireOuvert.set(false);
  }

  soumettreFormulaire(): void {
    if (this.formulaire.invalid || !this.cabinetId) {
      this.formulaire.markAllAsTouched();
      return;
    }

    this.envoiEnCours.set(true);
    this.erreurFormulaire.set(null);

    const payload: CreerPersonnelPayload = this.formulaire.getRawValue();

    this.utilisateurService.creerPersonnel(this.cabinetId, payload).subscribe({
      next: (nouvelEmploye) => {
        this.envoiEnCours.set(false);
        this.employes.update((liste) => [...liste, nouvelEmploye]);
        this.formulaireOuvert.set(false);
      },
      error: () => {
        this.envoiEnCours.set(false);
        this.erreurFormulaire.set("La création du compte a échoué. Vérifiez les champs et réessayez.");
      },
    });
  }
}
