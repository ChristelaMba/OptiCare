import { Component, inject, signal } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';

import { Auth } from '../../../core/services/auth';
import { CreerPatientPayload, PatientsCabinet } from '../../../core/services/patients-cabinet';
import { erreursParChamp, messageErreurApi } from '../../../core/utils/api-errors';

const CHAMPS_API = ['nom', 'prenom', 'telephone', 'email', 'ville', 'date_naissance', 'adresse'];

/**
 * 20/10/2026 : branché sur `POST /cabinets/{cabinetId}/patients` (ROUTES-API-LIONEL §7.2) via `PatientsCabinet`,
 * le service déjà utilisé par l'opticien. Obligatoires : nom, prénom, téléphone (+237 suivi de 9 chiffres) ;
 * facultatifs : e-mail, ville, date de naissance, adresse. Champs retirés (inconnus de l'API) : sexe, profession,
 * quartier, WhatsApp, nombre d'enfants.
 */
@Component({
  selector: 'app-enregistrement-patient',
  standalone: true,
  imports: [ReactiveFormsModule, RouterLink],
  templateUrl: './enregistrement-patient.html',
  styleUrl: './enregistrement-patient.css',
})
export class EnregistrementPatient {
  private readonly fb = inject(FormBuilder);
  private readonly auth = inject(Auth);
  private readonly patientsService = inject(PatientsCabinet);

  private readonly cabinetId = this.auth.utilisateur()?.cabinetId ?? null;

  readonly isSubmitting = signal(false);
  readonly successMessage = signal('');
  readonly errorMessage = signal('');
  /** Erreurs 422 du serveur, par champ (`telephone`, `email`…). */
  readonly erreursChamps = signal<Record<string, string>>({});

  readonly patientForm = this.fb.nonNullable.group({
    nom: ['', [Validators.required, Validators.minLength(2)]],
    prenom: ['', [Validators.required, Validators.minLength(2)]],
    telephone: ['', [Validators.required, Validators.pattern(/^\+237\d{9}$/)]],
    email: ['', Validators.email],
    ville: [''],
    dateNaissance: [''],
    adresse: [''],
  });

  get f() {
    return this.patientForm.controls;
  }

  /** Téléphone saisi avec espaces, points ou tirets : normalisé en « +237XXXXXXXXX ». */
  normaliserTelephone(): void {
    const champ = this.f.telephone;
    const nettoye = champ.value.replace(/[\s.-]/g, '');
    if (nettoye !== champ.value) champ.setValue(nettoye);
  }

  submit(): void {
    if (this.isSubmitting()) return;
    this.successMessage.set('');
    this.errorMessage.set('');
    this.erreursChamps.set({});
    this.normaliserTelephone();

    if (this.patientForm.invalid || !this.cabinetId) {
      this.patientForm.markAllAsTouched();
      this.errorMessage.set(
        this.cabinetId ? 'Veuillez vérifier les informations obligatoires.' : "Aucun cabinet rattaché à ce compte — impossible d'enregistrer un patient.",
      );
      return;
    }

    this.isSubmitting.set(true);
    const v = this.patientForm.getRawValue();
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
      next: (patient) => {
        this.isSubmitting.set(false);
        this.resetForm();
        this.successMessage.set(`Le patient ${patient.nomComplet} a été enregistré dans votre cabinet.`);
      },
      error: (e: HttpErrorResponse) => {
        this.isSubmitting.set(false);
        const champs = erreursParChamp(e);
        const sousChamp: Record<string, string> = {};
        const autres: string[] = [];
        for (const [cle, message] of Object.entries(champs)) {
          if (CHAMPS_API.includes(cle)) sousChamp[cle] = message;
          else autres.push(message);
        }
        this.erreursChamps.set(sousChamp);

        if (e.status === 422 && (autres.length > 0 || Object.keys(sousChamp).length > 0)) {
          this.errorMessage.set(autres.length > 0 ? autres.join(' ') : 'Certains champs sont refusés par le serveur. Corrigez-les puis réessayez.');
        } else {
          const messageServeur = (e.error as { message?: string } | null)?.message;
          this.errorMessage.set(
            messageErreurApi(e, `L'enregistrement du patient a échoué.${messageServeur ? ` Le serveur répond : ${messageServeur}` : ' Réessayez plus tard.'}`),
          );
        }
      },
    });
  }

  /** Vide le formulaire (bouton « Annuler » et après un enregistrement réussi). */
  resetForm(): void {
    this.patientForm.reset({ nom: '', prenom: '', telephone: '', email: '', ville: '', dateNaissance: '', adresse: '' });
    this.errorMessage.set('');
    this.erreursChamps.set({});
  }
}
