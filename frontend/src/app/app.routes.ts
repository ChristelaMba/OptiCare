import { Routes } from '@angular/router';
import { authGuard } from './core/guards/auth-guard';
import { roleGuard } from './core/guards/role-guard';

export const routes: Routes = [
  {
    path: '',
    loadChildren: () => import('./features/public/public.routes').then(m => m.PUBLIC_ROUTES)
  },
  {
    path: 'auth',
    loadChildren: () => import('./features/auth/auth.routes').then(m => m.AUTH_ROUTES)
  },
  {
    path: 'patient',
    canActivate: [authGuard, roleGuard],
    data: { role: 'Patient' },
    loadChildren: () => import('./features/patient/patient.routes').then(m => m.PATIENT_ROUTES)
  },
  {
    path: 'secretaire',
    canActivate: [authGuard, roleGuard],
    data: { role: 'Secretaire' },
    loadChildren: () => import('./features/secretaire/secretaire.routes').then(m => m.SECRETAIRE_ROUTES)
  },
  {
    path: 'opticien',
    canActivate: [authGuard, roleGuard],
    data: { role: 'Opticien' },
    loadChildren: () => import('./features/opticien/opticien.routes').then(m => m.OPTICIEN_ROUTES)
  },
  {
    path: 'proprietaire',
    canActivate: [authGuard, roleGuard],
    data: { role: 'Proprietaire' },
    loadChildren: () => import('./features/proprietaire/proprietaire.routes').then(m => m.PROPRIETAIRE_ROUTES)
  },
  {
    path: 'super-admin',
    canActivate: [authGuard, roleGuard],
    data: { role: 'SuperAdmin' },
    loadChildren: () => import('./features/super-admin/super-admin.routes').then(m => m.SUPER_ADMIN_ROUTES)
  },
  {
    path: '**',
    redirectTo: ''
  }
];