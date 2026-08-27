import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { DossierVisuel } from './features/patient/dossier-visuel/dossier-visuel'
import { MesRendezVous } from './features/patient/mes-rendez-vous/mes-rendez-vous';
import { MesAvis } from './features/patient/mes-avis/mes-avis';
import { MesNotifications } from './features/patient/mes-notifications/mes-notifications';
import { Agenda } from './features/secretaire/agenda/agenda';
import { EnregistrementPatient } from './features/secretaire/enregistrement-patient/enregistrement-patient';
import { NouvelleFicheConsultation } from './features/opticien/nouvelle-fiche-consultation/nouvelle-fiche-consultation';
import { PriseRdv } from './features/public/prise-rdv/prise-rdv';
import { PatientLayout } from './features/patient/patient-layout/patient-layout';
import { SecretaireLayout } from './features/secretaire/secretaire-layout/secretaire-layout';


@Component({
  selector: 'app-root',
  imports: [RouterOutlet,  DossierVisuel,MesRendezVous,MesAvis,MesNotifications,Agenda,EnregistrementPatient,NouvelleFicheConsultation, PriseRdv,PatientLayout,SecretaireLayout],
  templateUrl: './app.html',
  styleUrl: './app.css'
})
export class App {}
