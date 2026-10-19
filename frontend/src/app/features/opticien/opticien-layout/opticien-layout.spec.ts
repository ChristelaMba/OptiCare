import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';

import { OpticienLayout } from './opticien-layout';
import { Auth } from '../../../core/services/auth';

describe('OpticienLayout', () => {
  let component: OpticienLayout;
  let fixture: ComponentFixture<OpticienLayout>;

  beforeEach(async () => {
    sessionStorage.clear();
    localStorage.clear();

    await TestBed.configureTestingModule({
      imports: [OpticienLayout],
      providers: [provideRouter([]), provideHttpClient(), provideHttpClientTesting()],
    }).compileComponents();

    TestBed.inject(Auth).simulerConnexion('opticien');

    fixture = TestBed.createComponent(OpticienLayout);
    component = fixture.componentInstance;
    fixture.detectChanges();
    await fixture.whenStable();
  });

  afterEach(() => {
    sessionStorage.clear();
    localStorage.clear();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it("affiche l'identité de la session (nom, initiales, rôle), jamais un nom écrit en dur", () => {
    const texte = (fixture.nativeElement as HTMLElement).textContent ?? '';

    expect(component.nomComplet()).toBe('Opticien Test');
    expect(component.initiales()).toBe('OT');
    expect(component.roleLibelle()).toBe('Opticien');
    expect(texte).toContain('Opticien Test');
    expect(texte).not.toContain('Jean Dupont');
    expect(texte).not.toContain('Marie Dupont');
  });

  it("aucune notification inventée : pas de compteur, panneau vide « Aucune notification pour le moment »", () => {
    const el = fixture.nativeElement as HTMLElement;

    expect(el.querySelector('.notification-badge')).toBeNull();
    expect(el.textContent).not.toContain('Commande prête');
    expect(el.textContent).not.toContain('Paul Ndi');

    (el.querySelector('.notification-button') as HTMLButtonElement).click();
    fixture.detectChanges();

    expect(el.querySelector('.notification-panel')?.textContent).toContain('Aucune notification pour le moment.');
    expect(el.querySelectorAll('.notification-item').length).toBe(0);
  });

  it('mode clair uniquement : pas de bouton de bascule clair/sombre', () => {
    const el = fixture.nativeElement as HTMLElement;

    expect(el.querySelector('[aria-label="Changer le thème"]')).toBeNull();
    expect(document.documentElement.getAttribute('data-theme')).toBe('light');
  });
});
