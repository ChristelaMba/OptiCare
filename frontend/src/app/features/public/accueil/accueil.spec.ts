import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';

import { Accueil } from './accueil';
import { Auth } from '../../../core/services/auth';

function cabinetBrut(id: number, nom: string, quartier: string | null, nbAvis = 0) {
  return {
    id,
    nom,
    adresse: 'Rue TEST',
    ville: 'Douala',
    quartier,
    telephone: '+237600000000',
    email: 'cabinet@example.com',
    whatsapp_numero: null,
    slogan: null,
    description: null,
    logo_url: null,
    photos: null,
    site_web: null,
    facebook: null,
    instagram: null,
    tiktok: null,
    abonnement_premium: false,
    note_moyenne: nbAvis > 0 ? 4.5 : 0,
    nb_avis: nbAvis,
    status: 'valide',
    created_at: '2026-10-01T00:00:00.000000Z',
    proprietaire: { nom: 'Test', prenom: 'Proprio' },
  };
}

describe('Accueil', () => {
  let component: Accueil;
  let fixture: ComponentFixture<Accueil>;
  let http: HttpTestingController;

  beforeEach(async () => {
    // jsdom (environnement de test) ne fournit pas IntersectionObserver, utilisé
    // par Accueil.ngAfterViewInit pour suivre la section visible au scroll.
    (globalThis as unknown as { IntersectionObserver: unknown }).IntersectionObserver = class {
      observe(): void {}
      unobserve(): void {}
      disconnect(): void {}
    };

    await TestBed.configureTestingModule({
      imports: [Accueil],
      providers: [provideRouter([]), provideHttpClient(), provideHttpClientTesting()],
    }).compileComponents();

    fixture = TestBed.createComponent(Accueil);
    component = fixture.componentInstance;
    http = TestBed.inject(HttpTestingController);
    fixture.detectChanges();
  });

  async function afficherCabinets(cabinets: unknown[]): Promise<HTMLElement> {
    http.expectOne((r) => r.url.endsWith('/cabinets')).flush({
      status: 'success',
      message: '',
      data: { cabinets },
    });
    fixture.detectChanges();
    await fixture.whenStable();
    return fixture.nativeElement as HTMLElement;
  }

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('localisation : pas de virgule en tête quand le quartier est vide', async () => {
    const el = await afficherCabinets([
      cabinetBrut(5, 'Cabinet TEST Diagnostic', null),
      cabinetBrut(8, 'Cabinet Avec Quartier', 'Akwa'),
    ]);

    const texte = el.textContent ?? '';
    expect(texte).toContain('Akwa, Douala');
    expect(texte).not.toContain(', Douala,');
    expect(el.textContent).not.toMatch(/(^|\s),\s*Douala/);
    expect(component.localisation({ quartier: '', ville: 'Douala' } as never)).toBe('Douala');
    expect(component.localisation({ quartier: 'Akwa', ville: '' } as never)).toBe('Akwa');
    expect(component.localisation({ quartier: '', ville: '' } as never)).toBe('');
  });

  it('sans avis réel : la section « Avis de nos patients » est masquée, aucun faux témoignage', async () => {
    const el = await afficherCabinets([cabinetBrut(5, 'Cabinet TEST Diagnostic', null, 0)]);
    http.expectNone((r) => r.url.includes('/avis'));

    const texte = el.textContent ?? '';
    expect(texte).not.toContain('Avis de nos patients');
    expect(texte).not.toContain('Jean Dupont');
    expect(texte).not.toContain('Marie L.');
    expect(texte).not.toContain('Thomas Bernard');
    expect(texte).not.toContain('milliers');
  });

  it('avis réels : la section apparaît avec les vrais avis, nom abrégé', async () => {
    await afficherCabinets([cabinetBrut(8, 'Cabinet TEST-DIAG 1', 'Akwa', 1)]);

    http.expectOne((r) => r.url.endsWith('/cabinets/8/avis')).flush({
      status: 'success',
      message: '',
      data: {
        avis: [
          { id: 1, note: 5, commentaire: 'Très bon accueil', created_at: '2026-10-10T00:00:00Z', patient: { nom: 'Dupont', prenom: 'Sam' } },
          { id: 2, note: 3, commentaire: null, created_at: '2026-10-11T00:00:00Z', patient: { nom: 'Muet', prenom: 'Lou' } },
        ],
        moyenne: 4,
        total: 2,
        repartition: {},
      },
    });
    fixture.detectChanges();
    await fixture.whenStable();

    const texte = (fixture.nativeElement as HTMLElement).textContent ?? '';
    expect(texte).toContain('Avis de nos patients');
    expect(texte).toContain('Très bon accueil');
    expect(texte).toContain('Sam D.');
    expect(texte).not.toContain('Lou M.');
  });

  it('pied de page : les liens vers des pages inexistantes sont désactivés, pas des href="#"', async () => {
    const el = await afficherCabinets([]);
    const footer = el.querySelector('footer') as HTMLElement;

    expect(footer.querySelectorAll('a[href="#"]').length).toBe(0);
    expect(footer.querySelectorAll('[aria-disabled="true"]').length).toBe(5);
  });

  it('en-tête : utilisateur connecté → son nom à la place de Connexion / Inscription', async () => {
    TestBed.inject(Auth).simulerConnexion('patient');
    const el = await afficherCabinets([]);
    const nav = el.querySelector('nav') as HTMLElement;

    expect(nav.textContent).toContain('Patient Test');
    expect(nav.textContent).not.toContain('Inscription');

    sessionStorage.clear();
    localStorage.clear();
  });

  it("menu mobile : fermé par défaut, le bouton l'ouvre (aria-expanded) avec 4 liens, Échap le ferme", async () => {
    const el = await afficherCabinets([]);
    const bouton = el.querySelector('button[aria-controls="menu-mobile"]') as HTMLButtonElement;

    expect(bouton.getAttribute('aria-expanded')).toBe('false');
    expect(el.querySelector('#menu-mobile')).toBeNull();

    bouton.click();
    fixture.detectChanges();

    const menu = el.querySelector('#menu-mobile') as HTMLElement;
    expect(bouton.getAttribute('aria-expanded')).toBe('true');
    expect([...menu.querySelectorAll('a')].map((a) => a.textContent?.trim())).toEqual(['Services', 'Cabinets', 'Connexion', 'Inscription']);

    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
    fixture.detectChanges();
    expect(el.querySelector('#menu-mobile')).toBeNull();
  });

  it('menu mobile : un clic ailleurs sur la page le referme, mais pas un clic sur le bouton', async () => {
    const el = await afficherCabinets([]);
    const bouton = el.querySelector('button[aria-controls="menu-mobile"]') as HTMLButtonElement;

    bouton.click();
    fixture.detectChanges();
    expect(el.querySelector('#menu-mobile')).not.toBeNull();

    // Un clic dans le menu ne le ferme pas (il se ferme par ses propres liens).
    (el.querySelector('#menu-mobile') as HTMLElement).click();
    fixture.detectChanges();
    expect(el.querySelector('#menu-mobile')).not.toBeNull();

    // Un clic n'importe où ailleurs sur la page le referme.
    (el.querySelector('main') as HTMLElement).click();
    fixture.detectChanges();
    expect(el.querySelector('#menu-mobile')).toBeNull();
  });

  it('cartes cabinets : notation à gauche (étoiles en nombre) et nom/localisation centrés sous les étoiles', async () => {
    const el = await afficherCabinets([cabinetBrut(8, 'Cabinet Avec Quartier', 'Akwa', 1)]);

    http.expectOne((r) => r.url.endsWith('/cabinets/8/avis')).flush({
      status: 'success',
      message: '',
      data: { avis: [], moyenne: 4.5, total: 0, repartition: {} },
    });
    fixture.detectChanges();
    await fixture.whenStable();

    const nom = [...el.querySelectorAll('h4')].find((h) => h.textContent?.includes('Cabinet Avec Quartier')) as HTMLElement;
    expect(nom).toBeTruthy();
    expect(nom.className).toContain('text-center');

    const localisation = [...el.querySelectorAll('p')].find((p) => p.textContent?.trim() === 'Akwa, Douala') as HTMLElement;
    expect(localisation).toBeTruthy();
    expect(localisation.className).toContain('text-center');

    // La ligne d'étoiles est au-dessus du nom et contient autant d'étoiles que la note (4,5 → 5).
    const bloc = nom.parentElement as HTMLElement;
    const etoilesAffichees = bloc.querySelectorAll('.material-symbols-outlined.fill-icon');
    expect(etoilesAffichees.length).toBe(5);
    expect(bloc.firstElementChild?.textContent).toContain('star');
  });

  it('menu mobile, utilisateur connecté : espace + déconnexion à la place de Connexion / Inscription', async () => {
    TestBed.inject(Auth).simulerConnexion('patient');
    const el = await afficherCabinets([]);

    (el.querySelector('button[aria-controls="menu-mobile"]') as HTMLButtonElement).click();
    fixture.detectChanges();
    const menu = el.querySelector('#menu-mobile') as HTMLElement;

    expect(menu.textContent).toContain('Mon espace');
    expect(menu.textContent).toContain('Se déconnecter');
    expect(menu.textContent).not.toContain('Inscription');

    sessionStorage.clear();
    localStorage.clear();
  });
});
