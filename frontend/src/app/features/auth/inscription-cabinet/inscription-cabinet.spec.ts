import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { NEVER } from 'rxjs';

import { Auth } from '../../../core/services/auth';

import { InscriptionCabinet } from './inscription-cabinet';

describe('InscriptionCabinet', () => {
  let component: InscriptionCabinet;
  let fixture: ComponentFixture<InscriptionCabinet>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [InscriptionCabinet],
      providers: [provideRouter([]), provideHttpClient(), provideHttpClientTesting()],
    }).compileComponents();

    fixture = TestBed.createComponent(InscriptionCabinet);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  function remplir(email: string, cabinetEmail = 'contact@cabinet-test.example'): void {
    component.form.setValue({
      prenom: 'Proprio',
      nom: 'TEST-DIAG',
      telephone: '+237600000001',
      ville: 'Douala',
      email,
      motDePasse: 'azerty-12',
      confirmationMotDePasse: 'azerty-12',
      cabinetNom: 'Cabinet TEST-DIAG',
      cabinetAdresse: 'Rue TEST',
      cabinetTelephone: '+237600000002',
      cabinetVille: 'Douala',
      cabinetEmail,
    });
  }

  it("l'email du compte propriétaire est facultatif : formulaire valide sans lui", () => {
    remplir('');

    expect(component.form.valid).toBe(true);
    expect(component.form.get('email')?.hasError('required')).toBe(false);
  });

  it("s'il est saisi, le format de l'email du compte est validé", () => {
    remplir('pas-un-email');

    expect(component.form.valid).toBe(false);
    expect(component.form.get('email')?.hasError('email')).toBe(true);

    remplir('proprio@example.com');
    expect(component.form.valid).toBe(true);
  });

  it("la requête ne contient pas le champ email quand il est vide, et le contient quand il est saisi", () => {
    const registerCabinet = vi.spyOn(TestBed.inject(Auth), 'registerCabinet').mockReturnValue(NEVER);

    remplir('');
    component.onSubmit();
    const sansEmail = registerCabinet.mock.calls[0][0];
    expect(Object.keys(sansEmail)).not.toContain('email');
    expect(sansEmail.cabinet_email).toBe('contact@cabinet-test.example');

    component.chargement.set(false);
    remplir('proprio@example.com');
    component.onSubmit();
    expect(registerCabinet.mock.calls[1][0].email).toBe('proprio@example.com');
  });

  it('cabinet_email reste obligatoire (et son format est validé)', () => {
    remplir('', '');

    expect(component.form.valid).toBe(false);
    expect(component.form.get('cabinetEmail')?.hasError('required')).toBe(true);

    remplir('', 'pas-un-email');
    expect(component.form.get('cabinetEmail')?.hasError('email')).toBe(true);

    remplir('', 'contact@cabinet-test.example');
    expect(component.form.valid).toBe(true);
  });

  it("les deux emails sont clairement distingués dans le formulaire", () => {
    const el = fixture.nativeElement as HTMLElement;
    const compte = el.querySelector('label[for="email"]')?.textContent ?? '';
    const cabinet = el.querySelector('label[for="cabinetEmail"]')?.textContent ?? '';

    expect(compte).toContain('Email du compte');
    expect(compte).toContain('facultatif');
    expect(cabinet).toContain('Email public du cabinet');
    expect(cabinet).not.toContain('facultatif');
    expect(cabinet).toContain('*');
  });
});
