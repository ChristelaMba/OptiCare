import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';

import { Personnel } from './personnel';

const EMPLOYE = {
  id: 72,
  nom: 'Kamga',
  prenom: 'Nadine',
  email: null,
  telephone: '+237600000301',
  ville: 'Douala',
  role: 'secretaire',
  poste: 'Secretaire',
  statut_employe: 'actif',
  is_active: true,
  est_actif: true,
};
const ATTENDU = {
  id: '72',
  nom: 'Kamga',
  prenom: 'Nadine',
  email: null,
  telephone: '+237600000301',
  ville: 'Douala',
  role: 'secretaire',
  poste: 'Secretaire',
  statutEmploye: 'actif',
  actif: true,
};

describe('Personnel', () => {
  let service: Personnel;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [provideHttpClient(), provideHttpClientTesting()] });
    service = TestBed.inject(Personnel);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('lister() : GET /cabinets/{id}/personnel, lit data.employes', () => {
    let resultat: unknown;
    service.lister('6').subscribe((r) => (resultat = r));

    const req = http.expectOne((r) => r.url.endsWith('/cabinets/6/personnel'));
    expect(req.request.method).toBe('GET');
    req.flush({ status: 'success', message: '', data: { employes: [EMPLOYE] } });

    expect(resultat).toEqual([ATTENDU]);
  });

  it('creer() : POST /cabinets/{id}/personnel avec les champs du §12.1, lit data.employe', () => {
    let resultat: unknown;
    const payload = {
      nom: 'Kamga',
      prenom: 'Nadine',
      telephone: '+237600000301',
      ville: 'Douala',
      role: 'secretaire' as const,
      poste: 'Secretaire',
      password: 'motdepasse1',
      password_confirmation: 'motdepasse1',
    };
    service.creer('6', payload).subscribe((r) => (resultat = r));

    const req = http.expectOne((r) => r.url.endsWith('/cabinets/6/personnel'));
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual(payload);
    req.flush({ status: 'success', message: '', data: { employe: EMPLOYE } }, { status: 201, statusText: 'Created' });

    expect(resultat).toEqual(ATTENDU);
  });

  it('modifier() : PUT /cabinets/{id}/personnel/{pid}, lit data.employe', () => {
    let resultat: unknown;
    service.modifier('6', '72', { is_active: false }).subscribe((r) => (resultat = r));

    const req = http.expectOne((r) => r.url.endsWith('/cabinets/6/personnel/72'));
    expect(req.request.method).toBe('PUT');
    expect(req.request.body).toEqual({ is_active: false });
    req.flush({ status: 'success', message: '', data: { employe: { ...EMPLOYE, is_active: false, statut_employe: 'inactif' } } });

    expect(resultat).toMatchObject({ id: '72', actif: false, statutEmploye: 'inactif' });
  });

  it('supprimer() : DELETE /cabinets/{id}/personnel/{pid}', () => {
    let fini = false;
    service.supprimer('6', '72').subscribe(() => (fini = true));

    const req = http.expectOne((r) => r.url.endsWith('/cabinets/6/personnel/72'));
    expect(req.request.method).toBe('DELETE');
    req.flush({ status: 'success', message: 'Employé supprimé avec succès.', data: null });

    expect(fini).toBe(true);
  });
});
