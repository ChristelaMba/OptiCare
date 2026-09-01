import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { Patient } from '../../../models/patient.model';
import { FicheConsultationHistorique } from '../../../models/fiche-consultation.model';
import { FicheConsultationService } from '../../../core/services/fiche-consultation';

@Component({
  selector: 'app-dossier-visuel-patient',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './dossier-visuel-patient.html',
  styleUrl: './dossier-visuel-patient.css'
})
export class DossierVisuelPatient implements OnInit {

  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly ficheConsultationService = inject(FicheConsultationService);

  // 2026-09-02 : renommé de patientId — la route déclare
  // dossier-visuel-patient/:dossierVisuelId, et c'est bien cette valeur
  // (pas un patientId) qui est ensuite transmise à
  // nouvelle-fiche-consultation (voir nouvelleFiche() plus bas et
  // JOURNAL-MODIFICATIONS-PARTAGEES.md).
  dossierVisuelId = '';

  isLoading = signal(true);
  errorMessage = signal<string | null>(null);
  patient = signal<Patient | null>(null);
  fiches = signal<FicheConsultationHistorique[]>([]);
  // Non touché (2026-09-02, B3) : concept séparé de FicheConsultation.modifiable
  // (celui-ci est par fiche, dossierModifiable est au niveau du dossier
  // entier) — voir JOURNAL-MODIFICATIONS-PARTAGEES.md.
  dossierModifiable = signal(true);

  nombreFiches = computed(() => this.fiches().length);
  derniereFiche = computed(() => this.fiches()[0]);

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('dossierVisuelId');
    if (id) {
      this.dossierVisuelId = id;
    }
    this.chargerDossier();
  }

  chargerDossier(): void {
    this.isLoading.set(true);
    this.errorMessage.set(null);

    // Mock en attendant l'API Laravel — id patient laissé fixe (aucune
    // vraie référence patient disponible ici) ; dossierVisuelId reflète
    // la vraie valeur de la route (corrigé le 2026-09-02 avec le
    // renommage du paramètre de route, B1).
    setTimeout(() => {
      this.patient.set({
        id: 'patient-mock-1',
        nom: 'Dupont',
        prenom: 'Jean',
        age: 45,
        sexe: 'M',
        telephone: '06 12 34 56 78',
        quartier: 'Bonanjo',
        estUtilisateur: false,
        dossierVisuelId: this.dossierVisuelId || 'dv1'
      } as Patient);

      this.isLoading.set(false);
    }, 500);

    // Branché sur le vrai service (2026-09-02, B3) — remplace le tableau
    // FicheHistorique codé en dur. Échec traité séparément de la carte
    // patient : une erreur ici laisse juste l'historique vide (état
    // "Aucun historique disponible" déjà existant), plutôt que de
    // cacher toute la page derrière errorMessage.
    this.ficheConsultationService.listerParDossierVisuel(this.dossierVisuelId).subscribe({
      next: (fiches) => this.fiches.set(fiches),
      error: () => this.fiches.set([])
    });
  }

  initiales(patient: Patient): string {
    return `${patient.prenom.charAt(0)}${patient.nom.charAt(0)}`.toUpperCase();
  }

  nouvelleFiche(): void {
    // 2026-09-02 (B1) : la route de nouvelle-fiche-consultation attend
    // dossierVisuelId, plus patientId — voir JOURNAL-MODIFICATIONS-PARTAGEES.md.
    // On a déjà la vraie valeur (celle de notre propre route, renommée
    // le même jour), pas besoin de repasser par patient().
    if (!this.dossierVisuelId) {
      return;
    }
    this.router.navigate(['/opticien/nouvelle-fiche-consultation', this.dossierVisuelId]);
  }

  ouvrirFiche(fiche: FicheConsultationHistorique): void {
    this.router.navigate(['/opticien/facture-ordonnance', fiche.id]);
  }
}