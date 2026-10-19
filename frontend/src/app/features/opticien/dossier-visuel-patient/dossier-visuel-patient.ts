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
  // IDENTIFIANTS
  // =========================================================

  dossierVisuelId = '';

  patientId = '';


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

    const params = this.route.snapshot.queryParamMap;

    const dossierVisuelId =
      params.get('dossierVisuelId');

    const patientId =
      params.get('patientId');


    // =======================================================
    // DOSSIER VISUEL MANQUANT
    // =======================================================

    if (!dossierVisuelId) {

      this.errorMessage.set(
        'Identifiant du dossier visuel introuvable.'
      );

      this.isLoading.set(false);

      return;
    }


    // =======================================================
    // PATIENT MANQUANT
    // =======================================================

    if (!patientId) {

      this.errorMessage.set(
        'Identifiant du patient introuvable.'
      );

      this.isLoading.set(false);

      return;
    }


    this.dossierVisuelId = dossierVisuelId;

    this.patientId = patientId;


    this.chargerDossier();

  }


  // =========================================================
  // CHARGEMENT DU DOSSIER
  // =========================================================

  chargerDossier(): void {

    this.isLoading.set(true);

    this.errorMessage.set(null);


    this.ficheConsultationService
      .listerParPatient(this.patientId)
      .subscribe({

        next: (fiches) => {

          const fichesTriees =
            this.trierParDateDecroissante(fiches);

          this.fiches.set(fichesTriees);


          // =================================================
          // RECUPERATION DU PATIENT
          // =================================================
          //
          // Le backend documenté pour l'historique retourne
          // les consultations avec cabinet + opticien.
          //
          // Le résumé API ne documente pas de GET
          // /patients/{id} permettant de récupérer directement
          // le profil complet du patient.
          //
          // On construit donc ici les informations disponibles
          // depuis les données de consultation si elles existent.
          //

          const premiereFiche = fichesTriees[0];

          const patientDepuisFiche =
            this.extrairePatientDepuisFiche(premiereFiche);


          if (patientDepuisFiche) {

            this.patient.set(patientDepuisFiche);

          }


          this.isLoading.set(false);

        },

        error: (error) => {

          console.error(
            'Erreur chargement dossier patient :',
            error
          );

          this.fiches.set([]);

          this.patient.set(null);

          this.errorMessage.set(
            this.getMessageErreur(error)
          );

          this.isLoading.set(false);

        }

      });

  }


  // =========================================================
  // EXTRACTION DU PATIENT
  // =========================================================

  private extrairePatientDepuisFiche(
    fiche: FicheConsultationHistorique | undefined
  ): Patient | null {

    if (!fiche) {
      return null;
    }


    const consultation =
      fiche as FicheConsultationHistorique & {
        patient?: Partial<Patient>;
      };


    if (!consultation.patient) {
      return null;
    }


    return {
      id: String(
        consultation.patient.id ?? this.patientId
      ),

      nom:
        consultation.patient.nom ?? '',

      prenom:
        consultation.patient.prenom ?? '',

      age:
        consultation.patient.age,

      sexe:
        consultation.patient.sexe,

      telephone:
        consultation.patient.telephone,

      quartier:
        consultation.patient.quartier,

      estUtilisateur:
        consultation.patient.estUtilisateur ?? false,

      dossierVisuelId:
        this.dossierVisuelId

    } as Patient;

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
  // MESSAGE ERREUR
  // =========================================================

  private getMessageErreur(error: any): string {

    if (error?.error?.message) {

      return error.error.message;

    }


    if (error?.message) {

      return error.message;

    }


    if (error?.status === 401) {

      return 'Votre session a expiré. Veuillez vous reconnecter.';

    }


    if (error?.status === 403) {

      return 'Vous n’avez pas les droits nécessaires pour consulter ce dossier.';

    }


    if (error?.status === 404) {

      return 'Patient ou historique de consultations introuvable.';

    }


    return 'Impossible de charger le dossier patient.';

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
  // NOUVELLE FICHE
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
          dossierVisuelId: this.dossierVisuelId,
          patientId: this.patientId
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
            this.patientId

        }
      }
    );

  }


  // =========================================================
  // OUVRIR AU CLAVIER
  // =========================================================

  ouvrirFicheClavier(
    event: Event,
    fiche: FicheConsultationHistorique
  ): void {

    event.preventDefault();

    this.ouvrirFiche(fiche);

  }

}