import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';

import { PatientLayout } from './patient-layout';
import { Auth } from '../../../core/services/auth';

describe('PatientLayout', () => {
  let component: PatientLayout;
  let fixture: ComponentFixture<PatientLayout>;

  beforeEach(async () => {
    sessionStorage.clear();
    localStorage.clear();

    await TestBed.configureTestingModule({
      imports: [PatientLayout],
      providers: [provideRouter([]), provideHttpClient(), provideHttpClientTesting()],
    }).compileComponents();

    TestBed.inject(Auth).simulerConnexion('patient');

    fixture = TestBed.createComponent(PatientLayout);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  afterEach(() => {
    sessionStorage.clear();
    localStorage.clear();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('affiche le nom et les initiales de la session, jamais un nom codé en dur', () => {
    const html: string = fixture.nativeElement.textContent;

    expect(component.nomComplet()).toBe('Patient Test');
    expect(component.initiales()).toBe('PT');
    expect(html).toContain('Patient Test');
    expect(html).not.toContain('Jean Dupont');
  });

  it('n\'affiche aucun faux compteur de notifications', () => {
    const el: HTMLElement = fixture.nativeElement;

    expect(el.querySelector('.notification-badge')).toBeNull();
    expect(el.querySelector('.sidebar-notification-badge')).toBeNull();
    expect(el.querySelector('.mobile-notification span')).toBeNull();
  });

  it('« Mon profil » et « Paramètres » sont désactivés avec la mention « Bientôt », sans lien mort', () => {
    const el = fixture.nativeElement as HTMLElement;
    const desactives = el.querySelectorAll('.nav-link-disabled');

    expect(desactives.length).toBe(2);
    desactives.forEach((entree) => {
      expect(entree.getAttribute('aria-disabled')).toBe('true');
      expect(entree.textContent).toContain('Bientôt');
    });
    expect(el.querySelector('a[href="/patient/profil"]')).toBeNull();
    expect(el.querySelector('a[href="/patient/parametres"]')).toBeNull();
  });

  it("l'avatar du header ouvre un menu avec « Se déconnecter » (fermé par défaut)", async () => {
    const el = fixture.nativeElement as HTMLElement;

    expect(el.querySelector('.profile-dropdown')).toBeNull();

    (el.querySelector('button.topbar-profile') as HTMLButtonElement).click();
    fixture.detectChanges();

    const menu = el.querySelector('.profile-dropdown') as HTMLElement;
    expect(menu).not.toBeNull();
    expect(menu.textContent).toContain('Patient Test');
    expect(menu.querySelector('app-bouton-deconnexion')).not.toBeNull();
  });

  it('la barre latérale propose aussi « Se déconnecter »', () => {
    const el = fixture.nativeElement as HTMLElement;

    expect(el.querySelector('.sidebar-logout app-bouton-deconnexion')).not.toBeNull();
  });
});
