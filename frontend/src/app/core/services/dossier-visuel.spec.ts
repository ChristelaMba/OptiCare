import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';

import { DossierVisuelService } from './dossier-visuel';
import { Auth } from './auth';

describe('DossierVisuelService', () => {
  let service: DossierVisuelService;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(DossierVisuelService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    sessionStorage.clear();
    localStorage.clear();
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('sans session : erreur', () => {
    let erreur: unknown;
    service.getMonDossier().subscribe({ error: (e) => (erreur = e) });
    expect(erreur).toBeInstanceOf(Error);
  });

  it('la liste des cabinets en échec ne bloque pas le dossier (cabinet sans nom)', () => {
    TestBed.inject(Auth).simulerConnexion('patient');
    let resultat: { fiches: { cabinet: string | null }[] } | undefined;
    service.getMonDossier().subscribe((r) => (resultat = r));

    http.expectOne((r) => r.url.endsWith('/user')).flush({
      id: 7, nom: 'Test', prenom: 'Patient', email: null, telephone: '+237600000000', ville: 'Douala',
      role: 'patient', cabinet_id: null, is_active: true, created_at: '2026-09-07T04:59:03.000000Z', patient: { id: 3 },
    });
    http.expectOne((r) => r.url.endsWith('/patients/3/consultations')).flush({
      status: 'success',
      message: '',
      data: {
        consultations: [
          { id: 1, cabinet_id: 9, date_consultation: '2026-09-10T00:00:00.000000Z', motif: null, statut: 'en_cours', plaintes: null, prescription: null },
        ],
      },
    });
    http.expectOne((r) => r.url.endsWith('/cabinets')).flush('boom', { status: 500, statusText: 'Server Error' });

    expect(resultat?.fiches[0].cabinet).toBeNull();
  });

  describe('nomFichier()', () => {
    const utilisateur = { nom: 'Nkeng-Ébène', prenom: 'Aline' };

    it('Content-Disposition simple, avec guillemets ou sans', () => {
      expect(DossierVisuelService.nomFichier('attachment; filename="dossier-A-B-2026.pdf"', utilisateur)).toBe('dossier-A-B-2026.pdf');
      expect(DossierVisuelService.nomFichier('attachment; filename=dossier.pdf', utilisateur)).toBe('dossier.pdf');
    });

    it('forme étendue filename*=UTF-8', () => {
      expect(DossierVisuelService.nomFichier("attachment; filename*=UTF-8''dossier-%C3%89t%C3%A9.pdf", utilisateur)).toBe('dossier-Été.pdf');
    });

    it('à défaut : dossier-{nom}-{prenom}.pdf (sans accents)', () => {
      expect(DossierVisuelService.nomFichier(null, utilisateur)).toBe('dossier-nkeng-ebene-aline.pdf');
    });
  });
});
