import { ComponentFixture, TestBed } from '@angular/core/testing';
import { registerLocaleData } from '@angular/common';
import { Router, provideRouter } from '@angular/router';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import localeFr from '@angular/common/locales/fr';

import { Auth } from '../../../core/services/auth';
import { MesPatients } from './mes-patients';

registerLocaleData(localeFr);

const PATIENTS = {
  status: 'success',
  message: '',
  data: {
    patients: [
      { id: 46, nom: 'Nkeng', prenom: 'Aline', telephone: '+237600000201', email: null, ville: 'Douala' },
      { id: 47, nom: 'Biyong', prenom: 'Marc', telephone: '+237600000202', email: null, ville: null },
    ],
  },
};

function consultation(id: number, patientId: number, date: string) {
  return {
    id, patient_id: patientId, cabinet_id: 6, opticien_id: 73, rdv_id: null, date_consultation: `${date}T00:00:00.000000Z`,
    motif: 'Controle', plaintes: null, ecart_pupillaire: null, prescription: null, observations: null,
    statut: 'en_cours', verrouillee: false, is_modifiable: true,
  };
}

describe('MesPatients', () => {
  let component: MesPatients;
  let fixture: ComponentFixture<MesPatients>;
  let http: HttpTestingController;

  function afficher(): HTMLElement {
    TestBed.configureTestingModule({
      imports: [MesPatients],
      providers: [provideRouter([]), provideHttpClient(), provideHttpClientTesting()],
    });
    const auth = TestBed.inject(Auth);
    auth.simulerConnexion('opticien');
    vi.spyOn(auth, 'utilisateur').mockReturnValue({ ...auth.utilisateur()!, cabinetId: '6' });
    http = TestBed.inject(HttpTestingController);
    fixture = TestBed.createComponent(MesPatients);
    component = fixture.componentInstance;
    fixture.detectChanges();
    return fixture.nativeElement as HTMLElement;
  }

  afterEach(() => {
    sessionStorage.clear();
    localStorage.clear();
    vi.restoreAllMocks();
  });

  it('liste les patients du cabinet (GET /cabinets/{id}/patients) avec compteur et dernière consultation réels', async () => {
    const el = afficher();
    http.expectOne((r) => r.url.endsWith('/cabinets/6/patients')).flush(PATIENTS);
    http.expectOne((r) => r.url.endsWith('/cabinets/6/consultations')).flush({
      status: 'success',
      message: '',
      data: { consultations: [consultation(1, 46, '2026-10-01'), consultation(2, 46, '2026-10-20')] },
    });
    await fixture.whenStable();
    fixture.detectChanges();

    const texte = el.textContent ?? '';
    expect(texte).toContain('Aline');
    expect(texte).toContain('Biyong');
    expect(component.patients().find((p) => p.id === '46')).toMatchObject({ nombreConsultations: 2, derniereConsultation: '2026-10-20' });
    expect(component.patients().find((p) => p.id === '47')).toMatchObject({ nombreConsultations: 0, derniereConsultation: null });
    expect(texte).toContain('20/10/2026');
    // données que l'API ne fournit pas : retirées, pas inventées
    expect(texte).not.toContain('ans');
    expect(texte).not.toContain('À suivre');
    expect(texte).toContain('Nouveau patient');
  });

  it('un échec de la liste des consultations ne bloque pas les patients', async () => {
    afficher();
    http.expectOne((r) => r.url.endsWith('/cabinets/6/patients')).flush(PATIENTS);
    http.expectOne((r) => r.url.endsWith('/cabinets/6/consultations')).flush('boom', { status: 500, statusText: 'Server Error' });

    expect(component.nombrePatients()).toBe(2);
    expect(component.erreur()).toBeNull();
  });

  it('état vide : « Aucun patient pour le moment »', async () => {
    const el = afficher();
    http.expectOne((r) => r.url.endsWith('/cabinets/6/patients')).flush({ status: 'success', message: '', data: { patients: [] } });
    http.expectOne((r) => r.url.endsWith('/cabinets/6/consultations')).flush({ status: 'success', message: '', data: { consultations: [] } });
    await fixture.whenStable();
    fixture.detectChanges();

    expect(el.textContent).toContain('Aucun patient pour le moment');
  });

  it('erreur : message du serveur ; 403 : « Accès refusé. »', () => {
    afficher();
    http.expectOne((r) => r.url.endsWith('/cabinets/6/patients')).flush({ status: 'error', message: 'Erreur interne' }, { status: 500, statusText: 'Server Error' });
    http.match((r) => r.url.endsWith('/consultations'));
    expect(component.erreur()).toContain('Le serveur répond : Erreur interne');
  });

  it('recherche par nom, téléphone ou ville', async () => {
    afficher();
    http.expectOne((r) => r.url.endsWith('/cabinets/6/patients')).flush(PATIENTS);
    http.expectOne((r) => r.url.endsWith('/cabinets/6/consultations')).flush({ status: 'success', message: '', data: { consultations: [] } });

    component.recherche.set('biyong');
    expect(component.patientsFiltres().map((p) => p.id)).toEqual(['47']);
    component.recherche.set('douala');
    expect(component.patientsFiltres().map((p) => p.id)).toEqual(['46']);
  });

  it('navigation : dossier et nouvelle consultation transmettent patientId', async () => {
    afficher();
    http.expectOne((r) => r.url.endsWith('/cabinets/6/patients')).flush(PATIENTS);
    http.expectOne((r) => r.url.endsWith('/cabinets/6/consultations')).flush({ status: 'success', message: '', data: { consultations: [] } });
    const naviguer = vi.spyOn(TestBed.inject(Router), 'navigate').mockResolvedValue(true);

    const aline = component.patients()[0];
    component.voirDossier(aline);
    component.nouvelleConsultation(aline);

    expect(naviguer).toHaveBeenCalledWith(['/opticien/dossier-visuel-patient'], { queryParams: { patientId: '46' } });
    expect(naviguer).toHaveBeenCalledWith(['/opticien/nouvelle-fiche-consultation'], { queryParams: { patientId: '46' } });
  });

  describe('Nouveau patient', () => {
    async function ouvrirFormulaire(): Promise<HTMLElement> {
      const el = afficher();
      http.expectOne((r) => r.url.endsWith('/cabinets/6/patients')).flush(PATIENTS);
      http.expectOne((r) => r.url.endsWith('/cabinets/6/consultations')).flush({ status: 'success', message: '', data: { consultations: [] } });
      component.ouvrirFormulaire();
      await fixture.whenStable();
      fixture.detectChanges();
      return el;
    }

    function remplir(extra: Record<string, string> = {}): void {
      component.formulairePatient.patchValue({ nom: 'Essomba', prenom: 'Mireille', telephone: '+237600000203', ville: 'Douala', ...extra });
    }

    it('le bouton ouvre le formulaire (champs obligatoires et facultatifs)', async () => {
      const el = await ouvrirFormulaire();
      const bouton = Array.from(el.querySelectorAll('button')).find((b) => b.textContent?.includes('Nouveau patient'));
      expect(bouton).toBeDefined();
      expect(el.querySelector('[role=dialog]')).not.toBeNull();
      expect(el.querySelectorAll('[role=dialog] input').length).toBe(7);
    });

    it('POST /cabinets/{id}/patients : champs renseignés seulement, la liste se met à jour', async () => {
      await ouvrirFormulaire();
      remplir();
      component.creerPatient();

      const req = http.expectOne((r) => r.method === 'POST' && r.url.endsWith('/cabinets/6/patients'));
      expect(req.request.body).toEqual({ nom: 'Essomba', prenom: 'Mireille', telephone: '+237600000203', ville: 'Douala' });
      req.flush(
        { status: 'success', message: '', data: { patient: { id: 51, nom: 'Essomba', prenom: 'Mireille', telephone: '+237600000203', email: null, ville: 'Douala' } } },
        { status: 201, statusText: 'Created' },
      );

      expect(component.nombrePatients()).toBe(3);
      expect(component.patients().at(-1)).toMatchObject({ id: '51', nombreConsultations: 0, derniereConsultation: null });
      expect(component.formulaireOuvert()).toBe(false);
    });

    it('téléphone saisi avec espaces : normalisé en +237 suivi de 9 chiffres', async () => {
      await ouvrirFormulaire();
      remplir({ telephone: '+237 600 000 203' });
      component.creerPatient();

      expect(http.expectOne((r) => r.method === 'POST').request.body.telephone).toBe('+237600000203');
    });

    it('format de téléphone invalide ou champs obligatoires manquants : aucun appel', async () => {
      await ouvrirFormulaire();
      remplir({ telephone: '600000203' });
      component.creerPatient();
      http.expectNone((r) => r.method === 'POST');

      remplir({ telephone: '+237600000203', nom: '' });
      component.creerPatient();
      http.expectNone((r) => r.method === 'POST');
    });

    it('422 (téléphone déjà utilisé) : message du serveur sous le champ téléphone', async () => {
      const el = await ouvrirFormulaire();
      remplir();
      component.creerPatient();
      http.expectOne((r) => r.method === 'POST').flush(
        { status: 'error', message: 'Erreur de validation', errors: { telephone: ['Ce numéro de téléphone est déjà utilisé.'] } },
        { status: 422, statusText: 'Unprocessable Entity' },
      );
      fixture.detectChanges();

      expect(el.querySelector('[data-champ=telephone]')?.textContent).toContain('déjà utilisé');
      expect(component.formulaireOuvert()).toBe(true);
      expect(component.nombrePatients()).toBe(2);
    });

    it('403 : « Accès refusé. » ; 500 : message du serveur', async () => {
      await ouvrirFormulaire();
      remplir();
      component.creerPatient();
      http.expectOne((r) => r.method === 'POST').flush({ status: 'error', message: 'Accès refusé' }, { status: 403, statusText: 'Forbidden' });
      expect(component.erreurFormulaire()).toBe('Accès refusé.');

      component.creerPatient();
      http.expectOne((r) => r.method === 'POST').flush({ status: 'error', message: 'Erreur interne' }, { status: 500, statusText: 'Server Error' });
      expect(component.erreurFormulaire()).toContain('Le serveur répond : Erreur interne');
    });
  });
});
