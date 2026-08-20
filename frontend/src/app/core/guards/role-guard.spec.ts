import { TestBed } from '@angular/core/testing';
import { ActivatedRouteSnapshot, CanActivateFn, provideRouter, RouterStateSnapshot, UrlTree } from '@angular/router';

import { roleGuard } from './role-guard';
import { Auth } from '../services/auth';
import { RoleUtilisateur } from '../../models/utilisateur.model';

describe('roleGuard', () => {
  const executeGuard: CanActivateFn = (...guardParameters) =>
    TestBed.runInInjectionContext(() => roleGuard(...guardParameters));

  function configurer(role: RoleUtilisateur | null): void {
    TestBed.configureTestingModule({
      providers: [
        provideRouter([]),
        { provide: Auth, useValue: { role: () => role } },
      ],
    });
  }

  it('laisse passer quand le rôle actuel correspond au rôle attendu', () => {
    configurer('Opticien');

    const route = { data: { role: 'Opticien' } } as unknown as ActivatedRouteSnapshot;
    const state = { url: '/opticien/dossier-visuel-patient/1' } as RouterStateSnapshot;

    const resultat = executeGuard(route, state);

    expect(resultat).toBe(true);
  });

  it("redirige vers /acces-refuse quand le rôle actuel ne correspond pas (connecté, mauvais rôle)", () => {
    configurer('Patient');

    const route = { data: { role: 'Opticien' } } as unknown as ActivatedRouteSnapshot;
    const state = { url: '/opticien/dossier-visuel-patient/1' } as RouterStateSnapshot;

    const resultat = executeGuard(route, state) as UrlTree;

    expect(resultat instanceof UrlTree).toBe(true);
    expect(resultat.toString().startsWith('/acces-refuse')).toBe(true);
  });

  it('redirige vers /auth/connexion (pas /acces-refuse) quand aucun utilisateur n\'est connecté', () => {
    configurer(null);

    const route = { data: { role: 'Opticien' } } as unknown as ActivatedRouteSnapshot;
    const state = { url: '/opticien/dossier-visuel-patient/1' } as RouterStateSnapshot;

    const resultat = executeGuard(route, state) as UrlTree;

    expect(resultat instanceof UrlTree).toBe(true);
    expect(resultat.toString().startsWith('/auth/connexion')).toBe(true);
    expect(resultat.queryParams['returnUrl']).toBe('/opticien/dossier-visuel-patient/1');
  });
});
