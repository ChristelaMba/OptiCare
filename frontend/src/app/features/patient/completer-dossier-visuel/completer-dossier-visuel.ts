import { CommonModule } from '@angular/common';
import { Component, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';

interface InformationsVisuelles {
  porteLunettes: string;
  porteLentilles: string;
  dernierExamen: string;
  antecedentsOculaires: string;
  visionFlouLoin: boolean;
  visionFlouPres: boolean;
  visionDouble: boolean;
  demangeaisons: boolean;
  larmoiement: boolean;
  douleursOculaires: boolean;
  mauxDeTete: boolean;
  traitementEnCours: string;
  allergies: string;
  remarques: string;
}

@Component({
  selector: 'app-completer-dossier-visuel',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './completer-dossier-visuel.html',
  styleUrl: './completer-dossier-visuel.css',
})
export class CompleterDossierVisuel {
  readonly envoiDemande = signal(false);

  readonly informations: InformationsVisuelles = {
    porteLunettes: '',
    porteLentilles: '',
    dernierExamen: '',
    antecedentsOculaires: '',
    visionFlouLoin: false,
    visionFlouPres: false,
    visionDouble: false,
    demangeaisons: false,
    larmoiement: false,
    douleursOculaires: false,
    mauxDeTete: false,
    traitementEnCours: '',
    allergies: '',
    remarques: '',
  };

  readonly message = signal('');
  readonly typeMessage = signal<'info' | 'erreur'>('info');

  soumettreFormulaire(): void {
    this.message.set('');
    this.envoiDemande.set(false);

    /*
     * Le résumé de l'API OptiCare ne documente pas de route
     * permettant au patient de créer ou modifier son dossier visuel.
     *
     * Ne pas envoyer ces informations vers POST /api/consultations :
     * cette route est réservée aux rôles autorisés à créer une consultation.
     *
     * La sauvegarde sera raccordée lorsque la route backend sera confirmée.
     */
    this.typeMessage.set('info');
    this.message.set(
      'Le formulaire est prêt, mais son enregistrement doit encore être relié à la route API du dossier visuel.'
    );
    this.envoiDemande.set(true);
  }

  reinitialiserFormulaire(): void {
    this.informations.porteLunettes = '';
    this.informations.porteLentilles = '';
    this.informations.dernierExamen = '';
    this.informations.antecedentsOculaires = '';

    this.informations.visionFlouLoin = false;
    this.informations.visionFlouPres = false;
    this.informations.visionDouble = false;
    this.informations.demangeaisons = false;
    this.informations.larmoiement = false;
    this.informations.douleursOculaires = false;
    this.informations.mauxDeTete = false;

    this.informations.traitementEnCours = '';
    this.informations.allergies = '';
    this.informations.remarques = '';

    this.message.set('');
    this.envoiDemande.set(false);
  }
}