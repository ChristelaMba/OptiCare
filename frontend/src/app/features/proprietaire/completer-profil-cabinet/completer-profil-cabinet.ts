import { Component, inject, OnInit, signal } from '@angular/core';
import { FormArray, FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';

import { Auth } from '../../../core/services/auth';
import { Cabinet as CabinetService } from '../../../core/services/cabinet';
import { Cabinet as CabinetModel, CompleterProfilCabinetPayload, HoraireOuverture } from '../../../models/cabinet.model';

type JourSemaine = HoraireOuverture['jour'];

const JOURS: JourSemaine[] = ['Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi', 'Dimanche'];

/** Horaires par défaut proposés à l'ouverture du formulaire — l'utilisateur les ajuste, rien n'est imposé au back. */
const HORAIRE_PAR_DEFAUT: Record<JourSemaine, Pick<HoraireOuverture, 'ouverture' | 'fermeture' | 'ferme'>> = {
  Lundi: { ouverture: '08:00', fermeture: '18:00', ferme: false },
  Mardi: { ouverture: '08:00', fermeture: '18:00', ferme: false },
  Mercredi: { ouverture: '08:00', fermeture: '18:00', ferme: false },
  Jeudi: { ouverture: '08:00', fermeture: '18:00', ferme: false },
  Vendredi: { ouverture: '08:00', fermeture: '18:00', ferme: false },
  Samedi: { ouverture: '09:00', fermeture: '13:00', ferme: false },
  Dimanche: { ouverture: '09:00', fermeture: '13:00', ferme: true },
};

const MAX_PHOTOS = 4;

/**
 * Pas de maquette dédiée pour cet écran — §6.4 du cahier des charges décrit
 * les champs attendus, pas le visuel. Champs et sections réutilisent les
 * mêmes libellés/conventions Tailwind que `maquette/personnalisation_vitrine_opticare_admin/`
 * (réutilisé pour vitrine-edition), en plus simple.
 *
 * Choix de layout : pas de sidebar/shell dashboard ici. Le cabinet n'est pas
 * encore validé (`profilIncomplet`) à ce stade — Rendez-vous/Employés/Stats
 * n'ont pas encore de sens. Écran d'onboarding ponctuel, dans le même esprit
 * visuel que les écrans d'inscription (`features/auth/inscription-cabinet`).
 */
@Component({
  selector: 'app-completer-profil-cabinet',
  imports: [ReactiveFormsModule, RouterLink],
  templateUrl: './completer-profil-cabinet.html',
  styleUrl: './completer-profil-cabinet.css',
})
export class CompleterProfilCabinet implements OnInit {
  private readonly auth = inject(Auth);
  private readonly cabinetService = inject(CabinetService);
  private readonly fb = inject(FormBuilder);

  private readonly cabinetId = this.auth.utilisateur()?.cabinetId ?? null;

  readonly chargement = signal(true);
  readonly erreur = signal<string | null>(null);
  readonly cabinet = signal<CabinetModel | null>(null);
  readonly envoiEnCours = signal(false);
  readonly erreurFormulaire = signal<string | null>(null);
  readonly soumissionReussie = signal(false);

  readonly jours = JOURS;
  readonly maxPhotos = MAX_PHOTOS;

  // TODO : pas de vrai upload de fichier ce sprint (voir consigne) — aperçu
  // factice via placehold.co tant que logoUrl/une photo n'est pas renseignée.
  readonly logoPlaceholder = 'https://placehold.co/128x128?text=Logo';
  readonly photoPlaceholder = 'https://placehold.co/300x200?text=Photo';

  readonly formulaire = this.fb.nonNullable.group({
    slogan: ['', Validators.required],
    description: ['', Validators.required],
    quartier: ['', Validators.required],
    whatsappNumero: ['', Validators.required],
    logoUrl: [''],
    siteWeb: [''],
    facebook: [''],
    instagram: [''],
    tiktok: [''],
    horaires: this.fb.array(JOURS.map((jour) => this.creerGroupeHoraire(jour))),
    photos: this.fb.nonNullable.array<string>([]),
  });

  get horaires(): FormArray {
    return this.formulaire.controls.horaires;
  }

  get photos(): FormArray {
    return this.formulaire.controls.photos;
  }

  get peutAjouterPhoto(): boolean {
    return this.photos.length < MAX_PHOTOS;
  }

  private creerGroupeHoraire(jour: JourSemaine) {
    const defaut = HORAIRE_PAR_DEFAUT[jour];
    return this.fb.nonNullable.group({
      jour: [jour],
      ouverture: [defaut.ouverture, Validators.required],
      fermeture: [defaut.fermeture, Validators.required],
      ferme: [defaut.ferme],
    });
  }

  ngOnInit(): void {
    if (!this.cabinetId) {
      this.chargement.set(false);
      this.erreur.set("Aucun cabinet rattaché à ce compte — impossible d'afficher cet écran.");
      return;
    }

    this.cabinetService.obtenirDetail(this.cabinetId).subscribe({
      next: (cabinet) => {
        this.cabinet.set(cabinet);
        this.chargement.set(false);
      },
      error: () => {
        this.chargement.set(false);
        this.erreur.set('Impossible de charger les informations du cabinet pour le moment. Réessayez plus tard.');
      },
    });
  }

  ajouterPhoto(): void {
    if (!this.peutAjouterPhoto) return;
    this.photos.push(this.fb.nonNullable.control(''));
  }

  retirerPhoto(index: number): void {
    this.photos.removeAt(index);
  }

  soumettreFormulaire(): void {
    if (this.formulaire.invalid || !this.cabinetId) {
      this.formulaire.markAllAsTouched();
      return;
    }

    this.envoiEnCours.set(true);
    this.erreurFormulaire.set(null);

    const valeurs = this.formulaire.getRawValue();
    const payload: CompleterProfilCabinetPayload = {
      slogan: valeurs.slogan,
      description: valeurs.description,
      quartier: valeurs.quartier,
      whatsappNumero: valeurs.whatsappNumero,
      horaires: valeurs.horaires as HoraireOuverture[],
      logoUrl: valeurs.logoUrl || undefined,
      photos: valeurs.photos.filter((url: string) => url.trim()),
      liensExternes: {
        siteWeb: valeurs.siteWeb || undefined,
        facebook: valeurs.facebook || undefined,
        instagram: valeurs.instagram || undefined,
        tiktok: valeurs.tiktok || undefined,
      },
    };

    this.cabinetService.completerProfil(this.cabinetId, payload).subscribe({
      next: () => {
        this.envoiEnCours.set(false);
        this.soumissionReussie.set(true);
      },
      error: () => {
        this.envoiEnCours.set(false);
        this.erreurFormulaire.set('La soumission a échoué. Vérifiez les champs et réessayez.');
      },
    });
  }
}
