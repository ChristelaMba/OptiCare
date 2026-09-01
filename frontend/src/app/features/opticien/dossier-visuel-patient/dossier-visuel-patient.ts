import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { Patient } from '../../../models/patient.model';

interface FicheHistorique {
  id: string;
  date: string;
  heure?: string;
  motif: string;
  statut: 'terminee' | 'brouillon' | 'archivee';
  opticien: string;
  cabinet: string;
  diagnostic?: string;
}

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

  // 2026-09-02 : renommé de patientId — la route déclare
  // dossier-visuel-patient/:dossierVisuelId, et c'est bien cette valeur
  // (pas un patientId) qui est ensuite transmise à
  // nouvelle-fiche-consultation (voir nouvelleFiche() plus bas et
  // JOURNAL-MODIFICATIONS-PARTAGEES.md).
  dossierVisuelId = '';

  isLoading = signal(true);
  errorMessage = signal<string | null>(null);
  patient = signal<Patient | null>(null);
  fiches = signal<FicheHistorique[]>([]);
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
    // maintenant la vraie valeur de la route, plus une constante 'dv1'
    // déconnectée de l'URL (corrigé le 2026-09-02 avec le renommage du
    // paramètre de route).
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

      this.fiches.set([
        {
          id: '1',
          date: '2026-01-14',
          motif: 'Examen de la vue standard',
          statut: 'terminee',
          opticien: 'Dr. Marie Fotso',
          cabinet: 'OptiCare Centre',
          diagnostic: 'Presbytie débutante confirmée.'
        }
      ]);

      this.isLoading.set(false);
    }, 500);
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

  ouvrirFiche(fiche: FicheHistorique): void {
    this.router.navigate(['/opticien/facture-ordonnance', fiche.id]);
  }
}