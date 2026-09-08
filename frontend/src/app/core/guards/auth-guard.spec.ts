import { TestBed } from '@angular/core/testing';
import { ActivatedRouteSnapshot, CanActivateFn, provideRouter, RouterStateSnapshot, UrlTree } from '@angular/router';

import { authGuard } from './auth-guard';
import { Auth } from '../services/auth';

describe('authGuard', () => {
  const executeGuard: CanActivateFn = (...guardParameters) =>
    TestBed.runInInjectionContext(() => authGuard(...guardParameters));

  function configurer(estConnecte: boolean): void {
    TestBed.configureTestingModule({
      providers: [
        provideRouter([]),
        { provide: Auth, useValue: { estConnecte: () => estConnecte } },
      ],
    });
  }

  it("redirige vers /auth/connexion avec le bon returnUrl quand l'utilisateur n'est pas connecté", () => {
    configurer(false);

    const route = {} as ActivatedRouteSnapshot;
    const state = { url: '/opticien/dossier-visuel-patient/1' } as RouterStateSnapshot;

    const resultat = executeGuard(route, state) as UrlTree;

    expect(resultat instanceof UrlTree).toBe(true);
    expect(resultat.queryParams['returnUrl']).toBe('/opticien/dossier-visuel-patient/1');
    expect(resultat.toString().startsWith('/auth/connexion')).toBe(true);
  });

  it("laisse passer quand l'utilisateur est connecté", () => {
    configurer(true);

    const route = {} as ActivatedRouteSnapshot;
    const state = { url: '/patient/dossier-visuel' } as RouterStateSnapshot;

    const resultat = executeGuard(route, state);

    expect(resultat).toBe(true);
  });
});
