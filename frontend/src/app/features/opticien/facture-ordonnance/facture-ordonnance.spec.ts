import { ComponentFixture, TestBed } from '@angular/core/testing';
import { registerLocaleData } from '@angular/common';
import { ActivatedRoute, convertToParamMap, provideRouter } from '@angular/router';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import localeFr from '@angular/common/locales/fr';

import { Auth } from '../../../core/services/auth';
import { FactureOrdonnance } from './facture-ordonnance';

registerLocaleData(localeFr);

const PATIENT = { id: 46, nom: 'Nkeng', prenom: 'Aline' };

function ordonnance(id: number, consultationId: number, patientId = 46) {
  return {
    id,
    numero: `ORD-2026-00${id}`,
    consultation_id: consultationId,
    patient_id: patientId,
    prescription: { od: { sphere: '-2.50', cylindre: '-0.75', axe: '90', addition: '1.00' }, og: { sphere: '-3.00', cylindre: null, axe: null, addition: null }, ecart_pupillaire: '62' },
    recommandations: 'Port permanent',
    date_emission: '2026-10-20T00:00:00.000000Z',
    date_validite: '2027-10-20T00:00:00.000000Z',
    patient: { ...PATIENT, id: patientId },
    opticien: { id: 73, nom: 'Tchinda', prenom: 'Herve' },
  };
}

function facture(id: number, patientId = 46, extra: Record<string, unknown> = {}) {
  return {
    id,
    numero: `FAC-2026-000${id}`,
    commande_id: 65,
    patient_id: patientId,
    type: 'acompte',
    montant: '20000.00',
    montant_paye: '10000.00',
    solde_restant: 10000,
    statut: 'partiel',
    date_emission: '2026-10-20T00:00:00.000000Z',
    description: 'Acompte',
    patient: { ...PATIENT, id: patientId },
    ...extra,
  };
}

function consultation(id: number, patientId: number, statut: string) {
  return {
    id, patient_id: patientId, cabinet_id: 6, opticien_id: 73, rdv_id: null, date_consultation: '2026-10-20T00:00:00.000000Z',
    motif: 'Controle', plaintes: null, ecart_pupillaire: '62',
    prescription: { od: { sphere: '-2.50', cylindre: '-0.75', axe: '90', addition: '1.00', acuite_loin: null, acuite_pres: null }, og: { sphere: '-3.00', cylindre: null, axe: null, addition: null, acuite_loin: null, acuite_pres: null } },
    observations: null, statut, verrouillee: statut === 'terminee', is_modifiable: statut !== 'terminee',
    patient: { id: patientId, nom: 'Nkeng', prenom: 'Aline', telephone: '+237600000201' },
  };
}

const COMMANDE = {
  id: 65, consultation_id: 114, numero_monture: null, type_verre: 'progressif', teinte: null, description_foyers: null, port: null, antireflet: true,
  diagnostic: null, statut: 'en_cours', notes: null, created_at: '2026-10-20T00:39:32.000000Z',
};

interface Donnees {
  ordonnances?: unknown[];
  factures?: unknown[];
  commandes?: unknown[];
  consultations?: unknown[];
}

describe('FactureOrdonnance', () => {
  let component: FactureOrdonnance;
  let fixture: ComponentFixture<FactureOrdonnance>;
  let http: HttpTestingController;

  async function afficher(d: Donnees = {}, params: Record<string, string> = {}): Promise<HTMLElement> {
    TestBed.configureTestingModule({
      imports: [FactureOrdonnance],
      providers: [
        provideRouter([]),
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: ActivatedRoute, useValue: { snapshot: { queryParamMap: convertToParamMap(params) } } },
      ],
    });
    const auth = TestBed.inject(Auth);
    auth.simulerConnexion('opticien');
    vi.spyOn(auth, 'utilisateur').mockReturnValue({ ...auth.utilisateur()!, cabinetId: '6' });
    http = TestBed.inject(HttpTestingController);
    fixture = TestBed.createComponent(FactureOrdonnance);
    component = fixture.componentInstance;
    fixture.detectChanges();

    if (params['patientId']) {
      http.expectOne((r) => r.url.endsWith(`/cabinets/6/patients/${params['patientId']}`)).flush({
        status: 'success', message: '', data: { patient: { id: Number(params['patientId']), nom: 'Nkeng', prenom: 'Aline', telephone: '+237600000201', email: null, ville: 'Douala' } },
      });
    }
    const ok = (cle: string, valeur: unknown[]) => ({ status: 'success', message: '', data: { [cle]: valeur } });
    http.expectOne((r) => r.url.endsWith('/cabinets/6/consultations')).flush(ok('consultations', d.consultations ?? []));
    http.expectOne((r) => r.url.endsWith('/cabinets/6/commandes')).flush(ok('commandes', d.commandes ?? []));
    http.expectOne((r) => r.url.endsWith('/cabinets/6/ordonnances')).flush(ok('ordonnances', d.ordonnances ?? []));
    http.expectOne((r) => r.url.endsWith('/cabinets/6/factures')).flush(ok('factures', d.factures ?? []));
    await fixture.whenStable();
    fixture.detectChanges();
    return fixture.nativeElement as HTMLElement;
  }

  afterEach(() => {
    sessionStorage.clear();
    localStorage.clear();
    vi.restoreAllMocks();
  });

  it('ordonnances : numéro ORD, patient, validité, prescription ; aucune donnée en dur', async () => {
    const el = await afficher({ ordonnances: [ordonnance(102, 114)] });
    const texte = el.textContent ?? '';

    expect(texte).toContain('ORD-2026-00102');
    expect(texte).toContain('Aline Nkeng');
    expect(texte).toContain('20/10/2026');
    expect(texte).toContain('-2.50');
    expect(texte).not.toContain('Jean Dupont');
    expect(texte).not.toContain('06 12 34 56 78');
    expect(texte).not.toContain('9482');
    expect(texte).not.toContain('FAC-2026-001');
  });

  it('factures : numéro FAC, montant, payé, solde restant et statut en francs CFA sans décimales', async () => {
    const el = await afficher({ factures: [facture(88)] });
    component.changerOnglet('factures');
    fixture.detectChanges();
    const texte = el.textContent ?? '';

    expect(texte).toContain('FAC-2026-00088');
    expect(texte).toContain('Montant 20 000 FCFA');
    expect(texte).toContain('payé 10 000 FCFA');
    expect(texte).toContain('solde restant 10 000 FCFA');
    expect(texte).toContain('Partielle');
    expect(texte).not.toContain('20 000,00');
    expect(texte).not.toContain('Imprimer');
    expect(texte).not.toContain('PDF');
  });

  it('?patientId= : en-tête réel du patient et documents de ce patient seulement', async () => {
    const el = await afficher({ ordonnances: [ordonnance(102, 114, 46), ordonnance(103, 115, 47)] }, { patientId: '46' });

    expect(el.textContent).toContain('Aline Nkeng');
    expect(el.textContent).toContain('+237600000201');
    expect(component.ordonnancesAffichees().map((o) => o.id)).toEqual(['102']);
  });

  it('états vides propres', async () => {
    const el = await afficher();
    expect(el.textContent).toContain('Aucune ordonnance pour le moment.');
    component.changerOnglet('factures');
    fixture.detectChanges();
    expect(el.textContent).toContain('Aucune facture pour le moment.');
  });

  it('erreur de chargement : message du serveur', async () => {
    TestBed.configureTestingModule({
      imports: [FactureOrdonnance],
      providers: [provideRouter([]), provideHttpClient(), provideHttpClientTesting()],
    });
    const auth = TestBed.inject(Auth);
    auth.simulerConnexion('opticien');
    vi.spyOn(auth, 'utilisateur').mockReturnValue({ ...auth.utilisateur()!, cabinetId: '6' });
    http = TestBed.inject(HttpTestingController);
    fixture = TestBed.createComponent(FactureOrdonnance);
    component = fixture.componentInstance;
    fixture.detectChanges();
    http.expectOne((r) => r.url.endsWith('/cabinets/6/consultations')).flush({ data: { consultations: [] } });
    http.expectOne((r) => r.url.endsWith('/cabinets/6/commandes')).flush({ data: { commandes: [] } });
    http.expectOne((r) => r.url.endsWith('/cabinets/6/ordonnances')).flush({ status: 'error', message: 'Erreur interne' }, { status: 500, statusText: 'Server Error' });
    http.expectOne((r) => r.url.endsWith('/cabinets/6/factures')).flush({ status: 'error', message: 'Accès refusé' }, { status: 403, statusText: 'Forbidden' });

    expect(component.erreurOrdonnances()).toContain('Le serveur répond : Erreur interne');
    expect(component.erreurFactures()).toBe('Accès refusé.');
  });

  describe('ordonnance', () => {
    const DONNEES: Donnees = {
      consultations: [consultation(114, 46, 'terminee'), consultation(115, 47, 'en_cours'), consultation(120, 46, 'terminee')],
      ordonnances: [ordonnance(102, 120)],
    };

    it('seules les consultations terminées sans ordonnance sont proposées ; la prescription est pré-remplie', async () => {
      await afficher(DONNEES);
      expect(component.consultationsPourOrdonnance().map((c) => c.id)).toEqual(['114']);

      component.ouvrirFormulaireOrdonnance();
      expect(component.formOrdonnance.getRawValue().consultationId).toBe('114');
      expect(component.formOrdonnance.controls.od.getRawValue().sphere).toBe('-2.50');
      expect(component.formOrdonnance.getRawValue().ecartPupillaire).toBe('62');
    });

    it('POST /consultations/{id}/ordonnances : valeurs en chaînes, champs vides non envoyés ; numéro ORD affiché', async () => {
      const el = await afficher(DONNEES);
      component.ouvrirFormulaireOrdonnance();
      component.formOrdonnance.controls.od.patchValue({ sphere: '-2,50', axe: 90 as unknown as string });
      component.formOrdonnance.patchValue({ recommandations: 'Port permanent' });

      component.creerOrdonnance();
      const req = http.expectOne((r) => r.method === 'POST' && r.url.endsWith('/consultations/114/ordonnances'));
      const corps = req.request.body as Record<string, unknown>;
      expect(corps['od_sphere']).toBe('-2.50');
      expect(corps['od_axe']).toBe('90');
      expect(corps['og_sphere']).toBe('-3.00');
      expect(corps['ecart_pupillaire']).toBe('62');
      expect(corps['recommandations']).toBe('Port permanent');
      expect(corps).not.toHaveProperty('og_cylindre');
      expect(Object.values(corps).every((v) => typeof v === 'string')).toBe(true);
      req.flush({ status: 'success', message: '', data: { ordonnance: ordonnance(130, 114) } }, { status: 201, statusText: 'Created' });
      fixture.detectChanges();

      expect(component.succes()).toBe('Ordonnance ORD-2026-00130 créée.');
      expect(el.textContent).toContain('ORD-2026-00130');
      expect(component.formulaireOrdonnanceOuvert()).toBe(false);
    });

    it('422 (ordonnance déjà existante / consultation non terminée) : message du serveur affiché', async () => {
      await afficher(DONNEES);
      component.ouvrirFormulaireOrdonnance();

      component.creerOrdonnance();
      http.expectOne((r) => r.method === 'POST').flush(
        { status: 'error', message: 'Erreur de validation', errors: { ordonnance: ['Une ordonnance existe déjà pour cette consultation.'] } },
        { status: 422, statusText: 'Unprocessable Entity' },
      );
      expect(component.erreursOrdonnance()).toEqual(['Une ordonnance existe déjà pour cette consultation.']);
    });

    it('403 : « Accès refusé. » ; consultation obligatoire', async () => {
      await afficher(DONNEES);
      component.ouvrirFormulaireOrdonnance();
      component.formOrdonnance.controls.consultationId.setValue('');
      component.creerOrdonnance();
      http.expectNone((r) => r.method === 'POST');

      component.formOrdonnance.controls.consultationId.setValue('114');
      component.creerOrdonnance();
      http.expectOne((r) => r.method === 'POST').flush({ status: 'error', message: 'Accès refusé' }, { status: 403, statusText: 'Forbidden' });
      expect(component.erreurFormOrdonnance()).toBe('Accès refusé.');
    });
  });

  describe('facture', () => {
    const DONNEES: Donnees = { consultations: [consultation(114, 46, 'terminee')], commandes: [COMMANDE] };

    it('POST /commandes/{id}/factures : type, montant numérique, description ; la facture s’ajoute', async () => {
      await afficher(DONNEES);
      component.ouvrirFormulaireFacture();
      expect(component.formFacture.getRawValue().commandeId).toBe('65');
      component.formFacture.patchValue({ montant: '20000', description: 'Acompte' });

      component.creerFacture();
      const req = http.expectOne((r) => r.method === 'POST' && r.url.endsWith('/commandes/65/factures'));
      expect(req.request.body).toEqual({ type: 'acompte', montant: 20000, description: 'Acompte' });
      req.flush({ status: 'success', message: '', data: { facture: facture(88, 46, { montant_paye: '0.00', solde_restant: 20000, statut: 'impaye' }) } }, { status: 201, statusText: 'Created' });

      expect(component.succes()).toBe('Facture FAC-2026-00088 créée.');
      expect(component.factures()[0].soldeRestant).toBe(20000);
    });

    it('montant invalide (décimales, vide) : aucun appel', async () => {
      await afficher(DONNEES);
      component.ouvrirFormulaireFacture();
      component.formFacture.patchValue({ montant: '' });
      component.creerFacture();
      component.formFacture.patchValue({ montant: '1500,50' });
      component.creerFacture();
      http.expectNone((r) => r.method === 'POST');
    });

    it('422 : messages champ par champ ; 403 : « Accès refusé. »', async () => {
      await afficher(DONNEES);
      component.ouvrirFormulaireFacture();
      component.formFacture.patchValue({ montant: '20000' });

      component.creerFacture();
      http.expectOne((r) => r.method === 'POST').flush(
        { status: 'error', message: 'Erreur de validation', errors: { montant: ['Le montant est invalide.'] } },
        { status: 422, statusText: 'Unprocessable Entity' },
      );
      expect(component.erreursChampsFacture()['montant']).toBe('Le montant est invalide.');

      component.creerFacture();
      http.expectOne((r) => r.method === 'POST').flush({ status: 'error', message: 'Accès refusé' }, { status: 403, statusText: 'Forbidden' });
      expect(component.erreurFormFacture()).toBe('Accès refusé.');
    });

    it('paiement : PUT /factures/{id}/paiement, la ligne passe au cumul, solde et statut du serveur', async () => {
      await afficher({ ...DONNEES, factures: [facture(88, 46, { montant_paye: '0.00', solde_restant: 20000, statut: 'impaye' })] });
      const f = component.factures()[0];

      component.ouvrirPaiement(f);
      component.montantPaiement.set('10000');
      component.enregistrerPaiement(f);

      const req = http.expectOne((r) => r.method === 'PUT' && r.url.endsWith('/factures/88/paiement'));
      expect(req.request.body).toEqual({ montant_paye: 10000 });
      req.flush({ status: 'success', message: '', data: { facture: facture(88) } });

      expect(component.factures()[0]).toMatchObject({ montantPaye: 10000, soldeRestant: 10000, statut: 'partiel' });
      expect(component.succes()).toContain('solde restant 10 000 FCFA');
      expect(component.paiementOuvertPour()).toBeNull();
    });

    it('paiement : montant nul, négatif ou décimal refusé sans appel ; 422 du serveur affiché', async () => {
      await afficher({ ...DONNEES, factures: [facture(88)] });
      const f = component.factures()[0];
      component.ouvrirPaiement(f);

      for (const valeur of ['', '0', '-5', '10,5']) {
        component.montantPaiement.set(valeur);
        component.enregistrerPaiement(f);
      }
      http.expectNone((r) => r.method === 'PUT');
      expect(component.erreurPaiement()).toContain('supérieur à 0');

      component.montantPaiement.set('99999');
      component.enregistrerPaiement(f);
      http.expectOne((r) => r.method === 'PUT').flush(
        { status: 'error', message: 'Erreur', errors: { montant_paye: ['Le montant dépasse le solde restant.'] } },
        { status: 422, statusText: 'Unprocessable Entity' },
      );
      expect(component.erreurPaiement()).toBe('Le montant dépasse le solde restant.');
    });

    it('filtre de statut : GET /cabinets/6/factures?statut=partiel', async () => {
      await afficher(DONNEES);
      component.filtrerStatut('partiel');
      const req = http.expectOne((r) => r.url.endsWith('/cabinets/6/factures'));
      expect(req.request.params.get('statut')).toBe('partiel');
      req.flush({ status: 'success', message: '', data: { factures: [facture(88)] } });
      expect(component.factures().length).toBe(1);
    });
  });
});
