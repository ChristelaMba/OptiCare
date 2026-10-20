import { Routes } from '@angular/router';

/**
 * Ancien préfixe `/super-admin`, conservé pour ne casser aucun lien ou
 * signet existant. Toutes les entrées redirigent vers le préfixe officiel
 * `/admin` (voir `admin.routes.ts` et `app.routes.ts`). Les correspondances
 * reprennent les anciennes URL (`/super-admin/validation-cabinets`,
 * `/super-admin/gestion-comptes`) et l'ancienne racine.
 */
export const SUPER_ADMIN_ROUTES: Routes = [
  { path: '', pathMatch: 'full', redirectTo: '/admin/dashboard' },
  { path: 'validation-cabinets', redirectTo: '/admin/cabinets/validation' },
  { path: 'gestion-comptes', redirectTo: '/admin/comptes' },
  { path: '**', redirectTo: '/admin/dashboard' },
];
