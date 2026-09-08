import { Routes } from '@angular/router';
import { ChoixRole } from './choix-role/choix-role';
import { InscriptionPatient } from './inscription-patient/inscription-patient';
import { InscriptionCabinet } from './inscription-cabinet/inscription-cabinet';
import { Connexion } from './connexion/connexion';

export const AUTH_ROUTES: Routes = [
  { path: 'connexion', component: Connexion },
  { path: 'inscription', component: ChoixRole },
  { path: 'inscription/patient', component: InscriptionPatient },
  { path: 'inscription/cabinet', component: InscriptionCabinet },
];