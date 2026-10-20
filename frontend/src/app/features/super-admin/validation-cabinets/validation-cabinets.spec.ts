import { ComponentFixture, TestBed } from '@angular/core/testing';
import { registerLocaleData } from '@angular/common';
import { provideRouter } from '@angular/router';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import localeFr from '@angular/common/locales/fr';

import { ValidationCabinets } from './validation-cabinets';

registerLocaleData(localeFr);

/**
 * Depuis la migration vers `SuperAdminLayout` (20/10/2026), cet écran ne
 * porte plus la sidebar, le profil ni la déconnexion : ces éléments sont
 * testés dans `super-admin-layout.spec.ts`. Seul le contenu propre à la
 * validation des cabinets est vérifié ici.
 */
function cabinet(id: number, nom: string, statut: string, extra: Record<string, unknown> = {}) {
  return {
    id,
    nom,
    adresse: `${id} rue du Marché`,
    ville: 'Douala',
    quartier: 'Akwa',
    telephone: `+2376000000${id}`,
    email: `${nom.toLowerCase().replace(/\s+/g, '')}@opticare.cm`,
    whatsapp_numero: null,
    slogan: null,
    description: null,
    logo_url: null,
    photos: [],
    site_web: null,
    facebook: null,
    instagram: null,
    tiktok: null,
    abonnement_premium: false,
    note_moyenne: 0,
    nb_avis: 0,
    status: statut,
    created_at: '2026-10-01T10:00:00',
    proprietaire: { nom: 'Mballa', prenom: 'Jean' },
    ...extra,
  };
}

const CABINETS = [
  cabinet(1, 'Optique Bonabéri', 'en_attente', { photos: ['https://cdn.example/piece1.jpg'] }),
  cabinet(2, 'Optique Garoua', 'en_attente'),
  cabinet(3, 'Vision Plus', 'valide'),
];
const ENVELOPPE = { status: 'success', message: '', data: { cabinets: CABINETS } };

describe('ValidationCabinets', () => {
  let component: ValidationCabinets;
  let fixture: ComponentFixture<ValidationCabinets>;
  let http: HttpTestingController;

  async function afficher(reponse: object = ENVELOPPE): Promise<HTMLElement> {
    await TestBed.configureTestingModule({
      imports: [ValidationCabinets],
      providers: [provideRouter([]), provideHttpClient(), provideHttpClientTesting()],
    }).compileComponents();
    http = TestBed.inject(HttpTestingController);
    fixture = TestBed.createComponent(ValidationCabinets);
    component = fixture.componentInstance;
    fixture.detectChanges();
    http.expectOne((r) => r.url.endsWith('/admin/cabinets')).flush(reponse);
    await fixture.whenStable();
    fixture.detectChanges();
    return fixture.nativeElement as HTMLElement;
  }

  afterEach(() => {
    sessionStorage.clear();
    localStorage.clear();
  });

  it('should create', async () => {
    await afficher();
    expect(component).toBeTruthy();
  });

  it('ne liste que les cabinets en attente et affiche le badge récapitulatif', async () => {
    const el = await afficher();

    const cartes = el.querySelectorAll('.effet-carte');
    expect(cartes.length).toBe(2);
    expect(el.textContent).toContain('Optique Bonabéri');
    expect(el.textContent).toContain('Optique Garoua');
    expect(el.textContent).not.toContain('Vision Plus');
    expect(el.textContent).toContain('En attente');
  });

  it('affiche le demandeur, les justificatifs et les actions', async () => {
    const el = await afficher();
    expect(el.textContent).toContain('Jean Mballa');
    expect(el.textContent).toContain('Justificatifs');
    expect(el.textContent).toContain('Pièce jointe');
    expect(el.textContent).toContain('Valider & Activer');
    expect(el.textContent).toContain('Demander des pièces');
  });

  it('état vide : « Aucun cabinet en attente de validation. »', async () => {
    const el = await afficher({ status: 'success', message: '', data: { cabinets: [cabinet(3, 'Vision Plus', 'valide')] } });
    expect(el.textContent).toContain('Aucun cabinet en attente de validation.');
  });

  it('valider : PUT /admin/cabinets/{id}/verify retire la carte et confirme', async () => {
    const el = await afficher();
    component.valider('1');

    const req = http.expectOne((r) => r.url.endsWith('/admin/cabinets/1/verify'));
    expect(req.request.method).toBe('PUT');
    req.flush({ status: 'success', message: '', data: { cabinet: { id: 1, status: 'valide', is_verified: true } } });
    fixture.detectChanges();

    expect(component.cabinetsEnAttente().length).toBe(1);
    expect(el.textContent).toContain('validé et activé');
  });

  it('rejeter : motif requis, puis PUT /reject', async () => {
    await afficher();
    component.ouvrirFormulaireRejet('1');
    fixture.detectChanges();

    // Sans motif : aucun appel serveur.
    component.confirmerRejet('1');
    http.expectNone((r) => r.url.includes('/reject'));

    component.motifRefus.set('Dossier incomplet');
    component.confirmerRejet('1');
    const req = http.expectOne((r) => r.url.endsWith('/admin/cabinets/1/reject'));
    expect(req.request.body).toEqual({ motif_refus: 'Dossier incomplet' });
    req.flush({ status: 'success', message: '', data: { cabinet: { id: 1, status: 'refuse', is_verified: false } } });
    fixture.detectChanges();

    expect(component.cabinetARejeter()).toBeNull();
    expect(component.cabinetsEnAttente().length).toBe(1);
  });

  it('demander des pièces : consigné localement, aucun appel serveur', async () => {
    const el = await afficher();
    const cabinet = component.cabinetsEnAttente()[0];

    component.ouvrirDemandePieces(cabinet.id);
    component.messagePieces.set('Registre de commerce');
    component.confirmerDemandePieces(cabinet);
    fixture.detectChanges();

    expect(component.succes()).toContain('consignée localement');
    expect(el.textContent).toContain('consignée localement');
    http.expectNone((r) => r.url.includes('/admin/cabinets'));
  });
});
