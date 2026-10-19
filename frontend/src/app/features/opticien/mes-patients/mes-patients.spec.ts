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
    expect(texte).not.toContain('Nouveau patient');
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
});
