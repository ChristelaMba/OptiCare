import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { NEVER } from 'rxjs';

import { Auth } from '../../../core/services/auth';

import { InscriptionPatient } from './inscription-patient';

describe('InscriptionPatient', () => {
  let component: InscriptionPatient;
  let fixture: ComponentFixture<InscriptionPatient>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [InscriptionPatient],
      providers: [provideRouter([]), provideHttpClient(), provideHttpClientTesting()],
    }).compileComponents();

    fixture = TestBed.createComponent(InscriptionPatient);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  function remplir(dateNaissance: string, email = 'pat@example.com'): void {
    component.form.setValue({
      prenom: 'Pat',
      nom: 'TEST-DIAG',
      telephone: '+237600000000',
      ville: 'Douala',
      email,
      dateNaissance,
      motDePasse: 'azerty-12',
      confirmationMotDePasse: 'azerty-12',
    });
  }

  it('la date de naissance est facultative : formulaire valide sans elle', () => {
    remplir('');

    expect(component.form.valid).toBe(true);
    expect(component.form.get('dateNaissance')?.hasError('required')).toBe(false);
  });

  it('une date renseignée mais dans le futur reste refusée', () => {
    remplir('2999-01-01');

    expect(component.form.valid).toBe(false);
    expect(component.form.get('dateNaissance')?.hasError('dateNaissanceFuture')).toBe(true);
  });

  it("date_naissance n'est envoyée au serveur que si elle est renseignée", () => {
    const registerPatient = vi.spyOn(TestBed.inject(Auth), 'registerPatient').mockReturnValue(NEVER);

    remplir('');
    component.onSubmit();
    expect(Object.keys(registerPatient.mock.calls[0][0])).not.toContain('date_naissance');

    component.chargement.set(false);
    remplir('1990-05-17');
    component.onSubmit();
    expect(registerPatient.mock.calls[1][0].date_naissance).toBe('1990-05-17');
  });

  it("l'email est facultatif : formulaire valide sans email", () => {
    remplir('', '');

    expect(component.form.valid).toBe(true);
    expect(component.form.get('email')?.hasError('required')).toBe(false);
  });

  it("un email saisi garde la validation du format", () => {
    remplir('', 'pas-un-email');

    expect(component.form.valid).toBe(false);
    expect(component.form.get('email')?.hasError('email')).toBe(true);

    remplir('', 'ok@example.com');
    expect(component.form.valid).toBe(true);
  });

  it("l'email n'est envoyé au serveur que s'il est renseigné", () => {
    const registerPatient = vi.spyOn(TestBed.inject(Auth), 'registerPatient').mockReturnValue(NEVER);

    remplir('', '');
    component.onSubmit();
    expect(Object.keys(registerPatient.mock.calls[0][0])).not.toContain('email');

    component.chargement.set(false);
    remplir('', 'ok@example.com');
    component.onSubmit();
    expect(registerPatient.mock.calls[1][0].email).toBe('ok@example.com');
  });

  it("le libellé indique que l'email est facultatif", () => {
    expect((fixture.nativeElement as HTMLElement).querySelector('label[for="email"]')?.textContent).toContain('facultatif');
  });
});
