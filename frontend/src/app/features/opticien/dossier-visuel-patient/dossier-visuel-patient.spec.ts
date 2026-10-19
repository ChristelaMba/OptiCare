import { ComponentFixture, TestBed } from '@angular/core/testing';
import { registerLocaleData } from '@angular/common';
import { ActivatedRoute, Router, convertToParamMap, provideRouter } from '@angular/router';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import localeFr from '@angular/common/locales/fr';

import { Auth } from '../../../core/services/auth';
import { DossierVisuelPatient } from './dossier-visuel-patient';

registerLocaleData(localeFr);

const PATIENTS = {
  status: 'success',
  message: '',
  data: { patients: [{ id: 47, nom: 'Biyong', prenom: 'Marc', telephone: '+237600000202', email: null, ville: 'Douala' }] },
};

function consultation(id: number, date: string, extra: Record<string, unknown> = {}) {
  return {
    id, patient_id: 47, cabinet_id: 6, opticien_id: 73, rdv_id: null, date_consultation: `${date}T00:00:00.000000Z`,
    motif: 'Controle', plaintes: null, ecart_pupillaire: null, prescription: null, observations: null,
    statut: 'en_cours', verrouillee: false, is_modifiable: true, opticien: { id: 73, nom: 'Tchinda', prenom: 'Herve' },
    ...extra,
  };
}

describe('DossierVisuelPatient', () => {
  let component: DossierVisuelPatient;
  let fixture: ComponentFixture<DossierVisuelPatient>;
  let http: HttpTestingController;

  function afficher(params: Record<string, string> = { patientId: '47' }): HTMLElement {
    TestBed.configureTestingModule({
      imports: [DossierVisuelPatient],
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
    fixture = TestBed.createComponent(DossierVisuelPatient);
    component = fixture.componentInstance;
    fixture.detectChanges();
    return fixture.nativeElement as HTMLElement;
  }

  function repondre(consultations: unknown[]): void {
    http.expectOne((r) => r.url.endsWith('/cabinets/6/patients')).flush(PATIENTS);
    http.expectOne((r) => r.url.endsWith('/patients/47/consultations')).flush({ status: 'success', message: '', data: { consultations } });
  }

  afterEach(() => {
    sessionStorage.clear();
    localStorage.clear();
    vi.restoreAllMocks();
  });

  it('identité réelle (téléphone, ville) et historique triés du plus récent au plus ancien', async () => {
    const el = afficher();
    repondre([
      consultation(1, '2026-09-01', { statut: 'terminee', verrouillee: true, is_modifiable: false }),
      consultation(2, '2026-10-20'),
    ]);
    await fixture.whenStable();
    fixture.detectChanges();

    const texte = el.textContent ?? '';
    expect(texte).toContain('Marc');
    expect(texte).toContain('+237600000202');
    expect(texte).toContain('Douala');
    expect(texte).toContain('Herve Tchinda');
    expect(texte).toContain('En cours');
    expect(texte).toContain('Terminée');
    expect(component.fiches().map((f) => f.id)).toEqual(['2', '1']);
    expect(texte).not.toContain('Âge');
    expect(texte).not.toContain('Quartier');
  });

  it('état vide : aucune consultation', async () => {
    const el = afficher();
    repondre([]);
    await fixture.whenStable();
    fixture.detectChanges();

    expect(el.textContent).toContain('Ce patient ne possède encore aucune fiche de consultation');
  });

  it('ouvrir une fiche : fiche de consultation avec consultationId ; nouvelle fiche avec patientId', async () => {
    afficher();
    repondre([consultation(2, '2026-10-20')]);
    const naviguer = vi.spyOn(TestBed.inject(Router), 'navigate').mockResolvedValue(true);

    component.ouvrirFiche(component.fiches()[0]);
    component.nouvelleFiche();

    expect(naviguer).toHaveBeenCalledWith(['/opticien/nouvelle-fiche-consultation'], { queryParams: { consultationId: '2' } });
    expect(naviguer).toHaveBeenCalledWith(['/opticien/nouvelle-fiche-consultation'], { queryParams: { patientId: '47' } });
  });

  it('patient d’un autre cabinet : message explicite', async () => {
    afficher({ patientId: '99' });
    http.expectOne((r) => r.url.endsWith('/cabinets/6/patients')).flush(PATIENTS);
    http.expectOne((r) => r.url.endsWith('/patients/99/consultations')).flush({ status: 'success', message: '', data: { consultations: [] } });
    expect(component.errorMessage()).toContain("n'appartient pas à votre cabinet");
  });

  it('erreur 403 : « Accès refusé. » ; sans patientId : message', () => {
    afficher();
    http.expectOne((r) => r.url.endsWith('/cabinets/6/patients')).flush(PATIENTS);
    http.expectOne((r) => r.url.endsWith('/patients/47/consultations')).flush({ status: 'error', message: 'Accès refusé' }, { status: 403, statusText: 'Forbidden' });
    expect(component.errorMessage()).toBe('Accès refusé.');
  });

  it('sans patientId dans l’URL : identifiant introuvable', () => {
    afficher({});
    expect(component.errorMessage()).toContain('Identifiant du patient introuvable');
  });
});
