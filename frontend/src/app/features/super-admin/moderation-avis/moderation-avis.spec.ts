import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';

import { ModerationAvis } from './moderation-avis';

const CABINET = { id: 6, nom: 'Vision Plus', ville: 'Douala', nb_avis: 2 };

const AVIS = [
  { id: 4, note: 4, commentaire: 'Bon accueil', created_at: '2026-10-12T00:00:00Z', patient: { nom: 'Ngono', prenom: 'Alice' } },
  { id: 5, note: 1, commentaire: null, created_at: '2026-10-13T00:00:00Z', patient: null },
];

/** Enveloppe JSON:API d'un cabinet tel que le normalise `Cabinet.listerPublics()` (voir cabinet.ts). */
function enveloppeCabinet(c: typeof CABINET) {
  return {
    id: c.id,
    nom: c.nom,
    ville: c.ville,
    nb_avis: c.nb_avis,
    adresse: '',
    quartier: '',
    telephone: '',
    email: '',
    slogan: null,
    description: null,
    logo_url: null,
    photos: null,
    abonnement_premium: false,
    note_moyenne: 0,
    status: 'valide',
    created_at: '2026-10-01T00:00:00Z',
    proprietaire: null,
  };
}

describe('ModerationAvis', () => {
  let component: ModerationAvis;
  let fixture: ComponentFixture<ModerationAvis>;
  let http: HttpTestingController;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ModerationAvis],
      providers: [provideHttpClient(), provideHttpClientTesting()],
    }).compileComponents();

    fixture = TestBed.createComponent(ModerationAvis);
    component = fixture.componentInstance;
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    http.verify();
  });

  /** Déclenche `ngOnInit` (donc `GET /cabinets`) puis répond à la requête. */
  function repondreCabinets(): void {
    fixture.detectChanges();
    http.expectOne((r) => r.url.endsWith('/cabinets')).flush({
      status: 'success',
      message: '',
      data: { cabinets: [enveloppeCabinet(CABINET)] },
    });
  }

  it('should create', async () => {
    repondreCabinets();
    await fixture.whenStable();
    expect(component).toBeTruthy();
  });

  it('charge la liste des cabinets via GET /cabinets', async () => {
    repondreCabinets();
    await fixture.whenStable();

    expect(component.cabinets()).toHaveLength(1);
    expect(component.cabinets()[0].nom).toBe('Vision Plus');
  });

  it('sélectionner un cabinet charge ses avis via GET /cabinets/{id}/avis', async () => {
    repondreCabinets();
    await fixture.whenStable();

    component.selectionner('6');

    http.expectOne((r) => r.url.endsWith('/cabinets/6/avis')).flush({
      status: 'success',
      message: '',
      data: { avis: AVIS, moyenne: 2.5, total: 2, repartition: {} },
    });

    expect(component.avis()).toHaveLength(2);
    // Auteur abrégé ; un patient inconnu reste « Patient », jamais inventé.
    expect(component.avis()[0].auteur).toBe('Alice N.');
    expect(component.avis()[1].auteur).toBe('Patient');
    // Agrégat public repris tel quel (moyenne + total des avis).
    expect(component.moyenneAvis()).toBe(2.5);
    expect(component.totalAvis()).toBe(2);
  });

  it('aucun avis : état vide honnête', async () => {
    repondreCabinets();
    await fixture.whenStable();

    component.selectionner('6');
    http.expectOne((r) => r.url.endsWith('/cabinets/6/avis')).flush({
      status: 'success',
      message: '',
      data: { avis: [], moyenne: 0, total: 0, repartition: {} },
    });
    await fixture.whenStable();

    expect(component.avis()).toEqual([]);
    expect(component.aucunAvis()).toBe(true);
    expect((fixture.nativeElement as HTMLElement).textContent).toContain('Aucun avis pour ce cabinet.');
  });

  it('confirmerSuppression() : DELETE /avis/{id} retire l’avis après succès', async () => {
    repondreCabinets();
    await fixture.whenStable();

    component.selectionner('6');
    http.expectOne((r) => r.url.endsWith('/cabinets/6/avis')).flush({
      status: 'success',
      message: '',
      data: { avis: AVIS, moyenne: 2.5, total: 2, repartition: {} },
    });

    component.ouvrirConfirmation(component.avis()[0]);
    component.confirmerSuppression();

    const req = http.expectOne((r) => r.url.endsWith('/avis/4'));
    expect(req.request.method).toBe('DELETE');
    req.flush({ status: 'success', message: 'Avis supprimé avec succès.', data: null });

    expect(component.avis()).toHaveLength(1);
    expect(component.avis()[0].id).toBe(5);
    expect(component.succesAction()).toContain('supprimé');
  });

  it('échec de suppression : erreur affichée, avis conservé', async () => {
    repondreCabinets();
    await fixture.whenStable();

    component.selectionner('6');
    http.expectOne((r) => r.url.endsWith('/cabinets/6/avis')).flush({
      status: 'success',
      message: '',
      data: { avis: AVIS, moyenne: 2.5, total: 2, repartition: {} },
    });

    component.ouvrirConfirmation(component.avis()[0]);
    component.confirmerSuppression();

    http.expectOne((r) => r.url.endsWith('/avis/4')).flush(
      { status: 'error', message: 'Accès refusé' },
      { status: 403, statusText: 'Forbidden' },
    );

    expect(component.avis()).toHaveLength(2);
    expect(component.erreurAction()).toBe('Accès refusé.');
  });
});
