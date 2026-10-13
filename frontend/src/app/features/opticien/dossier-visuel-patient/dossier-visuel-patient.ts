import {
  Component,
  OnInit,
  inject,
  signal,
  computed
} from '@angular/core';

import { CommonModule } from '@angular/common';

import {
  ActivatedRoute,
  Router,
  RouterLink
} from '@angular/router';

import { Patient } from '../../../models/patient.model';

import {
  FicheConsultationHistorique
} from '../../../models/fiche-consultation.model';

import {
  FicheConsultationService
} from '../../../core/services/fiche-consultation';


@Component({
  selector: 'app-dossier-visuel-patient',
  standalone: true,
  imports: [
    CommonModule,
    RouterLink
  ],
  templateUrl: './dossier-visuel-patient.html',
  styleUrl: './dossier-visuel-patient.css'
})
export class DossierVisuelPatient implements OnInit {

  private readonly route = inject(ActivatedRoute);

  private readonly router = inject(Router);

  private readonly ficheConsultationService =
    inject(FicheConsultationService);


  // =========================================================
  // IDENTIFIANT DU DOSSIER
  // =========================================================

  dossierVisuelId = '';


  // =========================================================
  // ETAT DE LA PAGE
  // =========================================================

  isLoading = signal(true);

  errorMessage = signal<string | null>(null);


  // =========================================================
  // PATIENT
  // =========================================================

  patient = signal<Patient | null>(null);


  // =========================================================
  // FICHES DE CONSULTATION
  // =========================================================

  fiches = signal<FicheConsultationHistorique[]>([]);

  dossierModifiable = signal(true);


  // =========================================================
  // COMPUTED
  // =========================================================

  nombreFiches = computed(() => {

    return this.fiches().length;

  });


  derniereFiche = computed(() => {

    return this.fiches()[0] ?? null;

  });


  // =========================================================
  // INITIALISATION
  // =========================================================

  ngOnInit(): void {

    /*
     * IMPORTANT :
     *
     * La route est :
     *
     * /opticien/dossier-visuel-patient
     *
     * et non :
     *
     * /opticien/dossier-visuel-patient/:dossierVisuelId
     *
     * Donc on récupère l'identifiant
     * depuis les query params.
     *
     * Exemple :
     *
     * /opticien/dossier-visuel-patient?dossierVisuelId=dv2
     */

    const id =
      this.route.snapshot
        .queryParamMap
        .get('dossierVisuelId');


    // Aucun identifiant trouvé
    if (!id) {

      this.errorMessage.set(
        'Identifiant du dossier visuel introuvable.'
      );

      this.isLoading.set(false);

      return;
    }


    // On conserve l'identifiant
    this.dossierVisuelId = id;


    // Chargement du dossier
    this.chargerDossier();

  }


  // =========================================================
  // CHARGEMENT DU DOSSIER
  // =========================================================

  chargerDossier(): void {

    this.isLoading.set(true);

    this.errorMessage.set(null);


    /*
     * =======================================================
     * DONNEES FRONTEND TEMPORAIRES
     * =======================================================
     *
     * Pour le moment, il n'y a pas encore de récupération
     * réelle depuis le backend pour cette partie.
     *
     * On associe donc chaque dossier visuel à son patient.
     *
     * dv1 -> Jean Dupont
     * dv2 -> Alice Mbarga
     * dv3 -> Paul Ndi
     * dv4 -> Sophie Kamdem
     * dv5 -> Michel Tchoumi
     * dv6 -> Clara Ngono
     */

    setTimeout(() => {

      const patientsMock: Record<string, Patient> = {


        // ===================================================
        // JEAN DUPONT
        // ===================================================

        dv1: {
          id: 'patient-001',
          nom: 'Dupont',
          prenom: 'Jean',
          age: 45,
          sexe: 'M',
          telephone: '06 12 34 56 78',
          quartier: 'Bonanjo',
          estUtilisateur: false,
          dossierVisuelId: 'dv1'
        } as Patient,


        // ===================================================
        // ALICE MBARGA
        // ===================================================

        dv2: {
          id: 'patient-002',
          nom: 'Mbarga',
          prenom: 'Alice',
          age: 32,
          sexe: 'F',
          telephone: '06 98 45 21 10',
          quartier: 'Akwa',
          estUtilisateur: false,
          dossierVisuelId: 'dv2'
        } as Patient,


        // ===================================================
        // PAUL NDI
        // ===================================================

        dv3: {
          id: 'patient-003',
          nom: 'Ndi',
          prenom: 'Paul',
          age: 57,
          sexe: 'M',
          telephone: '06 55 32 14 87',
          quartier: 'Deido',
          estUtilisateur: false,
          dossierVisuelId: 'dv3'
        } as Patient,


        // ===================================================
        // SOPHIE KAMDEM
        // ===================================================

        dv4: {
          id: 'patient-004',
          nom: 'Kamdem',
          prenom: 'Sophie',
          age: 28,
          sexe: 'F',
          telephone: '06 74 21 65 43',
          quartier: 'Makepe',
          estUtilisateur: false,
          dossierVisuelId: 'dv4'
        } as Patient,


        // ===================================================
        // MICHEL TCHOUMI
        // ===================================================

        dv5: {
          id: 'patient-005',
          nom: 'Tchoumi',
          prenom: 'Michel',
          age: 63,
          sexe: 'M',
          telephone: '06 82 11 43 90',
          quartier: 'Bonamoussadi',
          estUtilisateur: false,
          dossierVisuelId: 'dv5'
        } as Patient,


        // ===================================================
        // CLARA NGONO
        // ===================================================

        dv6: {
          id: 'patient-006',
          nom: 'Ngono',
          prenom: 'Clara',
          age: 39,
          sexe: 'F',
          telephone: '06 61 29 38 74',
          quartier: 'Bali',
          estUtilisateur: false,
          dossierVisuelId: 'dv6'
        } as Patient

      };


      // =====================================================
      // RECHERCHE DU PATIENT
      // =====================================================

      const patient =
        patientsMock[this.dossierVisuelId];


      // =====================================================
      // PATIENT INTROUVABLE
      // =====================================================

      if (!patient) {

        this.patient.set(null);

        this.errorMessage.set(
          'Patient introuvable pour ce dossier visuel.'
        );

        this.isLoading.set(false);

        return;
      }


      // =====================================================
      // PATIENT TROUVE
      // =====================================================

      this.patient.set(patient);

      this.isLoading.set(false);

    }, 300);


    // =======================================================
    // CHARGEMENT DES FICHES DE CONSULTATION
    // =======================================================

    this.ficheConsultationService
      .listerParDossierVisuel(
        this.dossierVisuelId
      )
      .subscribe({

        next: (fiches) => {

          const fichesTriees =
            this.trierParDateDecroissante(fiches);

          this.fiches.set(fichesTriees);

        },

        error: (error) => {

          console.error(
            'Erreur chargement fiches :',
            error
          );

          /*
           * Si le backend n'est pas encore disponible
           * ou ne retourne rien, on conserve simplement
           * une liste vide.
           */

          this.fiches.set([]);

        }

      });

  }


  // =========================================================
  // TRI DES FICHES
  // =========================================================

  private trierParDateDecroissante(
    fiches: FicheConsultationHistorique[]
  ): FicheConsultationHistorique[] {

    return [...fiches].sort((a, b) => {

      const dateA =
        new Date(a.date).getTime();

      const dateB =
        new Date(b.date).getTime();

      return dateB - dateA;

    });

  }


  // =========================================================
  // INITIALES DU PATIENT
  // =========================================================

  initiales(patient: Patient): string {

    const prenom =
      patient.prenom?.charAt(0) ?? '';

    const nom =
      patient.nom?.charAt(0) ?? '';

    return `${prenom}${nom}`.toUpperCase();

  }


  // =========================================================
  // NOUVELLE FICHE DE CONSULTATION
  // =========================================================

  nouvelleFiche(): void {

    if (!this.dossierVisuelId) {

      console.error(
        'Impossible de créer une fiche : dossierVisuelId manquant.'
      );

      return;
    }


    this.router.navigate(
      ['/opticien/nouvelle-fiche-consultation'],
      {
        queryParams: {
          dossierVisuelId: this.dossierVisuelId
        }
      }
    );

  }


  // =========================================================
  // OUVRIR UNE FICHE
  // =========================================================

  ouvrirFiche(
    fiche: FicheConsultationHistorique
  ): void {

    if (!fiche?.id) {

      console.error(
        'Impossible d’ouvrir la fiche : identifiant manquant.'
      );

      return;
    }


    this.router.navigate(
      ['/opticien/facture-ordonnance'],
      {
        queryParams: {
          ficheId: fiche.id,

          dossierVisuelId:
            this.dossierVisuelId,

          patientId:
            this.patient()?.id ?? ''
        }
      }
    );

  }


  // =========================================================
  // OUVRIR UNE FICHE AU CLAVIER
  // =========================================================

  ouvrirFicheClavier(
    event: Event,
    fiche: FicheConsultationHistorique
  ): void {

    event.preventDefault();

    this.ouvrirFiche(fiche);

  }

}