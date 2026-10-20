import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';

import { Connexion } from './connexion';

describe('Connexion', () => {
  let component: Connexion;
  let fixture: ComponentFixture<Connexion>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Connexion],
      providers: [provideRouter([]), provideHttpClient(), provideHttpClientTesting()],
    }).compileComponents();

    fixture = TestBed.createComponent(Connexion);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it("cabinet en attente de validation : le message du serveur (errors.telephone[0]) est affiché tel quel", () => {
    const http = TestBed.inject(HttpTestingController);
    component.form.setValue({ identifiant: '+237600000001', motDePasse: 'azerty-12', seSouvenir: false });

    component.onSubmit();
    http.expectOne((r) => r.url.endsWith('/auth/login')).flush(
      {
        status: 'error',
        message: 'Erreur de connexion',
        errors: { telephone: ['Votre cabinet est en attente de validation par un administrateur.'] },
      },
      { status: 401, statusText: 'Unauthorized' },
    );

    expect(component.erreur()).toBe('Votre cabinet est en attente de validation par un administrateur.');
  });

  it('« Se souvenir de moi » est décochée par défaut', () => {
    expect(component.form.getRawValue().seSouvenir).toBe(false);
    const case_ = (fixture.nativeElement as HTMLElement).querySelector('input[type=checkbox]') as HTMLInputElement;
    expect(case_.checked).toBe(false);
  });
});
