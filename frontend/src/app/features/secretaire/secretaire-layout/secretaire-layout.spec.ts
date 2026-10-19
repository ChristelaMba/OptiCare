import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';

import { SecretaireLayout } from './secretaire-layout';
import { Auth } from '../../../core/services/auth';

describe('SecretaireLayout', () => {
  let component: SecretaireLayout;
  let fixture: ComponentFixture<SecretaireLayout>;

  beforeEach(async () => {
    sessionStorage.clear();
    localStorage.clear();

    await TestBed.configureTestingModule({
      imports: [SecretaireLayout],
      providers: [provideRouter([]), provideHttpClient(), provideHttpClientTesting()],
    }).compileComponents();

    TestBed.inject(Auth).simulerConnexion('secretaire');

    fixture = TestBed.createComponent(SecretaireLayout);
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

    expect(component.nomComplet()).toBe('Secrétaire Test');
    expect(component.initiales()).toBe('ST');
    expect(component.roleLibelle()).toBe('Secrétaire');
    expect(texte).toContain('Secrétaire Test');
    expect(texte).not.toContain('Jean Dupont');
    expect(texte).not.toContain('Marie Dupont');
  });

  it('aucun faux compteur de notifications : la cloche inerte est masquée', () => {
    const el = fixture.nativeElement as HTMLElement;

    expect(el.querySelector('.notification-badge')).toBeNull();
    expect(el.querySelector('.notification-button')).toBeNull();
  });

  it('mode clair uniquement : pas de bouton de bascule clair/sombre', () => {
    const el = fixture.nativeElement as HTMLElement;

    expect(el.querySelector('.theme-button')).toBeNull();
    expect(el.querySelector('.dark-mode')).toBeNull();
  });
});
