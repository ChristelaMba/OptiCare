import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';

import { Auth } from '../../../core/services/auth';
import { EnregistrementPatient } from './enregistrement-patient';

describe('EnregistrementPatient', () => {
  let component: EnregistrementPatient;
  let fixture: ComponentFixture<EnregistrementPatient>;
  let http: HttpTestingController;

  async function afficher(): Promise<HTMLElement> {
    await TestBed.configureTestingModule({
      imports: [EnregistrementPatient],
      providers: [provideRouter([]), provideHttpClient(), provideHttpClientTesting()],
    }).compileComponents();
    const auth = TestBed.inject(Auth);
    auth.simulerConnexion('secretaire');
    vi.spyOn(auth, 'utilisateur').mockReturnValue({ ...auth.utilisateur()!, cabinetId: '6' });
    http = TestBed.inject(HttpTestingController);
    fixture = TestBed.createComponent(EnregistrementPatient);
    component = fixture.componentInstance;
    fixture.detectChanges();
    await fixture.whenStable();
    return fixture.nativeElement as HTMLElement;
  }

  function remplir(extra: Record<string, string> = {}): void {
    component.patientForm.patchValue({ nom: 'Essomba', prenom: 'Mireille', telephone: '+237600000203', ...extra });
  }

  afterEach(() => {
    sessionStorage.clear();
    localStorage.clear();
    vi.restoreAllMocks();
  });

  it('should create', async () => {
    await afficher();
    expect(component).toBeTruthy();
  });

  it('champs de l’API seulement : sexe, profession, quartier, WhatsApp et nombre d’enfants ont disparu', async () => {
    const el = await afficher();
    const champs = Array.from(el.querySelectorAll('form input')).map((i) => i.getAttribute('formcontrolname'));

    expect(champs).toEqual(['nom', 'prenom', 'telephone', 'email', 'ville', 'dateNaissance', 'adresse']);
    expect(el.textContent).not.toMatch(/Sexe|Profession|Quartier|WhatsApp|enfants/i);
  });

  it('POST /cabinets/{id}/patients : champs renseignés seulement, message de confirmation et formulaire vidé', async () => {
    const el = await afficher();
    remplir({ ville: 'Douala', email: '' });

    component.submit();
    const req = http.expectOne((r) => r.method === 'POST' && r.url.endsWith('/cabinets/6/patients'));
    expect(req.request.body).toEqual({ nom: 'Essomba', prenom: 'Mireille', telephone: '+237600000203', ville: 'Douala' });
    req.flush(
      { status: 'success', message: '', data: { patient: { id: 51, nom: 'Essomba', prenom: 'Mireille', telephone: '+237600000203', email: null, ville: 'Douala' } } },
      { status: 201, statusText: 'Created' },
    );
    fixture.detectChanges();

    expect(component.successMessage()).toContain('Mireille Essomba');
    expect(el.querySelector('.alert.success')?.textContent).toContain('Patient enregistré');
    expect(component.patientForm.getRawValue()).toEqual({ nom: '', prenom: '', telephone: '', email: '', ville: '', dateNaissance: '', adresse: '' });
    expect(component.isSubmitting()).toBe(false);
  });

  it('téléphone : +237 suivi de 9 chiffres, espaces retirés ; autre format refusé sans appel', async () => {
    await afficher();

    remplir({ telephone: '600000203' });
    component.submit();
    http.expectNone((r) => r.method === 'POST');
    expect(component.f.telephone.invalid).toBe(true);

    remplir({ telephone: '+237 600 000 203' });
    component.submit();
    expect(http.expectOne((r) => r.method === 'POST').request.body.telephone).toBe('+237600000203');
  });

  it('obligatoires : nom, prénom, téléphone ; e-mail invalide refusé', async () => {
    await afficher();
    component.submit();
    http.expectNone((r) => r.method === 'POST');
    expect(component.errorMessage()).toContain('informations obligatoires');

    remplir({ email: 'pas-un-email' });
    component.submit();
    http.expectNone((r) => r.method === 'POST');
    expect(component.f.email.invalid).toBe(true);
  });

  it('422 (téléphone déjà utilisé) : message du serveur sous le champ, rien n’est vidé', async () => {
    const el = await afficher();
    remplir();
    component.submit();
    http.expectOne((r) => r.method === 'POST').flush(
      { status: 'error', message: 'Erreur de validation', errors: { telephone: ['Ce numéro de téléphone est déjà utilisé.'] } },
      { status: 422, statusText: 'Unprocessable Entity' },
    );
    fixture.detectChanges();

    expect(el.querySelector('[data-champ=telephone]')?.textContent).toContain('déjà utilisé');
    expect(component.successMessage()).toBe('');
    expect(component.patientForm.getRawValue().nom).toBe('Essomba');
    expect(component.isSubmitting()).toBe(false);
  });

  it('403 : « Accès refusé. » ; 500 : message du serveur', async () => {
    await afficher();
    remplir();
    component.submit();
    http.expectOne((r) => r.method === 'POST').flush({ status: 'error', message: 'Accès refusé' }, { status: 403, statusText: 'Forbidden' });
    expect(component.errorMessage()).toBe('Accès refusé.');

    component.submit();
    http.expectOne((r) => r.method === 'POST').flush({ status: 'error', message: 'Erreur interne' }, { status: 500, statusText: 'Server Error' });
    expect(component.errorMessage()).toContain('Le serveur répond : Erreur interne');
  });
});
