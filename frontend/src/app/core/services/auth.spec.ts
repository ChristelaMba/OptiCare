import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';

import { Auth } from './auth';

const UTILISATEUR_BRUT = {
  id: 7,
  nom: 'Testdev',
  prenom: 'Patient',
  email: 'tdev@example.com',
  telephone: '+237600000000',
  ville: 'Douala',
  role: 'patient',
  cabinet_id: null,
  is_active: true,
  created_at: '2026-09-07T04:59:03.000000Z',
};

describe('Auth', () => {
  let service: Auth;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(Auth);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    sessionStorage.clear();
    localStorage.clear();
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('login() mémorise user.patient.id (id de la table patients) dans patientId', () => {
    service.login({ telephone: '+237600000000', password: 'x' }, false).subscribe();

    http.expectOne((r) => r.url.endsWith('/auth/login')).flush({
      status: 'success',
      message: '',
      data: { user: { ...UTILISATEUR_BRUT, patient: { id: 3 } }, token: 't', role: 'patient' },
    });

    expect(service.utilisateur()?.id).toBe('7');
    expect(service.utilisateur()?.patientId).toBe('3');
  });

  it('patientId reste indéfini quand l\'API ne renvoie pas de profil patient', () => {
    service.login({ telephone: '+237600000000', password: 'x' }, false).subscribe();

    http.expectOne((r) => r.url.endsWith('/auth/login')).flush({
      status: 'success',
      message: '',
      data: { user: UTILISATEUR_BRUT, token: 't', role: 'patient' },
    });

    expect(service.utilisateur()?.patientId).toBeUndefined();
  });
});
