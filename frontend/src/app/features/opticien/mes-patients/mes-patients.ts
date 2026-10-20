import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { forkJoin, of, catchError } from 'rxjs';
import { Router } from '@angular/router';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';

import { Auth } from '../../../core/services/auth';
import { ConsultationService } from '../../../core/services/consultation';
import { CreerPatientPayload, PatientsCabinet } from '../../../core/services/patients-cabinet';
import { erreursParChamp, messageErreurApi } from '../../../core/utils/api-errors';

interface PatientOpticien {
  id: string;
  prenom: string;
  nom: string;
  telephone: string;
  ville: string | null;
  /** `YYYY-MM-DD`, calculée depuis `GET /cabinets/{id}/consultations` ; `null` s'il n'y en a pas. */
  derniereConsultation: string | null;
  nombreConsultations: number;
}

/**
 * 20/10/2026 : liste réelle des patients du cabinet (`GET /cabinets/{id}/patients`). L'API ne fournit ni âge, ni sexe,
 * ni quartier, ni statut « actif / à suivre » : ces éléments sont retirés.
 * « Nouveau patient » : `POST /cabinets/{id}/patients` (§7.2), téléphone au format +237 suivi de 9 chiffres.
 * Nombre et date de dernière consultation viennent de `GET /cabinets/{id}/consultations` (leur échec ne bloque pas la liste).
 */
@Component({
  selector: 'app-mes-patients',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './mes-patients.html',
  styleUrl: './mes-patients.css',
})
export class MesPatients implements OnInit {
  private readonly router = inject(Router);
  private readonly auth = inject(Auth);
  private readonly patientsService = inject(PatientsCabinet);
  private readonly consultationService = inject(ConsultationService);
  private readonly fb = inject(FormBuilder);

  private readonly cabinetId = this.auth.utilisateur()?.cabinetId ?? null;

  // Formulaire « Nouveau patient »
  readonly formulaireOuvert = signal(false);
  readonly envoiEnCours = signal(false);
  readonly erreurFormulaire = signal<string | null>(null);
  /** Erreurs 422 du serveur, par champ (`telephone`, `email`…). */
  readonly erreursChamps = signal<Record<string, string>>({});

  readonly formulairePatient = this.fb.nonNullable.group({
    nom: ['', Validators.required],
    prenom: ['', Validators.required],
    telephone: ['', [Validators.required, Validators.pattern(/^\+237\d{9}$/)]],
    email: ['', Validators.email],
    ville: [''],
    dateNaissance: [''],
    adresse: [''],
  });

  chargement = signal(true);
  erreur = signal<string | null>(null);
  recherche = signal('');
  patientSelectionne = signal<PatientOpticien | null>(null);
  patients = signal<PatientOpticien[]>([]);

  patientsFiltres = computed(() => {
    const terme = this.recherche().trim().toLowerCase();
    return this.patients().filter(
      (p) =>
        !terme ||
        p.nom.toLowerCase().includes(terme) ||
        p.prenom.toLowerCase().includes(terme) ||
        p.telephone.toLowerCase().includes(terme) ||
        (p.ville ?? '').toLowerCase().includes(terme),
    );
  });

  nombrePatients = computed(() => this.patients().length);

  ngOnInit(): void {
    const cabinetId = this.auth.utilisateur()?.cabinetId;
    if (!cabinetId) {
      this.chargement.set(false);
      this.erreur.set("Aucun cabinet rattaché à ce compte — impossible d'afficher les patients.");
      return;
    }

    forkJoin({
      patients: this.patientsService.lister(cabinetId),
      // Un échec de la liste des consultations ne bloque pas les patients : compteurs à 0.
      consultations: this.consultationService.listerParCabinet(cabinetId).pipe(catchError(() => of([]))),
    }).subscribe({
      next: ({ patients, consultations }) => {
        this.patients.set(
          patients.map((p) => {
            const siennes = consultations.filter((c) => c.patientId === p.id);
            const derniere = siennes.map((c) => c.date).sort().at(-1) ?? null;
            return {
              id: p.id,
              prenom: p.prenom,
              nom: p.nom,
              telephone: p.telephone,
              ville: p.ville,
              derniereConsultation: derniere,
              nombreConsultations: siennes.length,
            };
          }),
        );
        this.chargement.set(false);
      },
      error: (e: HttpErrorResponse) => {
        this.chargement.set(false);
        const messageServeur = (e.error as { message?: string } | null)?.message;
        this.erreur.set(
          messageErreurApi(e, `Impossible de charger les patients.${messageServeur ? ` Le serveur répond : ${messageServeur}` : ' Réessayez plus tard.'}`),
        );
      },
    });
  }

  initiales(patient: PatientOpticien): string {
    return `${patient.prenom?.charAt(0).toUpperCase() ?? ''}${patient.nom?.charAt(0).toUpperCase() ?? ''}`;
  }

  couleurAvatar(index: number): string {
    const couleurs = ['avatar-blue', 'avatar-green', 'avatar-violet', 'avatar-orange', 'avatar-pink', 'avatar-cyan'];
    return couleurs[index % couleurs.length];
  }

  rechercher(event: Event): void {
    this.recherche.set((event.target as HTMLInputElement).value);
  }

  selectionnerPatient(patient: PatientOpticien): void {
    this.patientSelectionne.set(patient);
  }

  fermerApercu(): void {
    this.patientSelectionne.set(null);
  }

  voirDossier(patient: PatientOpticien): void {
    void this.router.navigate(['/opticien/dossier-visuel-patient'], { queryParams: { patientId: patient.id } });
  }

  nouvelleConsultation(patient: PatientOpticien): void {
    void this.router.navigate(['/opticien/nouvelle-fiche-consultation'], { queryParams: { patientId: patient.id } });
  }

  // Factures/ordonnances et commandes : écrans hors périmètre de ce lot (données locales).
  voirFactures(patient: PatientOpticien): void {
    void this.router.navigate(['/opticien/facture-ordonnance'], { queryParams: { patientId: patient.id } });
  }

  voirCommandes(patient: PatientOpticien): void {
    void this.router.navigate(['/opticien/suivi-commande'], { queryParams: { patientId: patient.id } });
  }

  ouvrirFormulaire(): void {
    this.formulairePatient.reset({ nom: '', prenom: '', telephone: '', email: '', ville: '', dateNaissance: '', adresse: '' });
    this.erreurFormulaire.set(null);
    this.erreursChamps.set({});
    this.formulaireOuvert.set(true);
  }

  fermerFormulaire(): void {
    this.formulaireOuvert.set(false);
  }

  /** Téléphone saisi avec espaces/tirets : normalisé en « +237XXXXXXXXX » avant validation et envoi. */
  normaliserTelephone(): void {
    const champ = this.formulairePatient.controls.telephone;
    const nettoye = champ.value.replace(/[\s.-]/g, '');
    if (nettoye !== champ.value) champ.setValue(nettoye);
  }

  creerPatient(): void {
    if (this.envoiEnCours()) return;
    this.normaliserTelephone();
    if (this.formulairePatient.invalid || !this.cabinetId) {
      this.formulairePatient.markAllAsTouched();
      return;
    }
    this.envoiEnCours.set(true);
    this.erreurFormulaire.set(null);
    this.erreursChamps.set({});

    const v = this.formulairePatient.getRawValue();
    const payload: CreerPatientPayload = {
      nom: v.nom.trim(),
      prenom: v.prenom.trim(),
      telephone: v.telephone,
      ...(v.email.trim() ? { email: v.email.trim() } : {}),
      ...(v.ville.trim() ? { ville: v.ville.trim() } : {}),
      ...(v.dateNaissance ? { date_naissance: v.dateNaissance } : {}),
      ...(v.adresse.trim() ? { adresse: v.adresse.trim() } : {}),
    };

    this.patientsService.creer(this.cabinetId, payload).subscribe({
      next: (p) => {
        this.envoiEnCours.set(false);
        this.patients.update((liste) => [
          ...liste,
          { id: p.id, prenom: p.prenom, nom: p.nom, telephone: p.telephone, ville: p.ville, derniereConsultation: null, nombreConsultations: 0 },
        ]);
        this.fermerFormulaire();
      },
      error: (e: HttpErrorResponse) => {
        this.envoiEnCours.set(false);
        const champs = erreursParChamp(e);
        const connus = ['nom', 'prenom', 'telephone', 'email', 'ville', 'date_naissance', 'adresse'];
        const sousChamp: Record<string, string> = {};
        const autres: string[] = [];
        for (const [cle, message] of Object.entries(champs)) {
          if (connus.includes(cle)) sousChamp[cle] = message;
          else autres.push(message);
        }
        this.erreursChamps.set(sousChamp);
        if (e.status === 422 && (autres.length > 0 || Object.keys(sousChamp).length > 0)) {
          this.erreurFormulaire.set(autres.length > 0 ? autres.join(' ') : null);
        } else {
          const messageServeur = (e.error as { message?: string } | null)?.message;
          this.erreurFormulaire.set(
            messageErreurApi(e, `La création du patient a échoué.${messageServeur ? ` Le serveur répond : ${messageServeur}` : ' Réessayez plus tard.'}`),
          );
        }
      },
    });
  }

  trackPatient(_index: number, patient: PatientOpticien): string {
    return patient.id;
  }
}
