import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';

import { CommandeService } from './commande';

const BRUTE = {
  id: 65,
  consultation_id: 114,
  cabinet_id: 6,
  opticien_id: 73,
  numero_monture: 'MON-TEST-001',
  type_verre: 'progressif',
  teinte: 'claire',
  description_foyers: 'Foyers standard',
  port: 'permanent',
  antireflet: true,
  diagnostic: { od: { sphere: '-2.50', cylindre: '-0.75', axe: '90', addition: '1.00' }, og: { sphere: '-3.00', cylindre: null, axe: null, addition: null } },
  statut: 'initie',
  notes: 'Commande de test',
  created_at: '2026-10-20T00:39:32.000000Z',
  consultation: { id: 114, date_consultation: '2026-10-20T00:00:00.000000Z', motif: 'Controle' },
  opticien: { id: 73, nom: 'Tchinda', prenom: 'Herve' },
};
const env = (c: unknown) => ({ status: 'success', message: '', data: { commande: c } });

describe('CommandeService', () => {
  let service: CommandeService;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [provideHttpClient(), provideHttpClientTesting()] });
    service = TestBed.inject(CommandeService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('creer() : POST /commandes à plat (antireflet booléen), lit data.commande et déplie le diagnostic', () => {
    let resultat: unknown;
    const corps = { consultation_id: 114, type_verre: 'progressif', antireflet: true, diag_od_sphere: '-2.50' };
    service.creer(corps).subscribe((r) => (resultat = r));

    const req = http.expectOne((r) => r.url.endsWith('/commandes'));
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual(corps);
    req.flush(env(BRUTE), { status: 201, statusText: 'Created' });

    expect(resultat).toMatchObject({
      id: '65',
      consultationId: '114',
      typeVerre: 'progressif',
      antireflet: true,
      statut: 'initie',
      modifiable: true,
      dateCreation: '2026-10-20',
      opticienNom: 'Herve Tchinda',
      od: { sphere: '-2.50', axe: '90' },
      og: { sphere: '-3.00', cylindre: null },
    });
  });

  it('changerStatut() : PATCH /commandes/{id} avec { statut } (plus /statut)', () => {
    let resultat: { statut: string; modifiable: boolean } | undefined;
    service.changerStatut('65', 'termine').subscribe((r) => (resultat = r));

    const req = http.expectOne((r) => r.url.endsWith('/commandes/65'));
    expect(req.request.method).toBe('PATCH');
    expect(req.request.body).toEqual({ statut: 'termine' });
    req.flush(env({ ...BRUTE, statut: 'termine' }));

    expect(resultat).toMatchObject({ statut: 'termine', modifiable: false });
  });

  it('listerParCabinet(), listerParConsultation(), obtenir() : routes documentées', () => {
    service.listerParCabinet('6').subscribe();
    http.expectOne((r) => r.url.endsWith('/cabinets/6/commandes')).flush({ status: 'success', message: '', data: { commandes: [BRUTE] } });

    service.listerParConsultation('114').subscribe();
    http.expectOne((r) => r.url.endsWith('/consultations/114/commandes')).flush({ status: 'success', message: '', data: { commandes: [] } });

    service.obtenir('65').subscribe();
    http.expectOne((r) => r.url.endsWith('/commandes/65')).flush(env(BRUTE));
  });
});
