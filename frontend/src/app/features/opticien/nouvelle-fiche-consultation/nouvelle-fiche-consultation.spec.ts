import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute, Router, convertToParamMap, provideRouter } from '@angular/router';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';

import { Auth } from '../../../core/services/auth';
import { NouvelleFicheConsultation } from './nouvelle-fiche-consultation';

const OEIL_VIDE = { sphere: null, cylindre: null, axe: null, addition: null, acuite_loin: null, acuite_pres: null };

function brute(extra: Record<string, unknown> = {}) {
  return {
    id: 115,
    patient_id: 47,
    cabinet_id: 6,
    opticien_id: 73,
    rdv_id: null,
    date_consultation: '2026-10-20T00:00:00.000000Z',
    motif: 'Controle',
    plaintes: { vision_flou_loin: true, vision_flou_pres: false, vision_double: false, demangeaisons: false, larmoiement: false, autres: null },
    ecart_pupillaire: null,
    prescription: { od: { ...OEIL_VIDE, sphere: '-1.25', axe: '90' }, og: OEIL_VIDE },
    observations: 'RAS',
    statut: 'en_cours',
    verrouillee: false,
    is_modifiable: true,
    patient: { id: 47, nom: 'Biyong', prenom: 'Marc', telephone: '+237600000202' },
    opticien: { id: 73, nom: 'Tchinda', prenom: 'Herve' },
    ...extra,
  };
}
const env = (c: unknown) => ({ status: 'success', message: '', data: { consultation: c } });
const PATIENTS = {
  status: 'success',
  message: '',
  data: {
    patients: [
      { id: 46, nom: 'Nkeng', prenom: 'Aline', telephone: '+237600000201', email: null, ville: 'Douala' },
      { id: 47, nom: 'Biyong', prenom: 'Marc', telephone: '+237600000202', email: null, ville: 'Douala' },
    ],
  },
};
const TERMINEE = { statut: 'terminee', verrouillee: true, is_modifiable: false };

describe('NouvelleFicheConsultation', () => {
  let component: NouvelleFicheConsultation;
  let fixture: ComponentFixture<NouvelleFicheConsultation>;
  let http: HttpTestingController;
  let router: Router;

  function creer(params: Record<string, string>): HTMLElement {
    TestBed.configureTestingModule({
      imports: [NouvelleFicheConsultation],
      providers: [
        provideRouter([]),
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: ActivatedRoute, useValue: { snapshot: { queryParamMap: convertToParamMap(params) } } },
      ],
    });
    const auth = TestBed.inject(Auth);
    auth.simulerConnexion('opticien');
    const utilisateur = auth.utilisateur();
    vi.spyOn(auth, 'utilisateur').mockReturnValue({ ...utilisateur!, cabinetId: '6' });
    http = TestBed.inject(HttpTestingController);
    router = TestBed.inject(Router);
    vi.spyOn(router, 'navigate').mockResolvedValue(true);
    fixture = TestBed.createComponent(NouvelleFicheConsultation);
    component = fixture.componentInstance;
    fixture.detectChanges();
    return fixture.nativeElement as HTMLElement;
  }

  /** Ouvre une consultation existante (`?consultationId=`). */
  async function ouvrir(extra: Record<string, unknown> = {}): Promise<HTMLElement> {
    const el = creer({ consultationId: '115' });
    http.expectOne((r) => r.url.endsWith('/consultations/115')).flush(env(brute(extra)));
    await fixture.whenStable();
    fixture.detectChanges();
    return el;
  }

  /** Ouvre le formulaire de création, patient présélectionné. */
  async function ouvrirCreation(): Promise<HTMLElement> {
    const el = creer({ patientId: '47' });
    http.expectOne((r) => r.url.endsWith('/cabinets/6/patients')).flush(PATIENTS);
    await fixture.whenStable();
    fixture.detectChanges();
    return el;
  }

  function remplirCreation(): void {
    component.formulaire.patchValue({ motif: 'Controle de la vue', observations: 'Notes' });
    component.formulaire.controls.od.patchValue({ sphere: '-1.25', axe: 90 as unknown as string });
    component.formulaire.controls.plaintes.patchValue({ visionDouble: true });
  }

  afterEach(() => {
    sessionStorage.clear();
    localStorage.clear();
    vi.restoreAllMocks();
  });

  it('création : patient choisi parmi GET /cabinets/{id}/patients', async () => {
    const el = await ouvrirCreation();
    const options = Array.from(el.querySelectorAll('select#patientId option')).map((o) => o.textContent?.trim());
    expect(options.some((t) => t?.includes('Aline Nkeng'))).toBe(true);
    expect(options.some((t) => t?.includes('Marc Biyong'))).toBe(true);
    expect(component.patientNom()).toBe('Marc Biyong');
  });

  it('création : POST /consultations à plat, prescription en chaînes, cases cochées en booléens', async () => {
    await ouvrirCreation();
    remplirCreation();

    component.enregistrer();
    const req = http.expectOne((r) => r.method === 'POST' && r.url.endsWith('/consultations'));
    const corps = req.request.body as Record<string, unknown>;
    expect(corps['patient_id']).toBe(47);
    expect(corps['cabinet_id']).toBe(6);
    expect(corps['motif']).toBe('Controle de la vue');
    expect(corps['od_sphere']).toBe('-1.25');
    expect(corps['od_axe']).toBe('90'); // chaîne, pas le nombre 90 (sinon 422 « must be a string »)
    expect(corps['plainte_vision_double']).toBe(true);
    expect(corps['plainte_vision_flou_loin']).toBe(false);
    expect(corps['observations']).toBe('Notes');
    expect(corps).not.toHaveProperty('plaintes');
    expect(corps).not.toHaveProperty('prescription');
    expect(corps).not.toHaveProperty('og_sphere'); // champ vide : non envoyé
    req.flush(env(brute()), { status: 201, statusText: 'Created' });

    expect(component.consultationId()).toBe('115');
    expect(component.modifiable()).toBe(true);
    expect(component.succes()).toContain('Consultation créée');
  });

  it('création : motif obligatoire, aucun appel sans motif', async () => {
    await ouvrirCreation();
    component.enregistrer();
    http.expectNone((r) => r.method === 'POST');
    expect(component.formulaire.controls.motif.touched).toBe(true);
  });

  it('422 : erreurs champ par champ (motif sous son champ, od_axe dans le bandeau)', async () => {
    const el = await ouvrirCreation();
    remplirCreation();
    fixture.detectChanges();
    component.enregistrer();

    http.expectOne((r) => r.method === 'POST').flush(
      {
        status: 'error',
        message: 'Erreur de validation',
        errors: { motif: ['Le motif est invalide.'], od_axe: ['The od axe field must be a string.'] },
      },
      { status: 422, statusText: 'Unprocessable Entity' },
    );
    fixture.detectChanges();

    expect(el.querySelector('[data-champ=motif]')?.textContent).toContain('Le motif est invalide.');
    expect(component.erreursAutres()).toEqual(['Œil droit — axe : The od axe field must be a string.']);
    expect(component.consultationId()).toBeNull();
  });

  it('403 : « Accès refusé. »', async () => {
    await ouvrirCreation();
    remplirCreation();
    component.enregistrer();
    http.expectOne((r) => r.method === 'POST').flush({ status: 'error', message: 'Accès refusé' }, { status: 403, statusText: 'Forbidden' });
    expect(component.erreurGenerale()).toBe('Accès refusé.');
  });

  it('500 : message du serveur', async () => {
    await ouvrirCreation();
    remplirCreation();
    component.enregistrer();
    http.expectOne((r) => r.method === 'POST').flush({ status: 'error', message: 'Erreur interne' }, { status: 500, statusText: 'Server Error' });
    expect(component.erreurGenerale()).toContain('Le serveur répond : Erreur interne');
  });

  it('consultation en cours : formulaire rempli, modifiable, PATCH avec les champs modifiés', async () => {
    const el = await ouvrir();
    expect(component.formulaire.getRawValue().motif).toBe('Controle');
    expect(component.formulaire.controls.od.getRawValue().sphere).toBe('-1.25');
    expect(component.modifiable()).toBe(true);
    expect(el.textContent).toContain('Terminer la consultation');
    expect(component.formulaire.controls.patientId.disabled).toBe(true);

    component.formulaire.patchValue({ observations: 'Modifié' });
    component.enregistrer();
    const req = http.expectOne((r) => r.method === 'PATCH' && r.url.endsWith('/consultations/115'));
    expect((req.request.body as Record<string, unknown>)['observations']).toBe('Modifié');
    expect(req.request.body).not.toHaveProperty('patient_id');
    req.flush(env(brute({ observations: 'Modifié' })));

    expect(component.succes()).toBe('Modifications enregistrées.');
  });

  it('Terminer : confirmation d’abord (aucun appel), avertissement de verrouillage, puis PUT /terminer et lecture seule', async () => {
    const el = await ouvrir();

    component.demanderTerminer();
    fixture.detectChanges();
    http.expectNone((r) => r.method === 'PUT');
    expect(el.textContent).toContain('verrouillée définitivement');

    component.confirmerTerminer();
    const req = http.expectOne((r) => r.method === 'PUT' && r.url.endsWith('/consultations/115/terminer'));
    req.flush(env(brute(TERMINEE)));
    fixture.detectChanges();

    expect(component.modifiable()).toBe(false);
    expect(component.formulaire.disabled).toBe(true);
    expect(el.textContent).toContain('Consultation terminée');
    expect(el.textContent).not.toContain('Terminer la consultation');
    expect(el.querySelector('button[type=submit]')).toBeNull();
  });

  it('Terminer avec des modifications en attente : PATCH puis PUT', async () => {
    await ouvrir();
    component.formulaire.patchValue({ observations: 'Dernière note' });
    component.formulaire.markAsDirty();

    component.demanderTerminer();
    component.confirmerTerminer();
    http.expectOne((r) => r.method === 'PATCH').flush(env(brute({ observations: 'Dernière note' })));
    http.expectOne((r) => r.method === 'PUT' && r.url.endsWith('/terminer')).flush(env(brute(TERMINEE)));

    expect(component.modifiable()).toBe(false);
  });

  it('Terminer annulé : aucun appel', async () => {
    await ouvrir();
    component.demanderTerminer();
    component.annulerTerminer();
    component.confirmerTerminer(); // la confirmation a été annulée : rien ne part
    http.expectNone((r) => r.method === 'PUT');
    expect(component.confirmationTerminer()).toBe(false);
  });

  it('consultation terminée ou verrouillée : lecture seule, sans bouton d’enregistrement ni de clôture', async () => {
    const el = await ouvrir(TERMINEE);

    expect(component.modifiable()).toBe(false);
    expect(component.formulaire.disabled).toBe(true);
    expect(el.textContent).toContain('verrouillée définitivement');
    expect(el.querySelector('button[type=submit]')).toBeNull();
    expect(el.textContent).not.toContain('Terminer la consultation');

    component.enregistrer();
    http.expectNone((r) => r.method === 'PATCH');
  });

  it('PATCH refusé car verrouillée : errors.consultation[0] affiché', async () => {
    await ouvrir();
    component.formulaire.patchValue({ observations: 'x' });
    component.enregistrer();
    http.expectOne((r) => r.method === 'PATCH').flush(
      { status: 'error', message: 'Erreur de validation', errors: { consultation: ["Cette consultation n'est plus modifiable car elle est verrouillée ou terminée."] } },
      { status: 422, statusText: 'Unprocessable Entity' },
    );
    expect(component.erreurGenerale()).toContain("n'est plus modifiable");
  });

  it('consultation introuvable (403) : message d’erreur', () => {
    creer({ consultationId: '999' });
    http.expectOne((r) => r.url.endsWith('/consultations/999')).flush({ status: 'error', message: 'Accès refusé' }, { status: 403, statusText: 'Forbidden' });
    expect(component.erreurChargement()).toBe('Accès refusé.');
  });
});
