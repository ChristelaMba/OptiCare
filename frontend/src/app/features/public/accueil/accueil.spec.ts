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
});
