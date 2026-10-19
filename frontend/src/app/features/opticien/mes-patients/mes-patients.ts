import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { forkJoin, of, catchError } from 'rxjs';
import { Router } from '@angular/router';

import { Auth } from '../../../core/services/auth';
import { ConsultationService } from '../../../core/services/consultation';
import { PatientsCabinet } from '../../../core/services/patients-cabinet';
import { messageErreurApi } from '../../../core/utils/api-errors';

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
 * ni quartier, ni statut « actif / à suivre » : ces éléments (et le bouton « Nouveau patient », sans route) sont retirés.
 * Nombre et date de dernière consultation viennent de `GET /cabinets/{id}/consultations` (leur échec ne bloque pas la liste).
 */
@Component({
  selector: 'app-mes-patients',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './mes-patients.html',
  styleUrl: './mes-patients.css',
})
export class MesPatients implements OnInit {
  private readonly router = inject(Router);
  private readonly auth = inject(Auth);
  private readonly patientsService = inject(PatientsCabinet);
  private readonly consultationService = inject(ConsultationService);

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

  trackPatient(_index: number, patient: PatientOpticien): string {
    return patient.id;
  }
}
