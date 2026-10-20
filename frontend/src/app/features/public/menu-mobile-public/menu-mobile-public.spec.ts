import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';

import { Auth } from '../../../core/services/auth';
import { MenuMobilePublic } from './menu-mobile-public';

describe('MenuMobilePublic', () => {
  let fixture: ComponentFixture<MenuMobilePublic>;
  let el: HTMLElement;

  function creer(connecte = false): void {
    sessionStorage.clear();
    localStorage.clear();
    TestBed.configureTestingModule({
      imports: [MenuMobilePublic],
      providers: [provideRouter([{ path: '**', children: [] }]), provideHttpClient(), provideHttpClientTesting()],
    });
    if (connecte) {
      TestBed.inject(Auth).simulerConnexion('patient');
    }
    fixture = TestBed.createComponent(MenuMobilePublic);
    fixture.detectChanges();
    el = fixture.nativeElement as HTMLElement;
  }

  afterEach(() => {
    sessionStorage.clear();
    localStorage.clear();
  });

  it('fermé par défaut : un seul bouton « Ouvrir le menu », aucun lien', () => {
    creer();

    expect(el.querySelector('button')?.getAttribute('aria-label')).toBe('Ouvrir le menu');
    expect(el.querySelector('button')?.getAttribute('aria-expanded')).toBe('false');
    expect(el.querySelector('a')).toBeNull();
  });

  it('visiteur : le menu ouvert propose Connexion et Inscription', () => {
    creer();
    (el.querySelector('button') as HTMLButtonElement).click();
    fixture.detectChanges();

    const liens = Array.from(el.querySelectorAll('a')).map((a) => [a.textContent?.trim(), a.getAttribute('href')]);
    expect(liens).toEqual([
      ['Connexion', '/auth/connexion'],
      ['Inscription', '/auth/inscription'],
    ]);
    expect(el.querySelector('button')?.getAttribute('aria-label')).toBe('Fermer le menu');
  });

  it('utilisateur connecté : lien vers son espace et déconnexion', () => {
    creer(true);
    (el.querySelector('button') as HTMLButtonElement).click();
    fixture.detectChanges();

    expect(el.textContent).toContain('Mon espace');
    expect(el.textContent).toContain('Se déconnecter');
    expect(el.textContent).not.toContain('Inscription');
  });

  it('Échap et clic sur un lien ferment le menu ; visible seulement sous md (classe md:hidden)', () => {
    creer();
    expect(el.classList.contains('md:hidden')).toBe(true);

    (el.querySelector('button') as HTMLButtonElement).click();
    fixture.detectChanges();
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
    fixture.detectChanges();
    expect(el.querySelector('a')).toBeNull();

    (el.querySelector('button') as HTMLButtonElement).click();
    fixture.detectChanges();
    (el.querySelector('a') as HTMLAnchorElement).click();
    fixture.detectChanges();
    expect(el.querySelector('a')).toBeNull();
  });
});
