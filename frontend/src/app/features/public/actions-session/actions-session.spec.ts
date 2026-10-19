import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';

import { ActionsSession } from './actions-session';
import { Auth } from '../../../core/services/auth';

describe('ActionsSession', () => {
  let fixture: ComponentFixture<ActionsSession>;

  beforeEach(async () => {
    sessionStorage.clear();
    localStorage.clear();

    await TestBed.configureTestingModule({
      imports: [ActionsSession],
      providers: [provideRouter([]), provideHttpClient(), provideHttpClientTesting()],
    }).compileComponents();
  });

  afterEach(() => {
    sessionStorage.clear();
    localStorage.clear();
  });

  function creer(role?: 'patient' | 'proprietaire'): HTMLElement {
    if (role) {
      TestBed.inject(Auth).simulerConnexion(role);
    }
    fixture = TestBed.createComponent(ActionsSession);
    fixture.detectChanges();
    return fixture.nativeElement as HTMLElement;
  }

  it('visiteur : Connexion et Inscription', () => {
    const el = creer();

    expect(el.textContent).toContain('Connexion');
    expect(el.textContent).toContain('Inscription');
    expect(el.querySelector('a[href="/auth/connexion"]')).not.toBeNull();
  });

  it('patient connecté : son nom et un lien vers /patient, plus de Connexion / Inscription', () => {
    const el = creer('patient');

    expect(el.textContent).toContain('Patient Test');
    expect(el.textContent).not.toContain('Connexion');
    expect(el.textContent).not.toContain('Inscription');
    expect(el.querySelector('a')?.getAttribute('href')).toBe('/patient');
  });

  it('propriétaire connecté : lien vers /proprietaire', () => {
    const el = creer('proprietaire');

    expect(el.querySelector('a')?.getAttribute('href')).toBe('/proprietaire');
  });

  it("connecté : un bouton « Se déconnecter » est proposé dans l'en-tête public", () => {
    const el = creer('patient');

    expect(el.querySelector('app-bouton-deconnexion')).not.toBeNull();
    expect(el.textContent).toContain('Se déconnecter');
  });

  it('visiteur : pas de bouton « Se déconnecter »', () => {
    const el = creer();

    expect(el.querySelector('app-bouton-deconnexion')).toBeNull();
  });

  it('en-tête mobile : « Se déconnecter » ne passe pas à la ligne et a un libellé accessible', () => {
    const el = creer('patient');
    const bouton = el.querySelector('app-bouton-deconnexion button') as HTMLButtonElement;

    expect(bouton.className).toContain('whitespace-nowrap');
    expect(bouton.getAttribute('aria-label')).toBe('Se déconnecter');
    expect(el.querySelector('app-bouton-deconnexion .material-symbols-outlined')?.textContent).toContain('logout');
  });
});
