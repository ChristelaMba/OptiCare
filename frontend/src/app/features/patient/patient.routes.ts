import { Routes } from '@angular/router';
import { CompleterDossierVisuel } from './completer-dossier-visuel/completer-dossier-visuel';
import { DossierVisuel } from './dossier-visuel/dossier-visuel';
import { MesRendezVous } from './mes-rendez-vous/mes-rendez-vous';
import { MesAvis } from './mes-avis/mes-avis';
import { MesNotifications } from './mes-notifications/mes-notifications';

export const PATIENT_ROUTES: Routes = [
  { path: '', redirectTo: 'dossier-visuel', pathMatch: 'full' },
  { path: 'completer-dossier-visuel', component: CompleterDossierVisuel },
  { path: 'dossier-visuel', component: DossierVisuel },
  { path: 'mes-rendez-vous', component: MesRendezVous },
  { path: 'mes-avis', component: MesAvis },
  { path: 'mes-notifications', component: MesNotifications },
];