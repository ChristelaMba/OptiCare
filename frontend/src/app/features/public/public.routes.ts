import { inject } from '@angular/core';
import { Routes } from '@angular/router';
import { Auth } from '../../core/services/auth';
import { Accueil } from './accueil/accueil';
import { RechercheCabinets } from './recherche-cabinets/recherche-cabinets';
import { VitrineCabinet } from './vitrine-cabinet/vitrine-cabinet';
import { PriseRdv } from './prise-rdv/prise-rdv';
import { AccesRefuse } from './acces-refuse/acces-refuse';

export const PUBLIC_ROUTES: Routes = [
  { path: '', component: Accueil },
  { path: 'recherche-cabinets', component: RechercheCabinets },
  { path: 'cabinet/:id', component: VitrineCabinet },
  // Patient connecté : prise de RDV dans le layout du portail patient (même menu,
  // nom réel). Visiteur : page publique simple (la route ci-dessous).
  {
    path: 'cabinet/:id/rendez-vous',
    canMatch: [() => inject(Auth).role() === 'patient'],
    loadComponent: () =>
      import('../patient/patient-layout/patient-layout').then(m => m.PatientLayout),
    children: [{ path: '', component: PriseRdv }],
  },
  { path: 'cabinet/:id/rendez-vous', component: PriseRdv },
  { path: 'acces-refuse', component: AccesRefuse },
];
