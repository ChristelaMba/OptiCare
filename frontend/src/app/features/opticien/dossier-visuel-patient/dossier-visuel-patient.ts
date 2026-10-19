import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { forkJoin } from 'rxjs';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';

import { Auth } from '../../../core/services/auth';
import { ConsultationService } from '../../../core/services/consultation';
import { PatientCabinet, PatientsCabinet } from '../../../core/services/patients-cabinet';
import { messageErreurApi } from '../../../core/utils/api-errors';
import { ConsultationOpticien } from '../../../models/consultation.model';

/**
 * Dossier d'un patient côté opticien (20/10/2026) : `?patientId=` ; identité depuis `GET /cabinets/{id}/patients`
 * (téléphone, ville, e-mail — l'API ne fournit ni âge, ni sexe, ni quartier), historique depuis
 * `GET /patients/{id}/consultations` (tous cabinets). Une fiche s'ouvre dans la fiche de consultation
 * (`?consultationId=`) : modifiable si `en_cours`, lecture seule sinon.
 */
@Component({
  selector: 'app-dossier-visuel-patient',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './dossier-visuel-patient.html',
  styleUrl: './dossier-visuel-patient.css',
})
export class DossierVisuelPatient implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly auth = inject(Auth);
  private readonly consultationService = inject(ConsultationService);
  private readonly patientsService = inject(PatientsCabinet);

  patientId = '';

  isLoading = signal(true);
  errorMessage = signal<string | null>(null);

  patient = signal<PatientCabinet | null>(null);
  fiches = signal<ConsultationOpticien[]>([]);

  nombreFiches = computed(() => this.fiches().length);
  derniereFiche = computed(() => this.fiches()[0] ?? null);

  ngOnInit(): void {
    const id = this.route.snapshot.queryParamMap.get('patientId');
    if (!id) {
      this.errorMessage.set('Identifiant du patient introuvable.');
      this.isLoading.set(false);
      return;
    }
    this.patientId = id;
    this.chargerDossier();
  }

  chargerDossier(): void {
    const cabinetId = this.auth.utilisateur()?.cabinetId;
    if (!cabinetId) {
      this.errorMessage.set("Aucun cabinet rattaché à ce compte — impossible d'afficher le dossier.");
      this.isLoading.set(false);
      return;
    }

    this.isLoading.set(true);
    this.errorMessage.set(null);

    forkJoin({
      patients: this.patientsService.lister(cabinetId),
      fiches: this.consultationService.listerParPatient(this.patientId),
    }).subscribe({
      next: ({ patients, fiches }) => {
        const patient = patients.find((p) => p.id === this.patientId) ?? null;
        if (!patient) {
          this.errorMessage.set("Ce patient n'appartient pas à votre cabinet.");
          this.isLoading.set(false);
          return;
        }
        this.patient.set(patient);
        // `date` (YYYY-MM-DD) puis id : du plus récent au plus ancien.
        this.fiches.set([...fiches].sort((a, b) => b.date.localeCompare(a.date) || Number(b.id) - Number(a.id)));
        this.isLoading.set(false);
      },
      error: (e: HttpErrorResponse) => {
        const messageServeur = (e.error as { message?: string } | null)?.message;
        this.errorMessage.set(
          messageErreurApi(e, `Impossible de charger le dossier.${messageServeur ? ` Le serveur répond : ${messageServeur}` : ' Réessayez plus tard.'}`),
        );
        this.isLoading.set(false);
      },
    });
  }

  initiales(patient: PatientCabinet): string {
    return `${patient.prenom?.charAt(0) ?? ''}${patient.nom?.charAt(0) ?? ''}`.toUpperCase();
  }

  nouvelleFiche(): void {
    if (!this.patientId) return;
    void this.router.navigate(['/opticien/nouvelle-fiche-consultation'], { queryParams: { patientId: this.patientId } });
  }

  ouvrirFiche(fiche: ConsultationOpticien): void {
    void this.router.navigate(['/opticien/nouvelle-fiche-consultation'], { queryParams: { consultationId: fiche.id } });
  }

  ouvrirFicheClavier(event: Event, fiche: ConsultationOpticien): void {
    event.preventDefault();
    this.ouvrirFiche(fiche);
  }
}
