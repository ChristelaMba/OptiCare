import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';

import { DossierVisuelService } from '../../../core/services/dossier-visuel';
import { messageErreurApi, messageErreurTelechargement } from '../../../core/utils/api-errors';
import { PatientDossier, FicheConsultationResume } from '../../../models/dossier-visuel.model';

const LIBELLE_STATUT: Record<string, string> = {
  en_cours: 'En cours',
  terminee: 'Terminée',
};

/**
 * 19/10/2026 : branché sur `GET /patients/{patientId}/consultations` (lecture seule) et
 * `GET /patients/{patientId}/dossier-pdf?cabinet_id=` (téléchargement). Plus de texte « arrive bientôt »,
 * plus de documents liés (l'API n'en fournit pas — ticket back n°8).
 */
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

  // Téléchargement du PDF
  cabinetPdfChoisi = signal<string | null>(null);
  telechargementEnCours = signal(false);
  erreurPdf = signal<string | null>(null);

  fiches = computed(() => this.dossier()?.fiches ?? []);
  nombreConsultations = computed(() => this.fiches().length);
  dossierVide = computed(() => !this.chargement() && this.fiches().length === 0);

  /** Cabinets distincts des consultations du patient (un PDF par cabinet). */
  cabinetsDuDossier = computed(() => {
    const vus = new Map<string, string>();
    for (const fiche of this.fiches()) {
      if (!vus.has(fiche.cabinetId)) {
        vus.set(fiche.cabinetId, fiche.cabinet ?? `Cabinet n°${fiche.cabinetId}`);
      }
    }
    return [...vus].map(([id, nom]) => ({ id, nom }));
  });

  cabinetPdfEffectif = computed(() => this.cabinetPdfChoisi() ?? this.cabinetsDuDossier()[0]?.id ?? null);

  ngOnInit(): void {
    this.chargerDossier();
  }

  chargerDossier(): void {
    this.chargement.set(true);
    this.erreur.set(null);

    this.dossierService.getMonDossier().subscribe({
      next: (data) => {
        this.dossier.set(data);
        this.ficheSelectionnee.set(data.fiches[0] ?? null);
        this.chargement.set(false);
      },
      error: (e: unknown) => {
        const http = e instanceof HttpErrorResponse ? e : null;
        const messageServeur = (http?.error as { message?: string } | null)?.message;
        this.erreur.set(
          http
            ? messageErreurApi(
                http,
                `Impossible de charger votre dossier visuel.${messageServeur ? ` Le serveur répond : ${messageServeur}` : ''}`,
              )
            : 'Impossible de charger votre dossier visuel.',
        );
        this.chargement.set(false);
      },
    });
  }

  selectionnerFiche(fiche: FicheConsultationResume): void {
    this.ficheSelectionnee.set(fiche);
  }

  libelleStatut(statut: string): string {
    return LIBELLE_STATUT[statut] ?? statut;
  }

  choisirCabinetPdf(cabinetId: string): void {
    this.cabinetPdfChoisi.set(cabinetId);
  }

  telechargerDossierPdf(): void {
    const patientId = this.dossier()?.patientId;
    const cabinetId = this.cabinetPdfEffectif();
    if (!patientId || !cabinetId || this.telechargementEnCours()) {
      return;
    }

    this.telechargementEnCours.set(true);
    this.erreurPdf.set(null);

    this.dossierService.telechargerDossierPdf(patientId, cabinetId).subscribe({
      next: ({ blob, nomFichier }) => {
        this.telechargementEnCours.set(false);
        const url = URL.createObjectURL(blob);
        const lien = document.createElement('a');
        lien.href = url;
        lien.download = nomFichier;
        lien.click();
        URL.revokeObjectURL(url);
      },
      error: async (e: HttpErrorResponse) => {
        this.telechargementEnCours.set(false);
        this.erreurPdf.set(await messageErreurTelechargement(e, 'Impossible de télécharger votre dossier.'));
      },
    });
  }

  nomComplet(): string {
    const patient = this.dossier();
    if (!patient) return '';
    return `${patient.prenom} ${patient.nom}`;
  }

  toggleSidebar(): void {
    this.sidebarOuverte.update((v) => !v);
  }

  fermerSidebar(): void {
    this.sidebarOuverte.set(false);
  }
}
