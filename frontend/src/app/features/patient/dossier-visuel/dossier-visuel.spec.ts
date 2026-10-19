import { ComponentFixture, TestBed } from '@angular/core/testing';
import { registerLocaleData } from '@angular/common';
import { provideRouter } from '@angular/router';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import localeFr from '@angular/common/locales/fr';

import { Auth } from '../../../core/services/auth';
import { DossierVisuel } from './dossier-visuel';

// Le template affiche des dates via `| date:…:'fr'` : les données du locale
// français doivent être enregistrées avant le rendu, sinon `DatePipe` lève
// NG0701 (Missing locale data for the locale "fr").
registerLocaleData(localeFr);

const USER = {
  id: 74, nom: 'Nkeng', prenom: 'Aline', email: null, telephone: '+237600000201', ville: 'Douala',
  role: 'patient', cabinet_id: null, is_active: true, created_at: '2026-10-19T14:44:51.000000Z', patient: { id: 46 },
};

const OEIL = { sphere: '-1.50', cylindre: null, axe: null, addition: '1.00', acuite_loin: '10/10', acuite_pres: 'P2' };
const OEIL_VIDE = { sphere: null, cylindre: null, axe: null, addition: null, acuite_loin: null, acuite_pres: null };

function consultation(id: number, cabinetId: number, date: string, extra: Record<string, unknown> = {}) {
  return {
    id,
    patient_id: 46,
    cabinet_id: cabinetId,
    opticien_id: 5,
    date_consultation: `${date}T00:00:00.000000Z`,
    motif: 'Controle',
    statut: 'terminee',
    plaintes: { vision_flou_loin: true, vision_flou_pres: false, vision_double: false, demangeaisons: false, larmoiement: false, autres: null },
    observations: 'RAS',
    prescription: { od: OEIL, og: OEIL },
    opticien: { id: 5, nom: 'Tchinda', prenom: 'Herve' },
    ...extra,
  };
}

const CABINETS = {
  status: 'success',
  message: '',
  data: { cabinets: [{ id: 1, nom: 'Cabinet Un' }, { id: 2, nom: 'Cabinet Deux' }] },
};

describe('DossierVisuel', () => {
  let component: DossierVisuel;
  let fixture: ComponentFixture<DossierVisuel>;
  let http: HttpTestingController;

  async function afficher(consultations: unknown[] | { status: number; corps: object }): Promise<HTMLElement> {
    await TestBed.configureTestingModule({
      imports: [DossierVisuel],
      providers: [provideRouter([]), provideHttpClient(), provideHttpClientTesting()],
    }).compileComponents();
    TestBed.inject(Auth).simulerConnexion('patient');
    http = TestBed.inject(HttpTestingController);
    fixture = TestBed.createComponent(DossierVisuel);
    component = fixture.componentInstance;
    fixture.detectChanges();

    http.expectOne((r) => r.url.endsWith('/user')).flush(USER);
    const req = http.expectOne((r) => r.url.endsWith('/patients/46/consultations'));
    http.expectOne((r) => r.url.endsWith('/cabinets')).flush(CABINETS);
    if (Array.isArray(consultations)) {
      req.flush({ status: 'success', message: '', data: { consultations } });
    } else {
      req.flush(consultations.corps, { status: consultations.status, statusText: 'Erreur' });
    }
    await fixture.whenStable();
    fixture.detectChanges();
    return fixture.nativeElement as HTMLElement;
  }

  afterEach(() => {
    sessionStorage.clear();
    localStorage.clear();
    vi.restoreAllMocks();
  });

  it('liste : date, cabinet (nom), opticien, motif, statut ; plus de texte « arrive bientôt »', async () => {
    const el = await afficher([consultation(1, 1, '2026-09-10'), consultation(2, 2, '2026-10-01', { statut: 'en_cours' })]);

    const texte = el.textContent ?? '';
    expect(texte).toContain('Cabinet Un');
    expect(texte).toContain('Cabinet Deux');
    expect(texte).toContain('Opticien : Herve Tchinda');
    expect(texte).toContain('Controle');
    expect(texte).toContain('Terminée');
    expect(texte).toContain('En cours');
    expect(texte).toContain('01 octobre 2026');
    expect(texte).not.toContain('arrive bientôt');
    expect(component.fiches()[0].id).toBe('2'); // le plus récent d'abord
  });

  it('état vide : « Aucune consultation pour le moment », pas de bouton PDF', async () => {
    const el = await afficher([]);

    expect(el.textContent).toContain('Aucune consultation pour le moment');
    expect(el.textContent).not.toContain('arrive bientôt');
    expect(el.textContent).not.toContain('Télécharger mon dossier');
  });

  it('prescription : affichée si l’API renvoie des valeurs, absente sinon', async () => {
    const el = await afficher([
      consultation(1, 1, '2026-09-10'),
      consultation(2, 1, '2026-08-01', { prescription: { od: OEIL_VIDE, og: OEIL_VIDE } }),
    ]);
    expect(component.fiches().find((f) => f.id === '1')?.prescription).toBeDefined();
    expect(component.fiches().find((f) => f.id === '2')?.prescription).toBeUndefined();

    expect(el.textContent).toContain('Prescription');
    component.selectionnerFiche(component.fiches().find((f) => f.id === '2')!);
    fixture.detectChanges();
    expect(el.textContent).not.toContain('Prescription');
  });

  it('erreur 403 : « Accès refusé. » ; erreur serveur : message du serveur', async () => {
    await afficher({ status: 403, corps: { status: 'error', message: 'Accès refusé' } });
    expect(component.erreur()).toBe('Accès refusé.');
    expect((fixture.nativeElement as HTMLElement).textContent).toContain('Accès refusé.');
  });

  it('erreur 500 : message du serveur affiché', async () => {
    await afficher({ status: 500, corps: { status: 'error', message: 'Erreur interne' } });
    expect(component.erreur()).toContain('Le serveur répond : Erreur interne');
  });

  describe('PDF', () => {
    function espionner(): { creer: ReturnType<typeof vi.spyOn>; clic: ReturnType<typeof vi.spyOn> } {
      const creer = vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:test');
      vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => undefined);
      const clic = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => undefined);
      return { creer, clic };
    }

    it('un seul cabinet : GET dossier-pdf?cabinet_id=, fichier téléchargé sous le nom du serveur', async () => {
      const el = await afficher([consultation(1, 1, '2026-09-10'), consultation(2, 1, '2026-10-01')]);
      const { creer, clic } = espionner();
      expect(el.querySelector('select#cabinet-pdf')).toBeNull();

      component.telechargerDossierPdf();
      const req = http.expectOne((r) => r.url.endsWith('/patients/46/dossier-pdf'));
      expect(req.request.method).toBe('GET');
      expect(req.request.params.get('cabinet_id')).toBe('1');
      expect(req.request.responseType).toBe('blob');
      req.flush(new Blob(['%PDF-1.4'], { type: 'application/pdf' }), {
        headers: { 'Content-Disposition': 'attachment; filename="dossier-Nkeng-Aline-2026-10-19.pdf"' },
      });

      expect(creer).toHaveBeenCalled();
      expect(clic).toHaveBeenCalled();
      expect(component.telechargementEnCours()).toBe(false);
      expect(component.erreurPdf()).toBeNull();
    });

    it('plusieurs cabinets : choix du cabinet, et c’est ce cabinet_id qui est envoyé', async () => {
      const el = await afficher([consultation(1, 1, '2026-09-10'), consultation(2, 2, '2026-10-01')]);
      espionner();
      expect(el.querySelector('select#cabinet-pdf')).not.toBeNull();

      component.choisirCabinetPdf('2');
      component.telechargerDossierPdf();
      const req = http.expectOne((r) => r.url.endsWith('/patients/46/dossier-pdf'));
      expect(req.request.params.get('cabinet_id')).toBe('2');
      req.flush(new Blob(['%PDF'], { type: 'application/pdf' }));
    });

    it('erreur 422 dont le corps est un blob JSON : message du serveur affiché', async () => {
      await afficher([consultation(1, 1, '2026-09-10')]);
      espionner();

      component.telechargerDossierPdf();
      http.expectOne((r) => r.url.endsWith('/dossier-pdf')).flush(
        new Blob([JSON.stringify({ status: 'error', message: 'Erreur', errors: { general: 'Paramètre cabinet_id requis.' } })], { type: 'application/json' }),
        { status: 422, statusText: 'Unprocessable Entity' },
      );
      await vi.waitFor(() => expect(component.erreurPdf()).toBe('Paramètre cabinet_id requis.'));
      expect(component.telechargementEnCours()).toBe(false);
    });

    it('erreur 403 : « Accès refusé. »', async () => {
      await afficher([consultation(1, 1, '2026-09-10')]);
      component.telechargerDossierPdf();
      http.expectOne((r) => r.url.endsWith('/dossier-pdf')).flush(
        new Blob([JSON.stringify({ message: 'Accès refusé' })], { type: 'application/json' }),
        { status: 403, statusText: 'Forbidden' },
      );
      await vi.waitFor(() => expect(component.erreurPdf()).toBe('Accès refusé.'));
    });

    it('erreur 500 avec une page HTML : message générique avec le code, rien n’est téléchargé', async () => {
      await afficher([consultation(1, 1, '2026-09-10')]);
      const { clic } = espionner();
      component.telechargerDossierPdf();
      http.expectOne((r) => r.url.endsWith('/dossier-pdf')).flush(
        new Blob(['<!DOCTYPE html><html></html>'], { type: 'text/html' }),
        { status: 500, statusText: 'Server Error' },
      );
      await vi.waitFor(() => expect(component.erreurPdf()).toContain('erreur serveur 500'));
      expect(clic).not.toHaveBeenCalled();
    });
  });
});
