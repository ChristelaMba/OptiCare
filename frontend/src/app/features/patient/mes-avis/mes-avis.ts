import { Component, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { CabinetEligible, Avis } from '../../../models/avis.model';

@Component({
  selector: 'app-mes-avis',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './mes-avis.html',
  styleUrl: './mes-avis.css',
})
export class MesAvis {

  /**
   * Établissements pour lesquels un avis est possible : ceux d'une consultation
   * TERMINÉE du patient (`POST /avis` exige un `consultation_id` terminé). Les
   * consultations sont inaccessibles tant que le bug serveur CheckRole bloque
   * `GET /patients/{id}/consultations` : liste vide, aucun établissement inventé.
   * À alimenter (et à brancher sur POST /avis) une fois la route corrigée (Lot 2).
   */
  cabinetsEligibles = signal<CabinetEligible[]>([]);

  avisPublies = signal<Avis[]>([]);

  cabinetEnCoursDeNotation = signal<CabinetEligible | null>(null);
  avisEnEdition = signal<Avis | null>(null);

  noteChoisie = signal(0);
  noteSurvolee = signal(0);
  commentaireSaisi = '';

  enSoumission = signal(false);

  get formulaireValide(): boolean {
    return this.noteChoisie() > 0 && this.commentaireSaisi.trim().length > 0;
  }

  etoiles(n: number): number[] {
    return Array.from({ length: n }, (_, i) => i + 1);
  }

  ouvrirFormulaire(cabinet: CabinetEligible): void {
    this.avisEnEdition.set(null);
    this.cabinetEnCoursDeNotation.set(cabinet);
    this.noteChoisie.set(0);
    this.commentaireSaisi = '';
  }

  ouvrirEdition(avis: Avis): void {
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

  publier(): void {
    if (!this.formulaireValide) {
      return;
    }

    this.enSoumission.set(true);

    setTimeout(() => {
      const edition = this.avisEnEdition();
      const cabinet = this.cabinetEnCoursDeNotation();

      if (edition) {
        this.avisPublies.update(liste =>
          liste.map(a =>
            a.id === edition.id
              ? { ...a, note: this.noteChoisie(), commentaire: this.commentaireSaisi }
              : a
          )
        );
      } else if (cabinet) {
        this.avisPublies.update(liste => [
          ...liste,
          {
            id: crypto.randomUUID(),
            cabinetId: cabinet.id,
            cabinetNom: cabinet.nom,
            note: this.noteChoisie(),
            commentaire: this.commentaireSaisi,
            datePublication: new Date().toLocaleDateString('fr-FR')
          }
        ]);
      }

      this.enSoumission.set(false);
      this.annulerFormulaire();
    }, 500);
  }

  supprimer(avis: Avis): void {
    this.avisPublies.update(liste => liste.filter(a => a.id !== avis.id));
  }
}