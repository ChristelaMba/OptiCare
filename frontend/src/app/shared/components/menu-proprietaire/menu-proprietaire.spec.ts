import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter, Routes } from '@angular/router';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';

import { MenuProprietaire } from './menu-proprietaire';
import { Auth } from '../../../core/services/auth';

/** Routes vides correspondant aux liens du menu : évite les erreurs de navigation dans le test. */
const ROUTES_TEST: Routes = [
  { path: 'proprietaire/dashboard-comptable', children: [] },
  { path: 'proprietaire/historique-rdv', children: [] },
  { path: 'proprietaire/patients', children: [] },
  { path: 'proprietaire/factures', children: [] },
  { path: 'proprietaire/gestion-employes', children: [] },
  { path: 'proprietaire/vitrine-edition', children: [] },
];

/**
 * Le menu partagé de l'espace propriétaire doit se comporter comme un vrai drawer sur téléphone :
 * fermé au départ, ouvert par le hamburger, fermé par le voile sombre, par la touche Échap et
 * par un clic sur n'importe quel lien de navigation.
 */
describe('MenuProprietaire', () => {
  let component: MenuProprietaire;
  let fixture: ComponentFixture<MenuProprietaire>;
  let el: HTMLElement;

  beforeEach(async () => {
    sessionStorage.clear();
    localStorage.clear();

    await TestBed.configureTestingModule({
      imports: [MenuProprietaire],
      providers: [provideRouter(ROUTES_TEST), provideHttpClient(), provideHttpClientTesting()],
    }).compileComponents();

    TestBed.inject(Auth).simulerConnexion('proprietaire');

    fixture = TestBed.createComponent(MenuProprietaire);
    component = fixture.componentInstance;
    el = fixture.nativeElement as HTMLElement;
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

  it('affiche les 6 entrées de navigation de l’espace propriétaire', () => {
    const liens = Array.from(el.querySelectorAll('aside a')).map((a) =>
      Array.from(a.querySelectorAll('span')).map((s) => (s.textContent ?? '').trim()),
    );

    expect(liens).toEqual([
      ['dashboard', 'Dashboard'],
      ['calendar_today', 'Rendez-vous'],
      ['groups', 'Patients'],
      ['receipt_long', 'Factures'],
      ['badge', 'Employés'],
      ['storefront', 'Ma vitrine'],
    ]);

    const hrefs = Array.from(el.querySelectorAll('aside a')).map((a) => a.getAttribute('href'));
    expect(hrefs).toEqual([
      '/proprietaire/dashboard-comptable',
      '/proprietaire/historique-rdv',
      '/proprietaire/patients',
      '/proprietaire/factures',
      '/proprietaire/gestion-employes',
      '/proprietaire/vitrine-edition',
    ]);
  });

  it('la déconnexion est présente dans le menu', () => {
    const bouton = el.querySelector('aside app-bouton-deconnexion');

    expect(bouton?.textContent).toContain('Se déconnecter');
  });

  it('affiche l’identité de la session (initiales, nom complet), jamais un nom écrit en dur', () => {
    const texte = (el.textContent ?? '');

    expect(component.initiales()).toBe('PT');
    expect(component.nomComplet()).toBe('Propriétaire Test');
    expect(texte).toContain('Propriétaire Test');
    expect(texte).not.toContain('Jean Dupont');
  });

  it('sans nom de cabinet connu, affiche le libellé de repli « Clinic Management »', () => {
    expect(component.cabinetNom()).toBe('');
    const aside = el.querySelector('aside') as HTMLElement;
    expect(aside.textContent).toContain('Clinic Management');
  });

  it('l’en-tête mobile réserve le nom du cabinet aux écrans larges (pas d’entassement avec le logo)', () => {
    const header = el.querySelector('header') as HTMLElement;
    // Le logo et le hamburger sont bien présents dans l'en-tête…
    expect(header.querySelector('button.menu-proprietaire-hamburger')).toBeTruthy();
    expect(header.querySelector('app-logo-opticare')).toBeTruthy();
    // …et le nom du cabinet n'occupe pas la même ligne sur écrans très étroits :
    // il est masqué sous sm et réapparaît ensuite en texte tronqué.
    const nomCabinet = header.querySelector('.menu-proprietaire-cabinet') as HTMLElement | null;
    expect(nomCabinet).toBeTruthy();
    expect(nomCabinet!.className).toContain('hidden');
    expect(nomCabinet!.className).toContain('sm:block');
    expect(nomCabinet!.className).toContain('truncate');
  });

  it('le nom du cabinet reste lisible dans le drawer (tête + profil), même si l’en-tête le masque', () => {
    const aside = el.querySelector('aside') as HTMLElement;

    expect(aside.querySelector('app-logo-opticare')).toBeTruthy();
    expect(aside.textContent).toContain('Clinic Management');
  });

  it('la cloche de notifications ouvre/ferme un panneau honnête (aucune notification inventée)', () => {
    const cloche = el.querySelector('button.menu-proprietaire-cloche') as HTMLButtonElement;
    expect(cloche.getAttribute('aria-expanded')).toBe('false');

    cloche.click();
    fixture.detectChanges();

    expect(component.notificationsOuvertes()).toBe(true);
    expect(el.textContent).toContain('Aucune notification pour le moment.');
  });

  it('Échap ferme aussi le panneau de notifications', () => {
    component.notificationsOuvertes.set(true);
    fixture.detectChanges();

    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    fixture.detectChanges();

    expect(component.notificationsOuvertes()).toBe(false);
  });

  it('le menu est fermé au départ : pas de voile sombre, hamburger en mode « ouvrir »', () => {
    expect(component.menuOuvert()).toBe(false);
    // Le voile sombre n'existe que quand le menu est ouvert.
    expect(el.querySelector('div.menu-proprietaire-overlay')).toBeNull();
    // La barre du haut et le drawer existent toujours.
    expect(el.querySelector('header')).toBeTruthy();
    expect(el.querySelector('.menu-proprietaire')?.classList.contains('menu-ouvert')).toBe(false);

    const hamburger = el.querySelector('button.menu-proprietaire-hamburger') as HTMLButtonElement;
    expect(hamburger.getAttribute('aria-label')).toBe('Ouvrir le menu');
    expect(hamburger.getAttribute('aria-expanded')).toBe('false');
  });

  it('le hamburger ouvre le menu (classe « menu-ouvert » + libellé « Fermer le menu »)', () => {
    (el.querySelector('button.menu-proprietaire-hamburger') as HTMLButtonElement).click();
    fixture.detectChanges();

    expect(component.menuOuvert()).toBe(true);
    expect(el.querySelector('.menu-proprietaire')?.classList.contains('menu-ouvert')).toBe(true);

    const hamburger = el.querySelector('button.menu-proprietaire-hamburger') as HTMLButtonElement;
    expect(hamburger.getAttribute('aria-label')).toBe('Fermer le menu');
    expect(hamburger.getAttribute('aria-expanded')).toBe('true');
  });

  it('un clic sur le voile sombre ferme le menu', () => {
    component.menuOuvert.set(true);
    fixture.detectChanges();

    (el.querySelector('div.menu-proprietaire-overlay') as HTMLElement).click();
    fixture.detectChanges();

    expect(component.menuOuvert()).toBe(false);
  });

  it('la touche Échap ferme le menu', () => {
    component.menuOuvert.set(true);
    fixture.detectChanges();

    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    fixture.detectChanges();

    expect(component.menuOuvert()).toBe(false);
  });

  it('un clic sur un lien de navigation ferme le menu', () => {
    component.menuOuvert.set(true);
    fixture.detectChanges();

    (el.querySelector('aside a') as HTMLAnchorElement).click();
    fixture.detectChanges();

    expect(component.menuOuvert()).toBe(false);
  });

  it('le lien actif est mis en évidence automatiquement (routerLinkActive)', () => {
    // Sans route active dans ce test, routerLinkActive n'applique pas ses classes :
    // on vérifie simplement que la directive est bien branchée sur chaque lien.
    const liens = el.querySelectorAll('aside a');
    expect(liens.length).toBe(6);
    liens.forEach((lien) => expect(lien.getAttribute('routerlinkactive')).not.toBeNull());
  });
});
