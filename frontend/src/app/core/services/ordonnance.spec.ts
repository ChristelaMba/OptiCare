import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';

import { OrdonnanceService } from './ordonnance';

const BRUTE = {
  id: 102,
  numero: 'ORD-2026-00102',
  consultation_id: 114,
  patient_id: 46,
  cabinet_id: 6,
  prescription: {
    od: { sphere: '-2.50', cylindre: '-0.75', axe: '90', addition: '1.00' },
    og: { sphere: '-3.00', cylindre: '-0.50', axe: '85', addition: '1.00' },
    ecart_pupillaire: '62',
  },
  recommandations: 'Port permanent.',
  date_emission: '2026-10-20T00:00:00.000000Z',
  date_validite: '2027-10-20T00:00:00.000000Z',
  patient: { id: 46, nom: 'Nkeng', prenom: 'Aline' },
  opticien: { id: 73, nom: 'Tchinda', prenom: 'Herve' },
};

describe('OrdonnanceService', () => {
  let service: OrdonnanceService;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [provideHttpClient(), provideHttpClientTesting()] });
    service = TestBed.inject(OrdonnanceService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('creer() : POST /consultations/{id}/ordonnances, valeurs en chaînes, lit data.ordonnance et le numéro ORD', () => {
    let resultat: unknown;
    const corps = { od_sphere: '-2.50', od_axe: '90', ecart_pupillaire: '62', date_emission: '2026-10-20' };
    service.creer('114', corps).subscribe((r) => (resultat = r));

    const req = http.expectOne((r) => r.url.endsWith('/consultations/114/ordonnances'));
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual(corps);
    req.flush({ status: 'success', message: '', data: { ordonnance: BRUTE } }, { status: 201, statusText: 'Created' });

    expect(resultat).toMatchObject({
      id: '102',
      numero: 'ORD-2026-00102',
      consultationId: '114',
      patientNom: 'Aline Nkeng',
      opticienNom: 'Herve Tchinda',
      od: { sphere: '-2.50', axe: '90' },
      og: { cylindre: '-0.50' },
      ecartPupillaire: '62',
      dateEmission: '2026-10-20',
      dateValidite: '2027-10-20',
    });
  });

  it('listerParCabinet() et obtenir()', () => {
    service.listerParCabinet('6', 'ORD').subscribe();
    const req = http.expectOne((r) => r.url.endsWith('/cabinets/6/ordonnances'));
    expect(req.request.params.get('search')).toBe('ORD');
    req.flush({ status: 'success', message: '', data: { ordonnances: [BRUTE] } });

    service.obtenir('102').subscribe();
    http.expectOne((r) => r.url.endsWith('/ordonnances/102')).flush({ status: 'success', message: '', data: { ordonnance: BRUTE } });
  });
});
