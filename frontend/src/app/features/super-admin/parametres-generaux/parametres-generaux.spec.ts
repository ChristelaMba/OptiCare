import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';

import { ParametresGeneraux } from './parametres-generaux';

/** `SuperAdminDemo` applique un `delay()` de 250 ms : on attend un peu plus. */
const LATENCE_DEMO_MS = 320;

describe('ParametresGeneraux', () => {
  let component: ParametresGeneraux;
  let fixture: ComponentFixture<ParametresGeneraux>;

  async function afficher(): Promise<HTMLElement> {
    TestBed.configureTestingModule({
      imports: [ParametresGeneraux],
      providers: [provideRouter([])],
    });
    fixture = TestBed.createComponent(ParametresGeneraux);
    component = fixture.componentInstance;
    fixture.detectChanges();
    await new Promise((r) => setTimeout(r, LATENCE_DEMO_MS));
    fixture.detectChanges();
    return fixture.nativeElement as HTMLElement;
  }

  it('should create', async () => {
    await afficher();
    expect(component).toBeTruthy();
  });

  it('affiche les 4 onglets attendus', async () => {
    const el = await afficher();
    const onglets = Array.from(el.querySelectorAll('[role=tab]')).map((b) => b.textContent?.replace(/\s+/g, ' ').trim());
    expect(onglets).toEqual(['tune Général', 'shield Sécurité', 'mail Modèles de messages', 'build Maintenance']);
  });

  it('onglet Général : nom de plateforme, e-mail support et devise FCFA', async () => {
    const el = await afficher();
    const bloc = el.querySelector('[data-onglet=general]') as HTMLElement;
    expect(bloc).toBeTruthy();

    const nom = bloc.querySelector('#nom-plateforme') as HTMLInputElement;
    const email = bloc.querySelector('#email-support') as HTMLInputElement;
    const devise = bloc.querySelector('#devise') as HTMLSelectElement;
    expect(nom.value).toBe('OptiCare');
    expect(email.value).toContain('@');
    expect(devise.value).toBe('FCFA');
  });

  it('changer d’onglet affiche le formulaire correspondant', async () => {
    const el = await afficher();

    component.changerOnglet('securite');
    fixture.detectChanges();
    expect(el.querySelector('[data-onglet=securite]')).toBeTruthy();
    expect(el.querySelector('[data-onglet=general]')).toBeNull();
    expect(el.querySelector('#delai-session')).toBeTruthy();

    component.changerOnglet('maintenance');
    fixture.detectChanges();
    expect(el.querySelector('[data-onglet=maintenance]')).toBeTruthy();
    expect(el.querySelector('#message-maintenance')).toBeTruthy();
  });

  it('onglet Modèles de messages : chaque modèle est éditable (objet + corps)', async () => {
    const el = await afficher();
    component.changerOnglet('messages');
    fixture.detectChanges();

    const bloc = el.querySelector('[data-onglet=messages]') as HTMLElement;
    expect(bloc).toBeTruthy();
    expect(component.modeles().length).toBeGreaterThan(0);
    expect(bloc.querySelectorAll('textarea').length).toBe(component.modeles().length);
  });

  it('enregistrer : confirmation locale explicite (aucune route serveur)', async () => {
    const el = await afficher();
    expect(el.textContent).toContain('Données de démonstration');

    component.enregistrer();
    fixture.detectChanges();
    expect(component.succes()).toContain('localement');
    expect(el.textContent).toContain('localement');
  });
});
