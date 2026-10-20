import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';

import { AnnuaireCabinets } from './annuaire-cabinets';

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
    note_moyenne: 4.5,
    nb_avis: 3,
    status: statut,
    created_at: '2026-06-01T10:00:00',
    proprietaire: { nom: 'Mballa', prenom: 'Jean' },
    ...extra,
  };
}

const CABINETS = [
  cabinet(1, 'Vision Plus', 'valide'),
  cabinet(2, 'Optique Bonanjo', 'valide', { ville: 'Yaoundé', quartier: 'Bastos' }),
  cabinet(3, 'Optique Étoile', 'refuse'),
  cabinet(4, 'Optique Garoua', 'en_attente'),
];
const ENVELOPPE = { status: 'success', message: '', data: { cabinets: CABINETS } };

describe('AnnuaireCabinets', () => {
  let component: AnnuaireCabinets;
  let fixture: ComponentFixture<AnnuaireCabinets>;
  let http: HttpTestingController;

  async function afficher(reponse: object = ENVELOPPE): Promise<HTMLElement> {
    await TestBed.configureTestingModule({
      imports: [AnnuaireCabinets],
      providers: [provideRouter([]), provideHttpClient(), provideHttpClientTesting()],
    }).compileComponents();
    http = TestBed.inject(HttpTestingController);
    fixture = TestBed.createComponent(AnnuaireCabinets);
    component = fixture.componentInstance;
    fixture.detectChanges();
    http.expectOne((r) => r.url.endsWith('/admin/cabinets')).flush(reponse);
    await fixture.whenStable();
    fixture.detectChanges();
    return fixture.nativeElement as HTMLElement;
  }

  const lignes = (el: HTMLElement) => Array.from(el.querySelectorAll('tbody tr'));

  afterEach(() => {
    sessionStorage.clear();
    localStorage.clear();
  });

  it('charge GET /admin/cabinets et affiche nom, propriétaire, ville, statut', async () => {
    const el = await afficher();

    expect(lignes(el).length).toBe(4);
    const texte = el.textContent ?? '';
    expect(texte).toContain('Vision Plus');
    expect(texte).toContain('Jean Mballa');
    expect(texte).toContain('Yaoundé');
    expect(texte).toContain('Actif');
    expect(texte).toContain('Suspendu');
  });

  it('ventilation par statut : 2 actifs, 1 en attente, 1 suspendu', async () => {
    const el = await afficher();
    const ventilation = el.querySelector('[data-testid=ventilation]')?.textContent?.replace(/\s+/g, ' ') ?? '';
    expect(ventilation).toContain('4 cabinets');
    expect(ventilation).toContain('2 actifs');
    expect(ventilation).toContain('1 en attente');
    expect(ventilation).toContain('1 suspendus');
  });

  it('recherche par nom et par ville, et filtre par statut', async () => {
    const el = await afficher();

    component.texteRecherche.set('bonanjo');
    fixture.detectChanges();
    expect(lignes(el).length).toBe(1);

    component.texteRecherche.set('yaoundé');
    fixture.detectChanges();
    expect(lignes(el).length).toBe(1);

    component.texteRecherche.set('');
    component.filtreStatut.set('refuse');
    fixture.detectChanges();
    expect(lignes(el).length).toBe(1);
    expect(lignes(el)[0].textContent).toContain('Optique Étoile');
  });

  it('la fiche détaillée s’ouvre et se ferme', async () => {
    const el = await afficher();
    expect(el.querySelector('[role=dialog]')).toBeNull();

    const boutonFiche = lignes(el)[0].querySelector('button') as HTMLButtonElement;
    boutonFiche.click();
    fixture.detectChanges();
    expect(el.querySelector('[role=dialog]')?.textContent).toContain('Vision Plus');
    expect(el.querySelector('[role=dialog]')?.textContent).toContain('Jean Mballa');

    component.fermerFiche();
    fixture.detectChanges();
    expect(el.querySelector('[role=dialog]')).toBeNull();
  });

  it('suspendre un cabinet actif : confirmation puis PUT /admin/cabinets/{id}/reject', async () => {
    const el = await afficher();
    const actif = component.cabinetsPage().find((c) => c.status === 'valide')!;

    component.ouvrirConfirmationSuspension(actif);
    fixture.detectChanges();
    expect(el.querySelector('[role=dialog]')?.textContent).toContain('Suspendre ce cabinet');

    component.confirmerSuspension();
    const req = http.expectOne((r) => r.url.endsWith(`/admin/cabinets/${actif.id}/reject`));
    expect(req.request.method).toBe('PUT');
    expect(req.request.body.motif_refus).toBeTruthy();
    req.flush({ status: 'success', message: '', data: { cabinet: { id: Number(actif.id), status: 'refuse', is_verified: false } } });
    fixture.detectChanges();

    expect(component.cabinetsPage().find((c) => c.id === actif.id)?.status).toBe('refuse');
    expect(component.succesAction()).toContain('suspendu');
  });

  it('réactiver un cabinet suspendu : confirmation puis PUT /verify', async () => {
    const el = await afficher();
    const suspendu = component.cabinetsPage().find((c) => c.status === 'refuse')!;

    component.ouvrirConfirmationSuspension(suspendu);
    fixture.detectChanges();
    expect(el.querySelector('[role=dialog]')?.textContent).toContain('Réactiver ce cabinet');

    component.confirmerSuspension();
    const req = http.expectOne((r) => r.url.endsWith(`/admin/cabinets/${suspendu.id}/verify`));
    expect(req.request.method).toBe('PUT');
    req.flush({ status: 'success', message: '', data: { cabinet: { id: Number(suspendu.id), status: 'valide', is_verified: true } } });
    fixture.detectChanges();

    expect(component.cabinetsPage().find((c) => c.id === suspendu.id)?.status).toBe('valide');
    expect(component.succesAction()).toContain('réactivé');
  });

  it('état vide : « Aucun cabinet enregistré. »', async () => {
    const el = await afficher({ status: 'success', message: '', data: { cabinets: [] } });
    expect(lignes(el)[0].textContent).toContain('Aucun cabinet enregistré.');
  });

  it('erreur de chargement : message affiché', async () => {
    const el = await afficher({ status: 'error', message: 'Erreur interne' });
    expect(el.textContent).toContain('Impossible de charger les cabinets');
  });
});
