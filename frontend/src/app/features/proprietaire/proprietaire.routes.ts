import { Routes } from '@angular/router';
import { CompleterProfilCabinet } from './completer-profil-cabinet/completer-profil-cabinet';
import { VitrineEdition } from './vitrine-edition/vitrine-edition';
import { GestionEmployes } from './gestion-employes/gestion-employes';
import { DashboardComptable } from './dashboard-comptable/dashboard-comptable';
import { HistoriqueRdv } from './historique-rdv/historique-rdv';

export const PROPRIETAIRE_ROUTES: Routes = [
  { path: '', redirectTo: 'dashboard-comptable', pathMatch: 'full' },
  { path: 'completer-profil-cabinet', component: CompleterProfilCabinet },
  { path: 'vitrine-edition', component: VitrineEdition },
  { path: 'gestion-employes', component: GestionEmployes },
  { path: 'dashboard-comptable', component: DashboardComptable },
  { path: 'historique-rdv', component: HistoriqueRdv },
];