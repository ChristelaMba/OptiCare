import { Routes } from '@angular/router';
import { Accueil } from './accueil/accueil';
import { VitrineCabinet } from './vitrine-cabinet/vitrine-cabinet';
import { PriseRdv } from './prise-rdv/prise-rdv';
import { AccesRefuse } from './acces-refuse/acces-refuse';

export const PUBLIC_ROUTES: Routes = [
  { path: '', component: Accueil },
  { path: 'cabinet/:id', component: VitrineCabinet },
  { path: 'cabinet/:id/rendez-vous', component: PriseRdv },
  { path: 'acces-refuse', component: AccesRefuse },
];
