import {
  Component,
  OnInit,
  inject,
  signal,
  computed
} from '@angular/core';

import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';

import { DossierVisuelService } from '../../../core/services/dossier-visuel';
import {
  PatientDossier,
  FicheConsultationResume,
  DocumentMedical
} from '../../../models/dossier-visuel.model';

@Component({
  selector: 'app-dossier-visuel',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './dossier-visuel.html',
  styleUrl: './dossier-visuel.css',
})
export class DossierVisuel implements OnInit {

  private readonly dossierService = inject(DossierVisuelService);

  dossier = signal<PatientDossier | null>(null);
  chargement = signal(true);
  erreur = signal<string | null>(null);
  ficheSelectionnee = signal<FicheConsultationResume | null>(null);

  // Etat de la sidebar mobile
  sidebarOuverte = signal(false);

  fiches = computed(() => this.dossier()?.fiches ?? []);
  nombreConsultations = computed(() => this.fiches().length);
  dossierVide = computed(() => !this.chargement() && this.fiches().length === 0);
  historiqueDisponible = computed(() => this.dossier()?.historiqueDisponible ?? false);

  // dossierPdf appartient à la fiche de consultation sélectionnée.
  dossierPdfDisponible = computed(() => !!this.ficheSelectionnee()?.dossierPdf);

  ngOnInit(): void {
    this.chargerDossier();
  }

  chargerDossier(): void {
    this.chargement.set(true);
    this.erreur.set(null);

    this.dossierService.getMonDossier().subscribe({
      next: (data) => {
        this.dossier.set(data);

        if (data.fiches && data.fiches.length > 0) {
          this.ficheSelectionnee.set(data.fiches[0]);
        }

        this.chargement.set(false);
      },
      error: () => {
        this.erreur.set('Impossible de charger votre dossier visuel.');
        this.chargement.set(false);
      }
    });
  }

  selectionnerFiche(fiche: FicheConsultationResume): void {
    this.ficheSelectionnee.set(fiche);
  }

  telechargerDocument(documentMedical?: DocumentMedical): void {
    if (!documentMedical) {
      this.erreur.set('Aucun document disponible pour le téléchargement.');
      return;
    }

    if (documentMedical.url) {
      window.open(documentMedical.url, '_blank');
      return;
    }

    // Aucune route de téléchargement de document n'existe côté API
    // (ticket back n°8) : l'ancien appel vers localhost est retiré.
    this.erreur.set("Le téléchargement de documents n'est pas encore disponible.");
  }

  nomComplet(): string {
    const patient = this.dossier();
    if (!patient) return '';
    return `${patient.prenom} ${patient.nom}`;
  }

  toggleSidebar(): void {
    this.sidebarOuverte.update(v => !v);
  }

  fermerSidebar(): void {
    this.sidebarOuverte.set(false);
  }

}