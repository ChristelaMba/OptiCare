import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute, provideRouter } from '@angular/router';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { of } from 'rxjs';

import { VitrineCabinet } from './vitrine-cabinet';

const CABINET_BRUT = {
  id: 5,
  nom: 'Cabinet TEST Diagnostic',
  adresse: 'Rue de Test',
  ville: 'Douala',
  quartier: null,
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
  note_moyenne: 0,
  nb_avis: 0,
  status: 'valide',
  created_at: '2026-10-01T00:00:00.000000Z',
  proprietaire: null,
};

describe('VitrineCabinet', () => {
  let component: VitrineCabinet;
  let fixture: ComponentFixture<VitrineCabinet>;
  let http: HttpTestingController;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [VitrineCabinet],
      providers: [
        provideRouter([]),
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: ActivatedRoute, useValue: { paramMap: of(new Map([['id', '5']]) as never) } },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(VitrineCabinet);
    component = fixture.componentInstance;
    http = TestBed.inject(HttpTestingController);
    fixture.detectChanges();
  });

  async function repondre(avis: unknown[]): Promise<string> {
    http.expectOne((r) => r.url.endsWith('/cabinets/5')).flush({ status: 'success', message: '', data: { cabinet: CABINET_BRUT } });
    http.expectOne((r) => r.url.endsWith('/cabinets/5/avis')).flush({
      status: 'success',
      message: '',
      data: { avis, moyenne: 0, total: avis.length, repartition: {} },
    });
    fixture.detectChanges();
    await fixture.whenStable();
    return (fixture.nativeElement as HTMLElement).textContent ?? '';
  }

  it('should create', () => {
    expect(component).toBeTruthy();
    http.expectOne((r) => r.url.endsWith('/cabinets/5'));
    http.expectOne((r) => r.url.endsWith('/cabinets/5/avis'));
  });

  it('aucun avis : « Aucun avis pour le moment », aucun faux avis', async () => {
    const texte = await repondre([]);

    expect(texte).toContain('Aucun avis pour le moment');
    expect(texte).not.toContain('Jean Dupont');
    expect(texte).not.toContain('Marie Laurent');
    expect(texte).not.toContain('Sophie Martin');
  });

  it('avis réels : affichés avec nom abrégé', async () => {
    const texte = await repondre([
      { id: 1, note: 4, commentaire: 'Accueil chaleureux', created_at: new Date().toISOString(), patient: { nom: 'Dupont', prenom: 'Sam' } },
    ]);

    expect(texte).toContain('Accueil chaleureux');
    expect(texte).toContain('Sam D.');
    expect(texte).not.toContain('Aucun avis pour le moment');
  });

  it('adresse sans virgule orpheline quand le quartier est vide', async () => {
    await repondre([]);

    expect(component.adresseComplete(component.cabinet()!)).toBe('Rue de Test, Douala');
  });
});
