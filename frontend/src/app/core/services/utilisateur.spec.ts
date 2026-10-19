import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';

import { Utilisateur } from './utilisateur';

const USER_AVEC_CABINET = {
  id: 73,
  nom: 'Tchinda',
  prenom: 'Herve',
  email: null,
  telephone: '+237600000302',
  ville: 'Douala',
  role: 'opticien',
  cabinet_id: 6,
  is_active: true,
  cabinet: { id: 6, nom: 'Cabinet Vision Bonanjo', ville: 'Douala' },
};
const USER_SANS_CABINET = { ...USER_AVEC_CABINET, id: 78, role: 'patient', cabinet_id: null, cabinet: null, email: 'a@b.cm', is_active: false };
const STATS = { total: 2, super_admin: 0, proprietaire: 0, opticien: 1, secretaire: 0, patient: 1, actifs: 1, inactifs: 1 };

describe('Utilisateur', () => {
  let service: Utilisateur;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [provideHttpClient(), provideHttpClientTesting()] });
    service = TestBed.inject(Utilisateur);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('listerComptes() : GET /admin/users, mappe users (cabinet compris) et stats', () => {
    let resultat: unknown;
    service.listerComptes().subscribe((r) => (resultat = r));

    const req = http.expectOne((r) => r.url.endsWith('/admin/users'));
    expect(req.request.method).toBe('GET');
    expect(req.request.params.keys()).toEqual([]);
    req.flush({ status: 'success', message: '', data: { users: [USER_AVEC_CABINET, USER_SANS_CABINET], stats: STATS } });

    expect(resultat).toEqual({
      comptes: [
        { id: '73', nom: 'Tchinda', prenom: 'Herve', email: null, telephone: '+237600000302', ville: 'Douala', role: 'opticien', actif: true, cabinetNom: 'Cabinet Vision Bonanjo' },
        { id: '78', nom: 'Tchinda', prenom: 'Herve', email: 'a@b.cm', telephone: '+237600000302', ville: 'Douala', role: 'patient', actif: false, cabinetNom: null },
      ],
      stats: { total: 2, superAdmin: 0, proprietaire: 0, opticien: 1, secretaire: 0, patient: 1, actifs: 1, inactifs: 1 },
    });
  });

  it('listerComptes({ role, search }) : paramètres facultatifs transmis', () => {
    service.listerComptes({ role: 'patient', search: 'Nkeng' }).subscribe();
    const req = http.expectOne((r) => r.url.endsWith('/admin/users'));
    expect(req.request.params.get('role')).toBe('patient');
    expect(req.request.params.get('search')).toBe('Nkeng');
    req.flush({ status: 'success', message: '', data: { users: [], stats: STATS } });
  });

  it('basculerActivation() : PUT /admin/users/{id}/toggle-active, nouvel état lu dans la réponse', () => {
    let resultat: unknown;
    service.basculerActivation('78').subscribe((r) => (resultat = r));

    const req = http.expectOne((r) => r.url.endsWith('/admin/users/78/toggle-active'));
    expect(req.request.method).toBe('PUT');
    req.flush({ status: 'success', message: '', data: { user: { id: 78, is_active: false } } });

    expect(resultat).toEqual({ id: '78', actif: false });
  });

  it('reinitialiserMotDePasse() : PUT /admin/users/{id}/reset-password avec password et password_confirmation', () => {
    service.reinitialiserMotDePasse('78', 'nouveau-mdp-1', 'nouveau-mdp-1').subscribe();

    const req = http.expectOne((r) => r.url.endsWith('/admin/users/78/reset-password'));
    expect(req.request.method).toBe('PUT');
    expect(req.request.body).toEqual({ password: 'nouveau-mdp-1', password_confirmation: 'nouveau-mdp-1' });
    req.flush({ status: 'success', message: 'Mot de passe réinitialisé avec succès.', data: null });
  });
});
