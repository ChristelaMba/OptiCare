import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';

import { StatistiquesService } from './statistiques';

const BRUTES = {
  cabinet: { id: 1, nom: 'Vision Plus', note_moyenne: 4.5, nb_avis: 3 },
  rdv: { total: 40, ce_mois: 12, cette_semaine: 4, aujourd_hui: 1 },
  patients: { total: 14, nouveaux_ce_mois: 2, tranches_age: { '0-18': 2, '19-30': 4, '31-45': 5, '46-60': 2, '60+': 1, non_renseigne: 0 }, top_villes: [{ ville: 'Douala', total: 14 }] },
  revenus: { total: 1783500, ce_mois: 154000, mois_precedent: 504500, en_attente: 287000, evolution_pourcentage: -69.5 },
  tendances: [
    { mois: '2026-05', label: 'May 2026', rdv: 1, consultations: 1, commandes: 0, revenus: 0 },
    { mois: '2026-06', label: 'Jun 2026', rdv: 3, consultations: 2, commandes: 1, revenus: 565000 },
  ],
};

describe('StatistiquesService', () => {
  let service: StatistiquesService;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [provideHttpClient(), provideHttpClientTesting()] });
    service = TestBed.inject(StatistiquesService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('GET /cabinets/{id}/statistiques (sans paramètre) : lit data et normalise', () => {
    let resultat: unknown;
    service.obtenirPourCabinet('1').subscribe((r) => (resultat = r));

    const req = http.expectOne((r) => r.url.endsWith('/cabinets/1/statistiques'));
    expect(req.request.method).toBe('GET');
    expect(req.request.params.keys()).toEqual([]);
    req.flush({ status: 'success', message: '', data: BRUTES });

    expect(resultat).toEqual({
      cabinetNom: 'Vision Plus',
      rdv: { total: 40, ceMois: 12, cetteSemaine: 4, aujourdHui: 1 },
      patients: {
        total: 14,
        nouveauxCeMois: 2,
        tranchesAge: [
          { tranche: '0-18', total: 2 },
          { tranche: '19-30', total: 4 },
          { tranche: '31-45', total: 5 },
          { tranche: '46-60', total: 2 },
          { tranche: '60+', total: 1 },
          { tranche: 'non_renseigne', total: 0 },
        ],
      },
      revenus: { total: 1783500, ceMois: 154000, moisPrecedent: 504500, enAttente: 287000, evolutionPourcentage: -69.5 },
      tendances: [
        { mois: '2026-05', libelle: 'mai 2026', revenus: 0 },
        { mois: '2026-06', libelle: 'juin 2026', revenus: 565000 },
      ],
    });
  });

  it('valeurs absentes ou non numériques : 0, et évolution null (indicateur masqué)', () => {
    let resultat: { rdv: { ceMois: number }; revenus: { ceMois: number; evolutionPourcentage: number | null }; tendances: unknown[]; patients: { tranchesAge: unknown[] } } | undefined;
    service.obtenirPourCabinet('6').subscribe((r) => (resultat = r as typeof resultat));
    http.expectOne((r) => r.url.endsWith('/cabinets/6/statistiques')).flush({
      status: 'success',
      message: '',
      data: { rdv: { ce_mois: 'abc' }, revenus: { ce_mois: null, evolution_pourcentage: 'n/a' } },
    });

    expect(resultat?.rdv.ceMois).toBe(0);
    expect(resultat?.revenus.ceMois).toBe(0);
    expect(resultat?.revenus.evolutionPourcentage).toBeNull();
    expect(resultat?.tendances).toEqual([]);
    expect(resultat?.patients.tranchesAge).toEqual([]);
  });

  it('évolution fournie en chaîne numérique : convertie ; 0 conservé', () => {
    const lire = (valeur: unknown) => {
      let evolution: number | null | undefined;
      service.obtenirPourCabinet('6').subscribe((r) => (evolution = r.revenus.evolutionPourcentage));
      http.expectOne((r) => r.url.endsWith('/statistiques')).flush({ data: { revenus: { evolution_pourcentage: valeur } } });
      return evolution;
    };
    expect(lire('12.5')).toBe(12.5);
    expect(lire(0)).toBe(0);
    expect(lire(null)).toBeNull();
    expect(lire('')).toBeNull();
  });

  it('libelleMois() : mois en français à partir de « AAAA-MM », libellé du serveur sinon', () => {
    expect(StatistiquesService.libelleMois('2026-02', 'Feb 2026')).toBe('février 2026');
    expect(StatistiquesService.libelleMois('2026-12', null)).toBe('décembre 2026');
    expect(StatistiquesService.libelleMois('inconnu', 'Oct 2026')).toBe('Oct 2026');
    expect(StatistiquesService.libelleMois(null, null)).toBe('');
  });
});
