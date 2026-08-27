import { Component, inject, OnInit, signal } from '@angular/core';
import { FormArray, FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';

import { Auth } from '../../../core/services/auth';
import { Cabinet as CabinetService } from '../../../core/services/cabinet';
import { Cabinet as CabinetModel, HoraireOuverture, ModifierCabinetPayload } from '../../../models/cabinet.model';

type JourSemaine = HoraireOuverture['jour'];

const JOURS: JourSemaine[] = ['Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi', 'Dimanche'];
const MAX_PHOTOS = 4;

const LABEL_STATUT: Record<CabinetModel['statutValidation'], string> = {
  profilIncomplet: 'Profil incomplet',
  enAttente: 'En attente de validation',
  valide: 'Publié',
  rejete: 'Rejeté',
};

/**
 * Reproduction de la maquette `maquette/personnalisation_vitrine_opticare_admin/`
 * (code.html + screen.png) — mêmes sections (Informations générales, Contact,
 * Liens externes, Médias, Abonnement), classes Tailwind adaptées aux tokens
 * réels du projet (voir dashboard-comptable.html) plutôt qu'à la config
 * ad-hoc intégrée dans le fichier de maquette. Horaires ajoutés en plus de
 * la maquette : absents du visuel fourni mais nécessaires (§6.4/§9.6 —
 * mêmes champs que completer-profil-cabinet, cet écran les rend modifiables
 * en continu).
 */
@Component({
  selector: 'app-vitrine-edition',
  imports: [ReactiveFormsModule, RouterLink],
  templateUrl: './vitrine-edition.html',
  styleUrl: './vitrine-edition.css',
})
export class VitrineEdition implements OnInit {
  private readonly auth = inject(Auth);
  private readonly cabinetService = inject(CabinetService);
  private readonly fb = inject(FormBuilder);

  private readonly cabinetId = this.auth.utilisateur()?.cabinetId ?? null;

  readonly chargement = signal(true);
  readonly erreur = signal<string | null>(null);
  readonly cabinet = signal<CabinetModel | null>(null);
  readonly envoiEnCours = signal(false);
  readonly erreurFormulaire = signal<string | null>(null);
  readonly enregistrementReussi = signal(false);

  readonly jours = JOURS;
  readonly maxPhotos = MAX_PHOTOS;
  readonly labelStatut = LABEL_STATUT;

  // TODO : pas de vrai upload de fichier ce sprint (voir consigne) — aperçu
  // factice via placehold.co tant que logoUrl/une photo n'est pas renseignée.
  readonly logoPlaceholder = 'https://placehold.co/128x128?text=Logo';
  readonly photoPlaceholder = 'https://placehold.co/300x200?text=Photo';

  readonly formulaire = this.fb.nonNullable.group({
    nom: ['', Validators.required],
    adresse: ['', Validators.required],
    telephone: ['', Validators.required],
    ville: ['', Validators.required],
    slogan: [''],
    description: ['', Validators.required],
    quartier: ['', Validators.required],
    whatsappNumero: ['', Validators.required],
    logoUrl: [''],
    siteWeb: [''],
    facebook: [''],
    instagram: [''],
    tiktok: [''],
    // Horaires initialisés avec des valeurs neutres (7 jours fermés) — remplacées
    // par les vraies valeurs du cabinet dans preRemplirFormulaire() une fois chargé.
    horaires: this.fb.array(JOURS.map((jour) => this.creerGroupeHoraire({ jour, ouverture: '08:00', fermeture: '18:00', ferme: true }))),
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

  get lienApercu(): string {
    return this.cabinetId ? `/cabinet/${this.cabinetId}` : '#';
  }

  private creerGroupeHoraire(horaire: HoraireOuverture) {
    return this.fb.nonNullable.group({
      jour: [horaire.jour],
      ouverture: [horaire.ouverture, Validators.required],
      fermeture: [horaire.fermeture, Validators.required],
      ferme: [horaire.ferme],
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
        this.preRemplirFormulaire(cabinet);
        this.chargement.set(false);
      },
      error: () => {
        this.chargement.set(false);
        this.erreur.set('Impossible de charger les informations du cabinet pour le moment. Réessayez plus tard.');
      },
    });
  }

  private preRemplirFormulaire(cabinet: CabinetModel): void {
    this.formulaire.patchValue({
      nom: cabinet.nom,
      adresse: cabinet.adresse,
      telephone: cabinet.telephone,
      ville: cabinet.ville,
      slogan: cabinet.slogan,
      description: cabinet.description,
      quartier: cabinet.quartier,
      whatsappNumero: cabinet.whatsappNumero,
      logoUrl: cabinet.logoUrl,
      siteWeb: cabinet.liensExternes.siteWeb ?? '',
      facebook: cabinet.liensExternes.facebook ?? '',
      instagram: cabinet.liensExternes.instagram ?? '',
      tiktok: cabinet.liensExternes.tiktok ?? '',
    });

    // Les 7 groupes existent déjà (valeurs neutres posées à la construction du
    // formulaire) — on les met à jour avec les vraies valeurs du cabinet. Jour
    // manquant côté back (cabinet créé avant que les horaires soient
    // obligatoires) : le groupe garde sa valeur neutre « fermé » par défaut.
    const parJour = new Map(cabinet.horaires.map((h) => [h.jour, h]));
    JOURS.forEach((jour, index) => {
      const horaire = parJour.get(jour);
      if (horaire) this.horaires.at(index).patchValue(horaire);
    });

    for (const url of cabinet.photos.slice(0, MAX_PHOTOS)) {
      this.photos.push(this.fb.nonNullable.control(url));
    }
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
    this.enregistrementReussi.set(false);

    const valeurs = this.formulaire.getRawValue();
    const payload: ModifierCabinetPayload = {
      nom: valeurs.nom,
      adresse: valeurs.adresse,
      telephone: valeurs.telephone,
      ville: valeurs.ville,
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

    this.cabinetService.mettreAJour(this.cabinetId, payload).subscribe({
      next: (cabinet) => {
        this.envoiEnCours.set(false);
        this.enregistrementReussi.set(true);
        this.cabinet.set(cabinet);
      },
      error: () => {
        this.envoiEnCours.set(false);
        this.erreurFormulaire.set("L'enregistrement a échoué. Vérifiez les champs et réessayez.");
      },
    });
  }
}
