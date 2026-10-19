import { Type } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';

import { BoutonDeconnexion } from './bouton-deconnexion';
import { Auth } from '../../../core/services/auth';
import { PatientLayout } from '../../../features/patient/patient-layout/patient-layout';
import { SecretaireLayout } from '../../../features/secretaire/secretaire-layout/secretaire-layout';
import { OpticienLayout } from '../../../features/opticien/opticien-layout/opticien-layout';
import { DashboardComptable } from '../../../features/proprietaire/dashboard-comptable/dashboard-comptable';
import { GestionEmployes } from '../../../features/proprietaire/gestion-employes/gestion-employes';
import { HistoriqueRdv } from '../../../features/proprietaire/historique-rdv/historique-rdv';
import { VitrineEdition } from '../../../features/proprietaire/vitrine-edition/vitrine-edition';
import { CompleterProfilCabinet } from '../../../features/proprietaire/completer-profil-cabinet/completer-profil-cabinet';

describe('BoutonDeconnexion', () => {
  beforeEach(() => {
    sessionStorage.clear();
    localStorage.clear();

    TestBed.configureTestingModule({
      imports: [BoutonDeconnexion],
      providers: [provideRouter([]), provideHttpClient(), provideHttpClientTesting()],
    });
  });

  afterEach(() => {
    sessionStorage.clear();
    localStorage.clear();
  });

  it('un clic efface la session (Auth.logout) puis redirige vers /auth/connexion', async () => {
    const auth = TestBed.inject(Auth);
    const router = TestBed.inject(Router);
    const navigation = vi.spyOn(router, 'navigateByUrl').mockResolvedValue(true);
    auth.simulerConnexion('patient');
    expect(auth.estConnecte()).toBe(true);

    const fixture = TestBed.createComponent(BoutonDeconnexion);
    fixture.detectChanges();
    (fixture.nativeElement as HTMLElement).querySelector('button')!.click();

    expect(auth.estConnecte()).toBe(false);
    expect(auth.utilisateur()).toBeNull();
    expect(sessionStorage.getItem('opticare_token')).toBeNull();
    expect(localStorage.getItem('opticare_token')).toBeNull();
    expect(navigation).toHaveBeenCalledWith('/auth/connexion');
  });

  it('libellé par défaut « Se déconnecter »', () => {
    const fixture = TestBed.createComponent(BoutonDeconnexion);
    fixture.detectChanges();

    expect((fixture.nativeElement as HTMLElement).textContent).toContain('Se déconnecter');
  });
});

/** Chaque layout / page à barre latérale doit proposer la déconnexion. */
describe('Déconnexion présente dans chaque espace', () => {
  const ecrans: [string, Type<unknown>][] = [
    ['portail patient', PatientLayout],
    ['espace secrétaire', SecretaireLayout],
    ['espace opticien', OpticienLayout],
    ['propriétaire : dashboard', DashboardComptable],
    ['propriétaire : employés', GestionEmployes],
    ['propriétaire : rendez-vous', HistoriqueRdv],
    ['propriétaire : vitrine', VitrineEdition],
    ['propriétaire : compléter le profil', CompleterProfilCabinet],
  ];

  beforeEach(() => {
    sessionStorage.clear();
    localStorage.clear();

    TestBed.configureTestingModule({
      providers: [provideRouter([]), provideHttpClient(), provideHttpClientTesting()],
    });
  });

  afterEach(() => {
    sessionStorage.clear();
    localStorage.clear();
  });

  for (const [nom, composant] of ecrans) {
    it(`${nom} : un bouton « Se déconnecter » existe`, () => {
      TestBed.inject(Auth).simulerConnexion('proprietaire');

      const fixture = TestBed.createComponent(composant);
      fixture.detectChanges();
      const el = fixture.nativeElement as HTMLElement;

      expect(el.querySelector('app-bouton-deconnexion')).not.toBeNull();
      expect(el.textContent).toContain('Se déconnecter');
    });
  }
});
