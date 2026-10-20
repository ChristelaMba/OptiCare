import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { catchError, of } from 'rxjs';

import { CabinetEligible, Avis, ApiAvisPatientBrut, COMMENTAIRE_MAX } from '../../../models/avis.model';
import { Avis as AvisService } from '../../../core/services/avis';
import { ConsultationService } from '../../../core/services/consultation';
import { Cabinet } from '../../../core/services/cabinet';
import { Auth } from '../../../core/services/auth';

@Component({
  selector: 'app-mes-avis',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './mes-avis.html',
  styleUrl: './mes-avis.css',
})
export class MesAvis {

  private readonly avisService = inject(AvisService);
  private readonly consultationService = inject(ConsultationService);
  private readonly cabinetService = inject(Cabinet);
  private readonly auth = inject(Auth);

  /* =======================================================
     ÉTAT
  ======================================================== */

  chargement = signal(true);

  /** Erreur de chargement de la liste des avis publiés. */
  erreur = signal<string | null>(null);

  /** Erreur d'une action d'écriture (création/modification/suppression). */
  erreurAction = signal<string | null>(null);

  /**
   * Établissements notables : ceux d'une consultation **terminée** du patient
   * (`POST /avis` exige un `consultation_id` terminé). La liste vient de
   * `GET /patients/{id}/consultations`, filtrée sur `statut === 'terminee'` et
   * dédoublonnée par cabinet. Tant que cette route est bloquée côté serveur
   * (bug CheckRole) ou qu'aucune consultation n'est terminée, la liste reste
   * vide et le bouton « Laisser un avis » n'apparaît pas — aucun établissement
   * n'est inventé.
   */
  cabinetsEligibles = signal<CabinetEligible[]>([]);

  /** Avis publiés par le patient (`GET /patient/avis`). */
  avisPublies = signal<Avis[]>([]);

  cabinetEnCoursDeNotation = signal<CabinetEligible | null>(null);
  avisEnEdition = signal<Avis | null>(null);

  noteChoisie = signal(0);
  noteSurvolee = signal(0);
  commentaireSaisi = '';

  enSoumission = signal(false);

  /** Bornes affichées/max du commentaire, partagées avec le backend (1000 caractères). */
  readonly commentaireMax = COMMENTAIRE_MAX;

  /** Un commentaire trop long est refusé avant l'appel réseau (le backend renverrait 422). */
  get commentaireTropLong(): boolean {
    return this.commentaireSaisi.length > COMMENTAIRE_MAX;
  }

  get formulaireValide(): boolean {
    return this.noteChoisie() > 0 && this.commentaireSaisi.trim().length > 0 && !this.commentaireTropLong;
  }

  constructor() {
    this.charger();
  }

  etoiles(n: number): number[] {
    return Array.from({ length: n }, (_, i) => i + 1);
  }

  /* =======================================================
     CHARGEMENT
  ======================================================== */

  /** Recharge les avis publiés, puis les cabinets éligibles (consultations terminées). */
  charger(): void {
    this.chargement.set(true);
    this.erreur.set(null);

    this.avisService.listerMesAvis().subscribe({
      next: (bruts) => {
        this.avisPublies.set(bruts.map(MesAvis.depuisApi));
        this.chargerEligibles();
        this.chargement.set(false);
      },
      error: () => {
        this.erreur.set('Impossible de charger vos avis pour le moment.');
        this.chargement.set(false);
      },
    });
  }

  /**
   * Établissements éligibles = cabinets des consultations terminées du patient,
   * moins celles déjà notées (un seul avis par consultation). Aucune donnée
   * inventée : patient inconnu ou route bloquée → liste vide.
   */
  private chargerEligibles(): void {
    const patientId = this.auth.utilisateur()?.patientId;

    if (!patientId) {
      this.cabinetsEligibles.set([]);
      return;
    }

    this.consultationService
      .listerParPatient(patientId)
      .pipe(catchError(() => of([])))
      .subscribe((consultations) => {
        const terminees = consultations.filter((c) => c.statut === 'terminee');

        if (terminees.length === 0) {
          this.cabinetsEligibles.set([]);
          return;
        }

        const cabinetsNotes = new Set(this.avisPublies().map((avis) => avis.cabinetId));

        // Les consultations ne portent que `cabinetId` : les noms viennent de
        // `GET /cabinets` (public).
        this.cabinetService
          .listerPublics()
          .pipe(catchError(() => of([])))
          .subscribe((cabinets) => {
            const nomParId = new Map(cabinets.map((c) => [c.id, c.nom]));
            const parCabinet = new Map<string, CabinetEligible>();

            for (const consultation of terminees) {
              const cabinetId = consultation.cabinetId;

              if (parCabinet.has(cabinetId) || cabinetsNotes.has(cabinetId)) {
                continue;
              }

              parCabinet.set(cabinetId, {
                id: cabinetId,
                nom: nomParId.get(cabinetId) ?? 'Cabinet',
                dateVisite: MesAvis.dateFr(consultation.date),
                consultationId: consultation.id,
              });
            }

            this.cabinetsEligibles.set([...parCabinet.values()]);
          });
      });
  }

  /* =======================================================
     FORMULAIRE
  ======================================================== */

  ouvrirFormulaire(cabinet: CabinetEligible): void {
    this.erreurAction.set(null);
    this.avisEnEdition.set(null);
    this.cabinetEnCoursDeNotation.set(cabinet);
    this.noteChoisie.set(0);
    this.commentaireSaisi = '';
  }

  ouvrirEdition(avis: Avis): void {
    this.erreurAction.set(null);
    this.cabinetEnCoursDeNotation.set(null);
    this.avisEnEdition.set(avis);
    this.noteChoisie.set(avis.note);
    this.commentaireSaisi = avis.commentaire;
  }

  annulerFormulaire(): void {
    this.cabinetEnCoursDeNotation.set(null);
    this.avisEnEdition.set(null);
    this.noteChoisie.set(0);
    this.commentaireSaisi = '';
  }

  survolerEtoile(etoile: number): void {
    this.noteSurvolee.set(etoile);
  }

  quitterSurvol(): void {
    this.noteSurvolee.set(0);
  }

  choisirNote(etoile: number): void {
    this.noteChoisie.set(etoile);
  }

  /* =======================================================
     ÉCRITURES (réelles)
  ======================================================== */

  /** Crée (`POST /avis`) ou modifie (`PATCH /avis/{id}`) selon le contexte. */
  publier(): void {
    if (!this.formulaireValide) {
      return;
    }

    this.erreurAction.set(null);
    this.enSoumission.set(true);

    const edition = this.avisEnEdition();
    const cabinet = this.cabinetEnCoursDeNotation();
    const note = this.noteChoisie();
    const commentaire = this.commentaireSaisi;

    if (edition) {
      this.avisService.modifier(edition.id, { note, commentaire }).subscribe({
        next: (brut) => {
          const misAJour = MesAvis.depuisApi(brut);
          this.avisPublies.update((liste) =>
            liste.map((a) => (a.id === edition.id ? { ...misAJour, id: edition.id } : a))
          );
          this.enSoumission.set(false);
          this.annulerFormulaire();
        },
        error: (erreur) => this.echecAction(MesAvis.messageErreurEcriture(erreur, 'enregistrer')),
      });
      return;
    }

    if (!cabinet) {
      this.enSoumission.set(false);
      return;
    }

    this.avisService
      .creer({ consultation_id: Number(cabinet.consultationId), note, commentaire })
      .subscribe({
        next: (brut) => {
          this.avisPublies.update((liste) => [...liste, MesAvis.depuisApi(brut)]);
          this.enSoumission.set(false);
          this.annulerFormulaire();
          // Une consultation ne donne qu'un avis : l'établissement quitte la liste d'attente.
          this.cabinetsEligibles.update((liste) =>
            liste.filter((c) => c.consultationId !== cabinet.consultationId)
          );
        },
        error: (erreur) => this.echecAction(MesAvis.messageErreurEcriture(erreur, 'publier')),
      });
  }

  /** `DELETE /avis/{id}` — la carte n'est retirée qu'après le succès côté serveur. */
  supprimer(avis: Avis): void {
    this.erreurAction.set(null);

    this.avisService.supprimer(avis.id).subscribe({
      next: () => {
        this.avisPublies.update((liste) => liste.filter((a) => a.id !== avis.id));
      },
      error: () => this.echecAction('Impossible de supprimer cet avis pour le moment.'),
    });
  }

  private echecAction(message: string): void {
    this.erreurAction.set(message);
    this.enSoumission.set(false);
  }

  /* =======================================================
     NORMALISATION
  ======================================================== */

  private static depuisApi(brut: ApiAvisPatientBrut): Avis {
    return {
      id: String(brut.id),
      cabinetId:
        brut.cabinet?.id != null
          ? String(brut.cabinet.id)
          : brut.cabinet_id != null
            ? String(brut.cabinet_id)
            : '',
      cabinetNom: brut.cabinet?.nom ?? 'Cabinet',
      note: brut.note,
      commentaire: brut.commentaire ?? '',
      datePublication: MesAvis.dateFr(brut.created_at),
    };
  }

  private static dateFr(iso: string): string {
    const date = new Date(iso);
    return Number.isNaN(date.getTime()) ? '' : date.toLocaleDateString('fr-FR');
  }

  /**
   * Message prêt à afficher pour un échec d'écriture sur un avis.
   *
   * Le contrat backend distingue :
   * - **422** → erreur de validation (note hors 1–5, commentaire trop long, champ manquant) ;
   * - **500** → erreur métier (consultation non terminée, avis déjà donné, avis non
   *   propriétaire…) — le message du serveur est alors le plus précis, on le préfère.
   */
  private static messageErreurEcriture(erreur: unknown, action: 'publier' | 'enregistrer'): string {
    const corps = erreur as { status?: number; error?: { message?: string } };
    const messageServeur = corps?.error?.message?.trim();

    if (corps?.status === 422) {
      return (
        messageServeur ||
        'Avis non enregistré : vérifiez la note (1 à 5) et la longueur du commentaire.'
      );
    }

    if (corps?.status === 500) {
      return (
        messageServeur ||
        'Avis non enregistré : la consultation doit être terminée et ne peut recevoir qu’un seul avis.'
      );
    }

    return action === 'publier'
      ? 'Impossible de publier votre avis pour le moment.'
      : 'Impossible d’enregistrer votre avis pour le moment.';
  }
}
