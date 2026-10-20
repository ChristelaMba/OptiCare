import { ComponentFixture, TestBed } from '@angular/core/testing';
import { registerLocaleData } from '@angular/common';
import { ActivatedRoute, convertToParamMap, provideRouter } from '@angular/router';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import localeFr from '@angular/common/locales/fr';

import { Auth } from '../../../core/services/auth';
import { SuiviCommande } from './suivi-commande';

registerLocaleData(localeFr);

function commande(id: number, consultationId: number, statut = 'initie') {
  return {
    id,
    consultation_id: consultationId,
    numero_monture: 'MON-1',
    type_verre: 'progressif',
    teinte: 'claire',
    description_foyers: null,
    port: 'permanent',
    antireflet: true,
    diagnostic: { od: { sphere: '-2.50', cylindre: null, axe: null, addition: null }, og: null },
    statut,
    notes: null,
    created_at: '2026-10-20T00:39:32.000000Z',
    consultation: { id: consultationId, motif: 'Controle' },
    opticien: { id: 73, nom: 'Tchinda', prenom: 'Herve' },
  };
}

function consultation(id: number, patientId: number, nom: string, statut = 'terminee') {
  return {
    id, patient_id: patientId, cabinet_id: 6, opticien_id: 73, rdv_id: null, date_consultation: '2026-10-20T00:00:00.000000Z',
    motif: 'Controle', plaintes: null, ecart_pupillaire: null, prescription: null, observations: null,
    statut, verrouillee: statut === 'terminee', is_modifiable: statut !== 'terminee',
    patient: { id: patientId, nom, prenom: 'Test', telephone: '+237600000201' },
  };
}

const CONSULTATIONS = { status: 'success', message: '', data: { consultations: [consultation(114, 46, 'Nkeng'), consultation(115, 47, 'Biyong', 'en_cours')] } };
const liste = (commandes: unknown[]) => ({ status: 'success', message: '', data: { commandes } });
const env = (c: unknown) => ({ status: 'success', message: '', data: { commande: c } });

describe('SuiviCommande', () => {
  let component: SuiviCommande;
  let fixture: ComponentFixture<SuiviCommande>;
  let http: HttpTestingController;

  function creer(params: Record<string, string> = {}): HTMLElement {
    TestBed.configureTestingModule({
      imports: [SuiviCommande],
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
    fixture = TestBed.createComponent(SuiviCommande);
    component = fixture.componentInstance;
    fixture.detectChanges();
    return fixture.nativeElement as HTMLElement;
  }

  async function afficher(commandes: unknown[], params: Record<string, string> = {}): Promise<HTMLElement> {
    const el = creer(params);
    if (params['patientId']) {
      http.expectOne((r) => r.url.endsWith(`/cabinets/6/patients/${params['patientId']}`)).flush({
        status: 'success',
        message: '',
        data: { patient: { id: Number(params['patientId']), nom: 'Nkeng', prenom: 'Aline', telephone: '+237600000201', email: null, ville: 'Douala' } },
      });
    }
    http.expectOne((r) => r.url.endsWith('/cabinets/6/consultations')).flush(CONSULTATIONS);
    http.expectOne((r) => r.url.endsWith('/cabinets/6/commandes')).flush(liste(commandes));
    await fixture.whenStable();
    fixture.detectChanges();
    return el;
  }

  afterEach(() => {
    sessionStorage.clear();
    localStorage.clear();
    vi.restoreAllMocks();
  });

  it('liste les commandes réelles avec le patient retrouvé par la consultation ; aucune donnée en dur', async () => {
    const el = await afficher([commande(65, 114, 'en_cours')]);

    const texte = el.textContent ?? '';
    expect(texte).toContain('Commande n°65');
    expect(texte).toContain('Test Nkeng');
    expect(texte).toContain('En cours');
    expect(texte).toContain('progressif');
    expect(texte).not.toContain('Jean Dupont');
    expect(texte).not.toContain('06 12 34 56 78');
    expect(texte).not.toContain('9482');
  });

  it('?patientId= : en-tête réel du patient (GET /cabinets/6/patients/46) et seulement ses commandes', async () => {
    const el = await afficher([commande(65, 114), commande(66, 115)], { patientId: '46' });

    expect(el.textContent).toContain('Aline Nkeng');
    expect(el.textContent).toContain('+237600000201');
    expect(component.lignes().map((l) => l.commande.id)).toEqual(['65']);
  });

  it('état vide : « Aucune commande pour le moment. »', async () => {
    const el = await afficher([]);
    expect(el.textContent).toContain('Aucune commande pour le moment.');
  });

  it('filtre de statut', async () => {
    await afficher([commande(65, 114, 'en_cours'), commande(66, 114, 'termine')]);
    component.filtreStatut.set('termine');
    expect(component.lignes().map((l) => l.commande.id)).toEqual(['66']);
  });

  it('erreur 500 : message du serveur ; 403 : « Accès refusé. »', () => {
    creer();
    http.expectOne((r) => r.url.endsWith('/cabinets/6/consultations')).flush(CONSULTATIONS);
    http.expectOne((r) => r.url.endsWith('/cabinets/6/commandes')).flush({ status: 'error', message: 'Erreur interne' }, { status: 500, statusText: 'Server Error' });
    expect(component.erreur()).toContain('Le serveur répond : Erreur interne');

    component.ngOnInit();
    http.expectOne((r) => r.url.endsWith('/cabinets/6/consultations')).flush(CONSULTATIONS);
    http.expectOne((r) => r.url.endsWith('/cabinets/6/commandes')).flush({ status: 'error', message: 'Accès refusé' }, { status: 403, statusText: 'Forbidden' });
    expect(component.erreur()).toBe('Accès refusé.');
  });

  describe('changement de statut', () => {
    it('PATCH /commandes/{id} { statut } ; la ligne est mise à jour avec la réponse', async () => {
      await afficher([commande(65, 114, 'initie')]);
      component.selectionner(component.commandes()[0]);
      component.statutChoisi.set('en_cours');

      component.changerStatut();
      const req = http.expectOne((r) => r.method === 'PATCH' && r.url.endsWith('/commandes/65'));
      expect(req.request.body).toEqual({ statut: 'en_cours' });
      req.flush(env(commande(65, 114, 'en_cours')));

      expect(component.commandes()[0].statut).toBe('en_cours');
      expect(component.succes()).toContain('En cours');
    });

    it('commande terminée : lecture seule (pas de sélecteur), aucun appel', async () => {
      const el = await afficher([commande(65, 114, 'termine')]);
      component.selectionner(component.commandes()[0]);
      fixture.detectChanges();

      expect(el.textContent).toContain('lecture seule');
      expect(el.querySelector('section[aria-label="Détail de la commande"] select')).toBeNull();
      component.statutChoisi.set('en_cours');
      component.changerStatut();
      http.expectNone((r) => r.method === 'PATCH');
    });

    it('422 : message du serveur affiché ; 403 : « Accès refusé. »', async () => {
      await afficher([commande(65, 114, 'initie')]);
      component.selectionner(component.commandes()[0]);
      component.statutChoisi.set('termine');

      component.changerStatut();
      http.expectOne((r) => r.method === 'PATCH').flush(
        { status: 'error', message: 'Erreur', errors: { commande: ['Cette commande est terminée.'] } },
        { status: 422, statusText: 'Unprocessable Entity' },
      );
      expect(component.erreurAction()).toBe('Cette commande est terminée.');
      expect(component.commandes()[0].statut).toBe('initie');

      component.changerStatut();
      http.expectOne((r) => r.method === 'PATCH').flush({ status: 'error', message: 'Accès refusé' }, { status: 403, statusText: 'Forbidden' });
      expect(component.erreurAction()).toBe('Accès refusé.');
    });
  });

  describe('création', () => {
    it('POST /commandes à plat : consultation_id numérique, antireflet booléen, champs vides non envoyés', async () => {
      await afficher([]);
      component.ouvrirFormulaire();
      component.formulaire.patchValue({ consultationId: '114', typeVerre: 'progressif', antireflet: true, notes: 'N' });
      component.formulaire.controls.od.patchValue({ sphere: '-2,50', axe: '90' });

      component.creer();
      const req = http.expectOne((r) => r.method === 'POST' && r.url.endsWith('/commandes'));
      expect(req.request.body).toEqual({
        consultation_id: 114,
        antireflet: true,
        type_verre: 'progressif',
        diag_od_sphere: '-2.50',
        diag_od_axe: '90',
        notes: 'N',
      });
      req.flush(env(commande(65, 114)), { status: 201, statusText: 'Created' });

      expect(component.commandes().map((c) => c.id)).toEqual(['65']);
      expect(component.formulaireOuvert()).toBe(false);
    });

    it('consultation obligatoire et diagnostic valide : aucun appel sinon', async () => {
      await afficher([]);
      component.ouvrirFormulaire();
      component.creer();
      http.expectNone((r) => r.method === 'POST');

      component.formulaire.patchValue({ consultationId: '114' });
      component.formulaire.controls.od.patchValue({ axe: '200' });
      component.creer();
      http.expectNone((r) => r.method === 'POST');
    });

    it('422 : erreurs champ par champ', async () => {
      const el = await afficher([]);
      component.ouvrirFormulaire();
      component.formulaire.patchValue({ consultationId: '114' });
      fixture.detectChanges();

      component.creer();
      http.expectOne((r) => r.method === 'POST').flush(
        { status: 'error', message: 'Erreur de validation', errors: { type_verre: ['Le type de verre est invalide.'], diag_od_axe: ['Axe invalide.'] } },
        { status: 422, statusText: 'Unprocessable Entity' },
      );
      fixture.detectChanges();

      expect(el.querySelector('[data-champ=type_verre]')?.textContent).toContain('invalide');
      expect(component.erreursAutres()).toEqual(['diag_od_axe : Axe invalide.']);
    });

    it('403 : « Accès refusé. »', async () => {
      await afficher([]);
      component.ouvrirFormulaire();
      component.formulaire.patchValue({ consultationId: '114' });
      component.creer();
      http.expectOne((r) => r.method === 'POST').flush({ status: 'error', message: 'Accès refusé' }, { status: 403, statusText: 'Forbidden' });
      expect(component.erreurFormulaire()).toBe('Accès refusé.');
    });
  });
});
