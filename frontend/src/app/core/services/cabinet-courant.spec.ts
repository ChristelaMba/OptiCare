import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';

import { Auth } from './auth';
import { CabinetCourant } from './cabinet-courant';

const BRUTES = {
  cabinet: { id: 1, nom: 'Vision Plus', note_moyenne: 4.5, nb_avis: 3 },
};

describe('CabinetCourant', () => {
  let service: CabinetCourant;
  let auth: Auth;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [provideHttpClient(), provideHttpClientTesting()] });
    service = TestBed.inject(CabinetCourant);
    auth = TestBed.inject(Auth);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('récupère le nom via GET /cabinets/{id}/statistiques (§15.1)', () => {
    auth.simulerConnexion('proprietaire');

    let nom: string | null = null;
    service.statistiques()!.subscribe((stats) => (nom = stats.cabinetNom));

    const req = http.expectOne((r) => r.url.endsWith('/cabinets/cab-004/statistiques'));
    expect(req.request.method).toBe('GET');
    req.flush({ status: 'success', message: '', data: BRUTES });

    expect(nom).toBe('Vision Plus');
    expect(service.nom()).toBe('Vision Plus');
  });

  it('ne fait qu’un seul appel API pour plusieurs abonnés (menu + tableau de bord)', () => {
    auth.simulerConnexion('proprietaire');

    service.statistiques()!.subscribe();
    service.statistiques()!.subscribe();

    // http.verify() en afterEach garantit qu'une seule requête a été émise.
    const req = http.expectOne((r) => r.url.endsWith('/cabinets/cab-004/statistiques'));
    req.flush({ status: 'success', message: '', data: BRUTES });

    expect(service.nom()).toBe('Vision Plus');
  });

  it('un abonné arrivé après la réponse reçoit les données sans nouvel appel (mémorisation)', () => {
    auth.simulerConnexion('proprietaire');

    service.statistiques()!.subscribe();
    const req = http.expectOne((r) => r.url.endsWith('/cabinets/cab-004/statistiques'));
    req.flush({ status: 'success', message: '', data: BRUTES });

    let nom: string | null = null;
    service.statistiques()!.subscribe((stats) => (nom = stats.cabinetNom));

    // Aucune nouvelle requête : http.verify() le confirmera.
    expect(nom).toBe('Vision Plus');
  });

  it('laisse le nom vide si l’API répond en erreur (repli des écrans)', () => {
    auth.simulerConnexion('proprietaire');

    service.statistiques()!.subscribe({ error: () => undefined });
    const req = http.expectOne((r) => r.url.endsWith('/cabinets/cab-004/statistiques'));
    req.flush({ message: 'Erreur' }, { status: 500, statusText: 'Server Error' });

    expect(service.nom()).toBe('');
  });

  it('ne propose aucune requête quand le compte n’a pas de cabinet', () => {
    auth.simulerConnexion('patient');

    expect(service.statistiques()).toBeNull();
    expect(service.nom()).toBe('');
    // http.verify() en afterEach confirme qu'aucune requête n'a été émise.
  });
});
