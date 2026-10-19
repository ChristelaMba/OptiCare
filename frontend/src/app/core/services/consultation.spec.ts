import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';

import { ConsultationService } from './consultation';
import { PatientsCabinet } from './patients-cabinet';

const OEIL = { sphere: '-1.25', cylindre: null, axe: '90', addition: null, acuite_loin: '8/10', acuite_pres: null };
const BRUTE = {
  id: 115,
  patient_id: 47,
  cabinet_id: 6,
  opticien_id: 73,
  rdv_id: null,
  date_consultation: '2026-10-20T00:00:00.000000Z',
  motif: 'Controle',
  plaintes: { vision_flou_loin: true, vision_flou_pres: false, vision_double: false, demangeaisons: false, larmoiement: false, autres: 'x' },
  ecart_pupillaire: '63',
  prescription: { od: OEIL, og: OEIL },
  observations: 'RAS',
  statut: 'en_cours',
  verrouillee: false,
  is_modifiable: true,
  patient: { id: 47, nom: 'Biyong', prenom: 'Marc', telephone: '+237600000202' },
  opticien: { id: 73, nom: 'Tchinda', prenom: 'Herve' },
};
const env = (consultation: unknown) => ({ status: 'success', message: '', data: { consultation } });
const envListe = (consultations: unknown[]) => ({ status: 'success', message: '', data: { consultations } });

describe('ConsultationService', () => {
  let service: ConsultationService;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [provideHttpClient(), provideHttpClientTesting()] });
    service = TestBed.inject(ConsultationService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('creer() : POST /consultations, corps à plat, lit data.consultation', () => {
    let resultat: unknown;
    const corps = { patient_id: 47, cabinet_id: 6, date_consultation: '2026-10-20', motif: 'Controle', od_axe: '90', plainte_vision_double: true };
    service.creer(corps).subscribe((r) => (resultat = r));

    const req = http.expectOne((r) => r.url.endsWith('/consultations'));
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual(corps);
    req.flush(env(BRUTE), { status: 201, statusText: 'Created' });

    expect(resultat).toMatchObject({
      id: '115',
      patientId: '47',
      patientNom: 'Marc Biyong',
      opticienNom: 'Herve Tchinda',
      date: '2026-10-20',
      statut: 'en_cours',
      modifiable: true,
      ecartPupillaire: '63',
      od: { axe: '90' },
    });
  });

  it('obtenir() : GET /consultations/{id}', () => {
    service.obtenir('115').subscribe();
    const req = http.expectOne((r) => r.url.endsWith('/consultations/115'));
    expect(req.request.method).toBe('GET');
    req.flush(env(BRUTE));
  });

  it('modifier() : PATCH /consultations/{id}', () => {
    service.modifier('115', { observations: 'maj' }).subscribe();
    const req = http.expectOne((r) => r.url.endsWith('/consultations/115'));
    expect(req.request.method).toBe('PATCH');
    expect(req.request.body).toEqual({ observations: 'maj' });
    req.flush(env({ ...BRUTE, observations: 'maj' }));
  });

  it('terminer() : PUT /consultations/{id}/terminer ; terminée/verrouillée = non modifiable', () => {
    let resultat: { modifiable: boolean; statut: string } | undefined;
    service.terminer('115').subscribe((r) => (resultat = r));
    const req = http.expectOne((r) => r.url.endsWith('/consultations/115/terminer'));
    expect(req.request.method).toBe('PUT');
    req.flush(env({ ...BRUTE, statut: 'terminee', verrouillee: true, is_modifiable: false }));

    expect(resultat).toMatchObject({ statut: 'terminee', modifiable: false });
  });

  it('listerParCabinet() : GET /cabinets/{id}/consultations, data.consultations[] avec patient', () => {
    let resultat: { patientNom: string | null }[] = [];
    service.listerParCabinet('6').subscribe((r) => (resultat = r));
    http.expectOne((r) => r.url.endsWith('/cabinets/6/consultations')).flush(envListe([BRUTE]));
    expect(resultat[0].patientNom).toBe('Marc Biyong');
  });

  it('listerParPatient() : GET /patients/{id}/consultations ; sans prescription ni plaintes : valeurs vides', () => {
    let resultat: { od: { sphere: string | null }; plaintes: { vision_double: boolean } }[] = [];
    service.listerParPatient('47').subscribe((r) => (resultat = r));
    http.expectOne((r) => r.url.endsWith('/patients/47/consultations')).flush(
      envListe([{ ...BRUTE, prescription: null, plaintes: null, patient: undefined }]),
    );
    expect(resultat[0].od.sphere).toBeNull();
    expect(resultat[0].plaintes.vision_double).toBe(false);
  });
});

describe('PatientsCabinet', () => {
  it('lister() : GET /cabinets/{id}/patients, data.patients[]', () => {
    TestBed.configureTestingModule({ providers: [provideHttpClient(), provideHttpClientTesting()] });
    const service = TestBed.inject(PatientsCabinet);
    const http = TestBed.inject(HttpTestingController);

    let resultat: unknown;
    service.lister('6').subscribe((r) => (resultat = r));
    http.expectOne((r) => r.url.endsWith('/cabinets/6/patients')).flush({
      status: 'success',
      message: '',
      data: { patients: [{ id: 46, nom: 'Nkeng', prenom: 'Aline', telephone: '+237600000201', email: null, ville: 'Douala' }] },
    });
    http.verify();

    expect(resultat).toEqual([
      { id: '46', nom: 'Nkeng', prenom: 'Aline', nomComplet: 'Aline Nkeng', telephone: '+237600000201', email: null, ville: 'Douala' },
    ]);
  });
});
