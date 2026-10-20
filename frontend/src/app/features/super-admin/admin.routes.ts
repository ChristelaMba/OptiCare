import { Routes } from '@angular/router';

import { SuperAdminLayout } from './super-admin-layout/super-admin-layout';
import { DashboardGlobal } from './dashboard-global/dashboard-global';
import { AnnuaireCabinets } from './annuaire-cabinets/annuaire-cabinets';
import { ValidationCabinets } from './validation-cabinets/validation-cabinets';
import { GestionComptes } from './gestion-comptes/gestion-comptes';
import { ModerationAvis } from './moderation-avis/moderation-avis';
import { JournalAudit } from './journal-audit/journal-audit';
import { ParametresGeneraux } from './parametres-generaux/parametres-generaux';

/**
 * Routes de l'espace Super Admin, toutes **relatives au layout**
 * `SuperAdminLayout` (sidebar + profil + déconnexion en pied). Le préfixe
 * (`admin` ou `super-admin`) est posé dans `app.routes.ts`, où sont aussi
 * appliqués `authGuard` + `roleGuard`.
 *
 * Table des écrans (demande du 20/10/2026) :
 *  - `dashboard`          → vue d'ensemble de la plateforme (données de démo)
 *  - `cabinets/validation`→ demandes d'inscription (API réelle)
 *  - `cabinets`           → annuaire des cabinets validés (API réelle)
 *  - `comptes`            → gestion globale des comptes (API réelle)
 *  - `avis`               → modération des avis (API réelle, DELETE /avis/{id})
 *  - `audit-logs`         → journal d'audit (données de démo)
 *  - `parametres`         → paramètres généraux (données de démo)
 *
 * La route vide redirige vers le dashboard, comme demandé (« Vue d'ensemble »
 * en premier dans le menu).
 */
export const ADMIN_ROUTES: Routes = [
  {
    path: '',
    component: SuperAdminLayout,
    children: [
      { path: '', redirectTo: 'dashboard', pathMatch: 'full' },
      { path: 'dashboard', component: DashboardGlobal },
      { path: 'cabinets', component: AnnuaireCabinets },
      { path: 'cabinets/validation', component: ValidationCabinets },
      { path: 'comptes', component: GestionComptes },
      { path: 'avis', component: ModerationAvis },
      { path: 'audit-logs', component: JournalAudit },
      { path: 'parametres', component: ParametresGeneraux },
    ],
  },
];
