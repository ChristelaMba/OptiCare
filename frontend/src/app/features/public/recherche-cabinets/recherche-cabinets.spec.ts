import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';

import { RechercheCabinets } from './recherche-cabinets';

function cabinetBrut(id: number, nom: string, quartier: string | null, adresse: string | null = 'Rue TEST') {
  return {
    id,
    nom,
    adresse,
    ville: 'Douala',
    quartier,
    telephone: '+237600000000',
    email: null,
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
    note_moyenne: 0,
    nb_avis: 0,
    status: 'valide',
    created_at: '2026-10-01T00:00:00.000000Z',
    proprietaire: null,
  };
}

describe('RechercheCabinets', () => {
  let component: RechercheCabinets;
  let fixture: ComponentFixture<RechercheCabinets>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [RechercheCabinets],
      providers: [provideRouter([]), provideHttpClient(), provideHttpClientTesting()],
    }).compileComponents();

    fixture = TestBed.createComponent(RechercheCabinets);
    component = fixture.componentInstance;
    fixture.detectChanges();

    TestBed.inject(HttpTestingController)
      .expectOne((r) => r.url.endsWith('/cabinets'))
      .flush({
        status: 'success',
        message: '',
        data: {
          cabinets: [
            cabinetBrut(5, 'Cabinet TEST Diagnostic', null),
            cabinetBrut(8, 'Cabinet TEST-DIAG 1', null, null),
            cabinetBrut(9, 'Optique Akwa', 'Akwa'),
          ],
        },
      });
    await fixture.whenStable();
  });

  function rechercher(texte: string): void {
    component.texteRecherche.set(texte);
    fixture.detectChanges();
  }

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('quartier et adresse null : aucune erreur, et pas de case « quartier » vide', () => {
    expect(component.cabinetsTries().length).toBe(3);
    expect(component.quartiersDisponibles()).toEqual(['Akwa']);
  });

  it('« TEST-DIAG » ne laisse que le cabinet correspondant', () => {
    rechercher('TEST-DIAG');

    expect(component.cabinetsTries().map((c) => c.nom)).toEqual(['Cabinet TEST-DIAG 1']);
  });

  it('la recherche porte aussi sur le quartier et la ville, sans casse', () => {
    rechercher('akwa');
    expect(component.cabinetsTries().map((c) => c.nom)).toEqual(['Optique Akwa']);

    rechercher('DOUALA');
    expect(component.cabinetsTries().length).toBe(3);
  });

  it('texte sans résultat : état vide propre', () => {
    rechercher('zzzzqq');
    const el = fixture.nativeElement as HTMLElement;

    expect(component.cabinetsTries().length).toBe(0);
    expect(el.textContent).toContain('Aucun cabinet trouvé');
  });

  it("adresse affichée sans virgule orpheline", () => {
    const [sansQuartier] = component.cabinetsTries().filter((c) => c.id === '5');

    expect(component.adresseAffichee(sansQuartier)).toBe('Rue TEST');
    expect(component.adresseAffichee({ adresse: '', quartier: 'Akwa' } as never)).toBe('Akwa');
  });
});
