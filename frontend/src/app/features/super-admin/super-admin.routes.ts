import { Routes } from '@angular/router';
import { ValidationCabinets } from './validation-cabinets/validation-cabinets';
import { GestionComptes } from './gestion-comptes/gestion-comptes';

export const SUPER_ADMIN_ROUTES: Routes = [
  { path: '', redirectTo: 'validation-cabinets', pathMatch: 'full' },
  { path: 'validation-cabinets', component: ValidationCabinets },
  { path: 'gestion-comptes', component: GestionComptes },
];