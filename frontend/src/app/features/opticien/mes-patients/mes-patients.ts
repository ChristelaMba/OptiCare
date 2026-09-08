import {
  Component,
  computed,
  signal,
  inject
} from '@angular/core';

import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';

interface PatientOpticien {
  id: string;
  dossierVisuelId: string;
  prenom: string;
  nom: string;
  age: number;
  sexe: 'M' | 'F';
  telephone: string;
  quartier: string;
  derniereConsultation: string | null;
  nombreConsultations: number;
  statut: 'Actif' | 'À suivre';
}

@Component({
  selector: 'app-mes-patients',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './mes-patients.html',
  styleUrl: './mes-patients.css'
})
export class MesPatients {

  // =========================================================
  // INJECTION
  // =========================================================

  private readonly router = inject(Router);


  // =========================================================
  // ÉTAT
  // =========================================================

  recherche = signal('');

  filtreActif =
    signal<'tous' | 'actifs' | 'suivi'>('tous');

  patientSelectionne =
    signal<PatientOpticien | null>(null);


  // =========================================================
  // PATIENTS
  // =========================================================

  patients = signal<PatientOpticien[]>([
    {
      id: 'patient-001',
      dossierVisuelId: 'dv1',
      prenom: 'Jean',
      nom: 'Dupont',
      age: 45,
      sexe: 'M',
      telephone: '06 12 34 56 78',
      quartier: 'Bonanjo',
      derniereConsultation: '02/09/2026',
      nombreConsultations: 4,
      statut: 'Actif'
    },

    {
      id: 'patient-002',
      dossierVisuelId: 'dv2',
      prenom: 'Alice',
      nom: 'Mbarga',
      age: 32,
      sexe: 'F',
      telephone: '06 98 45 21 10',
      quartier: 'Akwa',
      derniereConsultation: '28/08/2026',
      nombreConsultations: 3,
      statut: 'Actif'
    },

    {
      id: 'patient-003',
      dossierVisuelId: 'dv3',
      prenom: 'Paul',
      nom: 'Ndi',
      age: 57,
      sexe: 'M',
      telephone: '06 55 32 14 87',
      quartier: 'Deido',
      derniereConsultation: '15/08/2026',
      nombreConsultations: 7,
      statut: 'À suivre'
    },

    {
      id: 'patient-004',
      dossierVisuelId: 'dv4',
      prenom: 'Sophie',
      nom: 'Kamdem',
      age: 28,
      sexe: 'F',
      telephone: '06 74 21 65 43',
      quartier: 'Makepe',
      derniereConsultation: '04/08/2026',
      nombreConsultations: 2,
      statut: 'Actif'
    },

    {
      id: 'patient-005',
      dossierVisuelId: 'dv5',
      prenom: 'Michel',
      nom: 'Tchoumi',
      age: 63,
      sexe: 'M',
      telephone: '06 82 11 43 90',
      quartier: 'Bonamoussadi',
      derniereConsultation: '22/07/2026',
      nombreConsultations: 6,
      statut: 'À suivre'
    },

    {
      id: 'patient-006',
      dossierVisuelId: 'dv6',
      prenom: 'Clara',
      nom: 'Ngono',
      age: 39,
      sexe: 'F',
      telephone: '06 61 29 38 74',
      quartier: 'Bali',
      derniereConsultation: null,
      nombreConsultations: 0,
      statut: 'Actif'
    }
  ]);


  // =========================================================
  // PATIENTS FILTRÉS
  // =========================================================

  patientsFiltres = computed(() => {

    const terme =
      this.recherche()
        .trim()
        .toLowerCase();

    const filtre =
      this.filtreActif();

    return this.patients().filter(patient => {

      const correspondRecherche =
        !terme ||
        patient.nom
          .toLowerCase()
          .includes(terme) ||

        patient.prenom
          .toLowerCase()
          .includes(terme) ||

        patient.telephone
          .toLowerCase()
          .includes(terme) ||

        patient.quartier
          .toLowerCase()
          .includes(terme);

      const correspondFiltre =
        filtre === 'tous' ||

        (
          filtre === 'actifs' &&
          patient.statut === 'Actif'
        ) ||

        (
          filtre === 'suivi' &&
          patient.statut === 'À suivre'
        );

      return (
        correspondRecherche &&
        correspondFiltre
      );
    });
  });


  // =========================================================
  // STATISTIQUES
  // =========================================================

  nombrePatients = computed(() =>
    this.patients().length
  );

  nombrePatientsActifs = computed(() =>
    this.patients().filter(
      patient => patient.statut === 'Actif'
    ).length
  );

  nombrePatientsASuivre = computed(() =>
    this.patients().filter(
      patient => patient.statut === 'À suivre'
    ).length
  );


  // =========================================================
  // INITIALES
  // =========================================================

  initiales(
    patient: PatientOpticien
  ): string {

    const prenom =
      patient.prenom
        ?.charAt(0)
        .toUpperCase() ?? '';

    const nom =
      patient.nom
        ?.charAt(0)
        .toUpperCase() ?? '';

    return `${prenom}${nom}`;
  }


  // =========================================================
  // COULEUR AVATAR
  // =========================================================

  couleurAvatar(index: number): string {

    const couleurs = [
      'avatar-blue',
      'avatar-green',
      'avatar-violet',
      'avatar-orange',
      'avatar-pink',
      'avatar-cyan'
    ];

    return couleurs[
      index % couleurs.length
    ];
  }


  // =========================================================
  // RECHERCHE
  // =========================================================

  rechercher(event: Event): void {

    const input =
      event.target as HTMLInputElement;

    this.recherche.set(input.value);
  }


  // =========================================================
  // FILTRE
  // =========================================================

  changerFiltre(
    filtre: 'tous' | 'actifs' | 'suivi'
  ): void {

    this.filtreActif.set(filtre);
  }


  // =========================================================
  // MENU PATIENT
  // =========================================================

  selectionnerPatient(
    patient: PatientOpticien
  ): void {

    this.patientSelectionne.set(patient);
  }


  fermerApercu(): void {

    this.patientSelectionne.set(null);
  }


  // =========================================================
  // VOIR DOSSIER VISUEL
  // =========================================================

  voirDossier(
    patient: PatientOpticien
  ): void {

    if (!patient?.dossierVisuelId) {
      console.error(
        'Identifiant du dossier visuel manquant.'
      );
      return;
    }

    this.router.navigate(
      ['/opticien/dossier-visuel-patient'],
      {
        queryParams: {
          dossierVisuelId:
            patient.dossierVisuelId
        }
      }
    );
  }


  // =========================================================
  // NOUVELLE CONSULTATION
  // =========================================================

  nouvelleConsultation(
    patient: PatientOpticien
  ): void {

    if (!patient?.dossierVisuelId) {
      console.error(
        'Impossible de créer une consultation : dossier visuel manquant.'
      );
      return;
    }

    this.router.navigate(
      ['/opticien/nouvelle-fiche-consultation'],
      {
        queryParams: {
          dossierVisuelId:
            patient.dossierVisuelId
        }
      }
    );
  }


  // =========================================================
  // FACTURES / ORDONNANCES
  // =========================================================

  voirFactures(
    patient: PatientOpticien
  ): void {

    this.router.navigate(
      ['/opticien/facture-ordonnance'],
      {
        queryParams: {
          patientId: patient.id,
          dossierVisuelId:
            patient.dossierVisuelId
        }
      }
    );
  }


  // =========================================================
  // COMMANDES
  // =========================================================

  voirCommandes(
    patient: PatientOpticien
  ): void {

    this.router.navigate(
      ['/opticien/suivi-commande'],
      {
        queryParams: {
          patientId: patient.id,
          dossierVisuelId:
            patient.dossierVisuelId
        }
      }
    );
  }


  // =========================================================
  // AJOUT PATIENT
  // =========================================================

  ajouterPatient(): void {

    console.log(
      'Ouverture future du formulaire d’ajout patient'
    );
  }


  // =========================================================
  // TRACK
  // =========================================================

  trackPatient(
    index: number,
    patient: PatientOpticien
  ): string {

    return patient.id;
  }
}