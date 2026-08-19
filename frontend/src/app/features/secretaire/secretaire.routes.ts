import { Routes } from '@angular/router';
import { Agenda } from './agenda/agenda';
import { EnregistrementPatient } from './enregistrement-patient/enregistrement-patient';

export const SECRETAIRE_ROUTES: Routes = [
  { path: '', redirectTo: 'agenda', pathMatch: 'full' },
  { path: 'agenda', component: Agenda },
  { path: 'enregistrement-patient', component: EnregistrementPatient },
];