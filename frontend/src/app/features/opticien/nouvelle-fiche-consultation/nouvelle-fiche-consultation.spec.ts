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

  describe('décimales et effacement de champs', () => {
    it('une valeur serveur « -1.00 » s’affiche telle quelle (champ texte, pas de normalisation en « -1 »)', async () => {
      const el = await ouvrir({ prescription: { od: { ...OEIL_VIDE, sphere: '-1.00', cylindre: '-0.50', addition: '2.00' }, og: OEIL_VIDE } });

      expect((el.querySelector('#odSphere') as HTMLInputElement).value).toBe('-1.00');
      expect((el.querySelector('#odCylindre') as HTMLInputElement).value).toBe('-0.50');
      expect((el.querySelector('#odAdd') as HTMLInputElement).value).toBe('2.00');
      expect(el.querySelectorAll('input[type=number]').length).toBe(0);
    });

    it('sans modification : aucun appel au serveur', async () => {
      await ouvrir({ prescription: { od: { ...OEIL_VIDE, sphere: '-1.00' }, og: OEIL_VIDE } });

      component.enregistrer();

      http.expectNone((r) => r.method === 'PATCH');
      expect(component.succes()).toBe('Aucune modification à enregistrer.');
    });

    it('vider un champ : il est envoyé à null, et seul ce champ est envoyé', async () => {
      await ouvrir({ observations: 'RAS', prescription: { od: { ...OEIL_VIDE, sphere: '-1.00', axe: '80' }, og: OEIL_VIDE } });

      component.formulaire.patchValue({ observations: '' });
      component.formulaire.controls.od.patchValue({ axe: '' });
      component.enregistrer();

      const req = http.expectOne((r) => r.method === 'PATCH' && r.url.endsWith('/consultations/115'));
      expect(req.request.body).toEqual({ observations: null, od_axe: null });
      req.flush(env(brute({ observations: null, prescription: { od: { ...OEIL_VIDE, sphere: '-1.00' }, og: OEIL_VIDE } })));

      expect(component.formulaire.getRawValue().observations).toBe('');
      expect(component.formulaire.controls.od.getRawValue().axe).toBe('');
      // relecture : plus rien à envoyer
      component.enregistrer();
      http.expectNone((r) => r.method === 'PATCH');
    });

    it('modifier une valeur sans toucher aux autres : seul le champ modifié part, en chaîne', async () => {
      await ouvrir({ prescription: { od: { ...OEIL_VIDE, sphere: '-1.00', axe: '80' }, og: OEIL_VIDE } });

      component.formulaire.controls.od.patchValue({ sphere: '-1,25' });
      component.enregistrer();

      const req = http.expectOne((r) => r.method === 'PATCH');
      expect(req.request.body).toEqual({ od_sphere: '-1.25' }); // virgule → point, toujours une chaîne
      req.flush(env(brute()));
    });

    it('décocher une plainte l’enregistre (false envoyé)', async () => {
      await ouvrir();

      component.formulaire.controls.plaintes.patchValue({ visionFlouLoin: false });
      component.enregistrer();

      expect(http.expectOne((r) => r.method === 'PATCH').request.body).toEqual({ plainte_vision_flou_loin: false });
    });

    it('valeurs invalides (sphère non numérique, axe > 180) : refusées sans appel', async () => {
      await ouvrir();
      component.formulaire.controls.od.patchValue({ sphere: 'abc' });
      component.enregistrer();
      http.expectNone((r) => r.method === 'PATCH');

      component.formulaire.controls.od.patchValue({ sphere: '-1.00', axe: '200' });
      component.enregistrer();
      http.expectNone((r) => r.method === 'PATCH');
      expect(component.formulaire.controls.od.invalid).toBe(true);
    });

    it('terminer sans modification en attente : seulement PUT /terminer', async () => {
      await ouvrir();
      component.demanderTerminer();
      component.confirmerTerminer();

      http.expectNone((r) => r.method === 'PATCH');
      http.expectOne((r) => r.method === 'PUT' && r.url.endsWith('/terminer')).flush(env(brute(TERMINEE)));
    });
  });

  describe('messages de confirmation', () => {
    it('« Modifications enregistrées. » visible dans une fenêtre fixe, puis effacé seul', async () => {
      const el = await ouvrir();
      vi.useFakeTimers();
      try {
        component.formulaire.patchValue({ observations: 'Nouvelle note' });
        component.enregistrer();
        http.expectOne((r) => r.method === 'PATCH').flush(env(brute({ observations: 'Nouvelle note' })));
        fixture.detectChanges();

        const toast = el.querySelector('.toast[role=status]');
        expect(toast?.textContent).toContain('Modifications enregistrées');
        expect(component.succes()).toBe('Modifications enregistrées.');

        vi.advanceTimersByTime(5100);
        fixture.detectChanges();
        expect(component.succes()).toBeNull();
        expect(el.querySelector('.toast[role=status]')).toBeNull();
      } finally {
        vi.useRealTimers();
      }
    });

    it('« Aucune modification à enregistrer. » : visible puis effacé seul', async () => {
      const el = await ouvrir();
      vi.useFakeTimers();
      try {
        component.enregistrer();
        fixture.detectChanges();
        expect(el.querySelector('.toast[role=status]')?.textContent).toContain('Aucune modification à enregistrer');

        vi.advanceTimersByTime(5100);
        expect(component.succes()).toBeNull();
      } finally {
        vi.useRealTimers();
      }
    });

    it('un nouveau message n’est pas effacé par la minuterie du précédent', async () => {
      await ouvrir();
      vi.useFakeTimers();
      try {
        component.enregistrer(); // « Aucune modification… »
        vi.advanceTimersByTime(3000);
        component.formulaire.patchValue({ observations: 'x' });
        component.enregistrer();
        http.expectOne((r) => r.method === 'PATCH').flush(env(brute({ observations: 'x' })));
        vi.advanceTimersByTime(3000); // 6 s depuis le premier, 3 s depuis le second
        expect(component.succes()).toBe('Modifications enregistrées.');
      } finally {
        vi.useRealTimers();
      }
    });

    it('échec de l’enregistrement : message d’erreur visible dans la fenêtre fixe', async () => {
      const el = await ouvrir();
      component.formulaire.patchValue({ observations: 'x' });
      component.enregistrer();
      http.expectOne((r) => r.method === 'PATCH').flush({ status: 'error', message: 'Erreur interne' }, { status: 500, statusText: 'Server Error' });
      fixture.detectChanges();

      const toast = el.querySelector('.toast[role=alert]');
      expect(toast?.textContent).toContain("L'enregistrement a échoué");
      expect(component.succes()).toBeNull();
    });

    it('422 sur des champs : message général visible en plus du détail sous les champs', async () => {
      await ouvrir();
      component.formulaire.patchValue({ observations: 'x' });
      component.enregistrer();
      http.expectOne((r) => r.method === 'PATCH').flush(
        { status: 'error', message: 'Erreur', errors: { observations: ['Trop long.'] } },
        { status: 422, statusText: 'Unprocessable Entity' },
      );
      expect(component.erreurGenerale()).toContain('certains champs sont refusés');
      expect(component.erreursChamps()['observations']).toBe('Trop long.');
    });
  });

  describe('arrivée sans patient (menu « Nouvelle consultation »)', () => {
    it('message clair et lien vers « Mes patients »', async () => {
      const el = creer({});
      http.expectOne((r) => r.url.endsWith('/cabinets/6/patients')).flush(PATIENTS);
      await fixture.whenStable();
      fixture.detectChanges();

      const message = el.querySelector('[data-testid=choisir-patient]');
      expect(message?.textContent).toContain('Choisissez un patient pour créer une consultation');
      expect(message?.querySelector('a')?.getAttribute('href')).toBe('/opticien/mes-patients');
    });

    it('le message disparaît une fois un patient choisi ou fourni dans l’URL', async () => {
      const el = creer({});
      http.expectOne((r) => r.url.endsWith('/cabinets/6/patients')).flush(PATIENTS);
      await fixture.whenStable();
      component.formulaire.controls.patientId.setValue('46');
      fixture.detectChanges();
      expect(el.querySelector('[data-testid=choisir-patient]')).toBeNull();
    });

    it('avec ?patientId= : pas de message', async () => {
      const el = await ouvrirCreation();
      expect(el.querySelector('[data-testid=choisir-patient]')).toBeNull();
    });
  });
});
