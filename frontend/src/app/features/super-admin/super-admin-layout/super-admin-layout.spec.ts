import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';

import { SuperAdminLayout } from './super-admin-layout';
import { Auth } from '../../../core/services/auth';

/**
 * Le layout porte désormais la navigation à sections, le profil et le
 * bouton de déconnexion rouge, communs aux 6 écrans Super Admin. Les tests
 * correspondants ont été déplacés ici depuis `validation-cabinets.spec.ts`
 * et `gestion-comptes.spec.ts` lors de la migration du 20/10/2026.
 */
describe('SuperAdminLayout', () => {
  let component: SuperAdminLayout;
  let fixture: ComponentFixture<SuperAdminLayout>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [SuperAdminLayout],
      // Routes factices : les liens du menu pointent vers `dashboard`, etc.
      // Sans elles, un clic déclenche une navigation non résolue (NG04002).
      providers: [
        provideRouter([
          { path: 'dashboard', children: [] },
          { path: '**', children: [] },
        ]),
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(SuperAdminLayout);
    component = fixture.componentInstance;
  });

  afterEach(() => {
    sessionStorage.clear();
    localStorage.clear();
  });

  it('should create', () => {
    fixture.detectChanges();
    expect(component).toBeTruthy();
  });

  it('sidebar : profil (initiales SA + nom) et déconnexion en pied de menu', () => {
    TestBed.inject(Auth).simulerConnexion('super_admin');
    fixture.detectChanges();

    const nav = fixture.nativeElement.querySelector('aside') as HTMLElement;
    const profil = nav.querySelector('.profile-avatar') as HTMLElement;
    expect(profil.textContent?.trim()).toBe('SA');
    expect(nav.textContent).toContain('Super Administrateur Test');
    expect(nav.textContent).toContain('Se déconnecter');

    // Le rôle n'est plus répété à côté de l'avatar (il figure déjà dans le nom de démo).
    expect(nav.querySelector('.profile-details')?.textContent?.trim()).toBe('Super Administrateur Test');

    // Le profil précède la déconnexion (bloc profil + bouton en pied de sidebar).
    const bouton = [...nav.querySelectorAll('button')].find((b) => b.textContent?.includes('Se déconnecter')) as Node;
    const position = profil.compareDocumentPosition(bouton);
    expect(position & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });

  it('le bouton de déconnexion utilise l’icône sortante (svg) en rouge, comme l’espace patient', () => {
    TestBed.inject(Auth).simulerConnexion('super_admin');
    fixture.detectChanges();

    const bouton = fixture.nativeElement.querySelector('.logout-button') as HTMLElement;
    expect(bouton).toBeTruthy();

    // Icône SVG (et non la police material-symbols dont la flèche partait dans l'autre sens).
    expect(bouton.querySelector('svg')).toBeTruthy();
    expect(bouton.textContent).not.toContain('logout');
  });

  it('navigation : 3 sections et 7 liens, avec les routes attendues', () => {
    TestBed.inject(Auth).simulerConnexion('super_admin');
    fixture.detectChanges();

    const nav = fixture.nativeElement.querySelector('aside nav') as HTMLElement;
    const texte = nav.textContent ?? '';
    expect(texte).toContain("Vue d'ensemble");
    expect(texte).toContain('Gestion');
    expect(texte).toContain('Système & Sécurité');

    const liens = Array.from(nav.querySelectorAll('a')).map((a) => a.getAttribute('href'));
    expect(liens).toEqual([
      '/dashboard',
      '/cabinets/validation',
      '/cabinets',
      '/comptes',
      '/avis',
      '/audit-logs',
      '/parametres',
    ]);
  });

  describe('responsive (téléphone)', () => {
    let racine: HTMLElement;

    beforeEach(() => {
      TestBed.inject(Auth).simulerConnexion('super_admin');
      fixture.detectChanges();
      racine = fixture.nativeElement as HTMLElement;
    });

    it('la barre du haut est rendue et vit dans le contenu principal (pas à côté de la sidebar)', () => {
      const header = racine.querySelector('.mobile-header') as HTMLElement;
      const main = racine.querySelector('.super-admin-main') as HTMLElement;
      const layout = racine.querySelector('.super-admin-layout') as HTMLElement;

      expect(header).toBeTruthy();
      // La barre du haut doit être DANS `<main>` : sinon, en flex, elle
      // s'afficherait côte à côte avec le contenu sur téléphone.
      expect(main.contains(header)).toBe(true);
      // Le contenu principal est le seul enfant de la zone flex avec la sidebar.
      expect(layout.querySelectorAll(':scope > .mobile-header').length).toBe(0);
    });

    it('la barre du haut porte un bouton hamburger et une déconnexion en icône', () => {
      const header = racine.querySelector('.mobile-header') as HTMLElement;
      const hamburger = header.querySelector('.mobile-menu-button') as HTMLElement;
      expect(hamburger).toBeTruthy();
      expect(hamburger.getAttribute('aria-expanded')).toBe('false');

      const logout = header.querySelector('.mobile-logout') as HTMLElement;
      expect(logout).toBeTruthy();
      expect(logout.querySelector('svg')).toBeTruthy();
    });

    it('le bouton hamburger ouvre le tiroir (classe sidebar-open + voile) puis le referme', () => {
      const hamburger = racine.querySelector('.mobile-menu-button') as HTMLElement;
      const sidebar = racine.querySelector('.super-sidebar') as HTMLElement;

      hamburger.click();
      fixture.detectChanges();
      expect(sidebar.classList.contains('sidebar-open')).toBe(true);
      expect(hamburger.getAttribute('aria-expanded')).toBe('true');

      // Un voile sombre apparaît et ferme le tiroir au clic.
      const voile = racine.querySelector('.sidebar-overlay') as HTMLElement;
      expect(voile).toBeTruthy();
      voile.click();
      fixture.detectChanges();
      expect(sidebar.classList.contains('sidebar-open')).toBe(false);
    });

    it('un lien de navigation ferme le tiroir', () => {
      const hamburger = racine.querySelector('.mobile-menu-button') as HTMLElement;
      hamburger.click();
      fixture.detectChanges();

      const premierLien = racine.querySelector('.super-sidebar .nav-link') as HTMLElement;
      premierLien.click();
      fixture.detectChanges();

      const sidebar = racine.querySelector('.super-sidebar') as HTMLElement;
      expect(sidebar.classList.contains('sidebar-open')).toBe(false);
    });
  });
});
