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

  it("inscription sans email : la session s'ouvre, email = chaîne vide (jamais null), rien ne casse", () => {
    service
      .registerPatient({
        nom: 'TEST-DIAG',
        prenom: 'Pat',
        telephone: '+237600000000',
        ville: 'Douala',
        password: 'azerty-12',
        password_confirmation: 'azerty-12',
      })
      .subscribe();

    const req = http.expectOne((r) => r.url.endsWith('/auth/register/patient'));
    expect(Object.keys(req.request.body)).not.toContain('email');
    req.flush({
      status: 'success',
      message: '',
      data: { user: { ...UTILISATEUR_BRUT, email: null }, token: 't', role: 'patient' },
    });

    expect(service.estConnecte()).toBe(true);
    expect(service.utilisateur()?.email).toBe('');
    // la session sérialisée puis relue ne contient pas non plus de null
    const stocke = JSON.parse(localStorage.getItem('opticare_utilisateur') ?? sessionStorage.getItem('opticare_utilisateur') ?? '{}');
    expect(stocke.email).toBe('');
  });

  const CABINET_PAYLOAD = {
    nom: 'TEST-DIAG',
    prenom: 'Proprio',
    telephone: '+237600000001',
    ville: 'Douala',
    password: 'azerty-12',
    password_confirmation: 'azerty-12',
    cabinet_nom: 'Cabinet TEST',
    cabinet_adresse: 'Rue TEST',
    cabinet_telephone: '+237600000002',
    cabinet_ville: 'Douala',
    cabinet_email: 'cabinet@example.com',
  };

  it("registerCabinet : réponse sans token → aucune session ouverte, pas d'erreur", () => {
    let resultat: unknown;
    let erreur: unknown = null;
    service.registerCabinet(CABINET_PAYLOAD).subscribe({ next: (r) => (resultat = r), error: (e) => (erreur = e) });

    http.expectOne((r) => r.url.endsWith('/auth/register/cabinet')).flush({
      status: 'success',
      message: 'Cabinet enregistré avec succès. En attente de validation par un administrateur.',
      data: {
        user: { ...UTILISATEUR_BRUT, role: 'proprietaire', cabinet_id: 8 },
        cabinet: { id: 8, status: 'en_attente' },
        role: 'proprietaire',
        requires_verification: true,
      },
    });

    expect(erreur).toBeNull();
    expect(resultat).toMatchObject({ enAttenteDeValidation: true });
    expect(service.estConnecte()).toBe(false);
    expect(service.utilisateur()).toBeNull();
    expect(localStorage.getItem('opticare_token')).toBeNull();
    expect(sessionStorage.getItem('opticare_token')).toBeNull();
    expect(localStorage.getItem('opticare_utilisateur')).toBeNull();
    expect(sessionStorage.getItem('opticare_utilisateur')).toBeNull();
  });

  it("registerPatient : patient.id renvoyé à l'inscription est mémorisé dans la session (et persisté)", () => {
    service
      .registerPatient({ nom: 'TEST', prenom: 'Pat', telephone: '+237600000009', ville: 'Douala', password: 'azerty-12', password_confirmation: 'azerty-12' })
      .subscribe();

    http.expectOne((r) => r.url.endsWith('/auth/register/patient')).flush({
      status: 'success',
      message: '',
      data: { user: { ...UTILISATEUR_BRUT, patient: { id: 13, date_naissance: null, adresse: null } }, token: 't', role: 'patient' },
    });

    expect(service.utilisateur()?.patientId).toBe('13');
    const stocke = JSON.parse(localStorage.getItem('opticare_utilisateur') ?? '{}');
    expect(stocke.patientId).toBe('13');
  });

  it('rafraichirUtilisateur : GET /user récupère patientId pour une session ancienne', () => {
    service.login({ telephone: '+237600000000', password: 'x' }, false).subscribe();
    http.expectOne((r) => r.url.endsWith('/auth/login')).flush({
      status: 'success',
      message: '',
      data: { user: UTILISATEUR_BRUT, token: 't', role: 'patient' },
    });
    expect(service.utilisateur()?.patientId).toBeUndefined();

    service.rafraichirUtilisateur().subscribe();
    http.expectOne((r) => r.url.endsWith('/user')).flush({ ...UTILISATEUR_BRUT, patient: { id: 3 } });

    expect(service.utilisateur()?.patientId).toBe('3');
    expect(JSON.parse(sessionStorage.getItem('opticare_utilisateur') ?? '{}').patientId).toBe('3');
  });

  function ouvrirSessionReelle(): void {
    service.login({ telephone: '+237600000000', password: 'x' }, false).subscribe();
    http.expectOne((r) => r.url.endsWith('/auth/login')).flush({
      status: 'success',
      message: '',
      data: { user: UTILISATEUR_BRUT, token: 'token-123', role: 'patient' },
    });
  }

  it('logout : POST /auth/logout avec le token courant, session locale effacée aussitôt', () => {
    ouvrirSessionReelle();
    expect(service.estConnecte()).toBe(true);

    service.logout();

    const req = http.expectOne((r) => r.url.endsWith('/auth/logout'));
    expect(req.request.method).toBe('POST');
    expect(req.request.headers.get('Authorization')).toBe('Bearer token-123');
    expect(service.estConnecte()).toBe(false); // effacée sans attendre la réponse
    expect(service.utilisateur()).toBeNull();
    expect(sessionStorage.getItem('opticare_token')).toBeNull();
    req.flush({ status: 'success', message: 'Déconnexion réussie', data: null });
  });

  it('logout : échec serveur (500) ou réseau → la session locale est quand même effacée, sans erreur', () => {
    ouvrirSessionReelle();
    service.logout();
    http.expectOne((r) => r.url.endsWith('/auth/logout')).flush('boom', { status: 500, statusText: 'Server Error' });
    expect(service.estConnecte()).toBe(false);

    ouvrirSessionReelle();
    service.logout();
    http.expectOne((r) => r.url.endsWith('/auth/logout')).error(new ProgressEvent('error'));
    expect(service.estConnecte()).toBe(false);
    expect(localStorage.getItem('opticare_utilisateur')).toBeNull();
    expect(sessionStorage.getItem('opticare_utilisateur')).toBeNull();
  });

  it("logout : sans token ou avec le faux token de l'outil de dev, aucun appel API", () => {
    service.logout();
    service.simulerConnexion('patient');
    service.logout();

    http.expectNone((r) => r.url.endsWith('/auth/logout'));
    expect(service.estConnecte()).toBe(false);
  });
});
