import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';

import { FactureService } from './facture';
import { formaterFcfa } from '../utils/montant';

const BRUTE = {
  id: 88,
  numero: 'FAC-2026-00088',
  commande_id: 65,
  patient_id: 46,
  cabinet_id: 6,
  type: 'acompte',
  montant: '20000.00',
  montant_paye: '0.00',
  solde_restant: 20000,
  statut: 'impaye',
  date_emission: '2026-10-20T00:00:00.000000Z',
  date_echeance: null,
  date_paiement: null,
  description: 'Acompte',
  patient: { id: 46, nom: 'Nkeng', prenom: 'Aline' },
};
const env = (f: unknown) => ({ status: 'success', message: '', data: { facture: f } });

describe('FactureService', () => {
  let service: FactureService;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [provideHttpClient(), provideHttpClientTesting()] });
    service = TestBed.inject(FactureService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('creer() : POST /commandes/{id}/factures, montants convertis en nombres', () => {
    let resultat: unknown;
    const corps = { type: 'acompte' as const, montant: 20000 };
    service.creer('65', corps).subscribe((r) => (resultat = r));

    const req = http.expectOne((r) => r.url.endsWith('/commandes/65/factures'));
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual(corps);
    req.flush(env(BRUTE), { status: 201, statusText: 'Created' });

    expect(resultat).toMatchObject({
      id: '88',
      numero: 'FAC-2026-00088',
      commandeId: '65',
      patientNom: 'Aline Nkeng',
      type: 'acompte',
      montant: 20000,
      montantPaye: 0,
      soldeRestant: 20000,
      statut: 'impaye',
      dateEmission: '2026-10-20',
    });
  });

  it('enregistrerPaiement() : PUT /factures/{id}/paiement avec montant_paye', () => {
    let resultat: unknown;
    service.enregistrerPaiement('88', 10000).subscribe((r) => (resultat = r));

    const req = http.expectOne((r) => r.url.endsWith('/factures/88/paiement'));
    expect(req.request.method).toBe('PUT');
    expect(req.request.body).toEqual({ montant_paye: 10000 });
    req.flush(env({ ...BRUTE, montant_paye: '10000.00', solde_restant: 10000, statut: 'partiel' }));

    expect(resultat).toMatchObject({ montantPaye: 10000, soldeRestant: 10000, statut: 'partiel' });
  });

  it('listerParCabinet() : filtres statut et search transmis ; obtenir()', () => {
    service.listerParCabinet('6', { statut: 'partiel', search: 'FAC' }).subscribe();
    const req = http.expectOne((r) => r.url.endsWith('/cabinets/6/factures'));
    expect(req.request.params.get('statut')).toBe('partiel');
    expect(req.request.params.get('search')).toBe('FAC');
    req.flush({ status: 'success', message: '', data: { factures: [BRUTE] } });

    service.obtenir('88').subscribe();
    http.expectOne((r) => r.url.endsWith('/factures/88')).flush(env(BRUTE));
  });

  it('formaterFcfa() : entier, sans décimale inventée', () => {
    expect(formaterFcfa(20000)).toBe('20 000 FCFA');
    expect(formaterFcfa(10000.4)).toBe('10 000 FCFA');
    expect(formaterFcfa(0)).toBe('0 FCFA');
  });
});
