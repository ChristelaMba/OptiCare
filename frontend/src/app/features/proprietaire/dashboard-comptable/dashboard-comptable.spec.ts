import { ComponentFixture, TestBed } from '@angular/core/testing';
import { registerLocaleData } from '@angular/common';
import { provideRouter } from '@angular/router';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import localeFr from '@angular/common/locales/fr';

import { Auth } from '../../../core/services/auth';
import { DashboardComptable } from './dashboard-comptable';

registerLocaleData(localeFr);

function donnees(extra: Record<string, unknown> = {}) {
  return {
    cabinet: { id: 1, nom: 'Vision Plus' },
    rdv: { total: 40, ce_mois: 12, cette_semaine: 4, aujourd_hui: 1 },
    patients: { total: 14, nouveaux_ce_mois: 2, tranches_age: { '0-18': 2, '19-30': 4, '31-45': 0, '46-60': 2, '60+': 1, non_renseigne: 0 }, top_villes: [] },
    revenus: { total: 1783500, ce_mois: 154000, mois_precedent: 504500, en_attente: 287000, evolution_pourcentage: -69.5 },
    tendances: [
      { mois: '2026-08', label: 'Aug 2026', revenus: 504500 },
      { mois: '2026-09', label: 'Sep 2026', revenus: 154000 },
      { mois: '2026-10', label: 'Oct 2026', revenus: 0 },
    ],
    ...extra,
  };
}

describe('DashboardComptable', () => {
  let component: DashboardComptable;
  let fixture: ComponentFixture<DashboardComptable>;
  let http: HttpTestingController;

  async function afficher(data: object): Promise<HTMLElement> {
    TestBed.configureTestingModule({
      imports: [DashboardComptable],
      providers: [provideRouter([]), provideHttpClient(), provideHttpClientTesting()],
    });
    const auth = TestBed.inject(Auth);
    auth.simulerConnexion('proprietaire');
    vi.spyOn(auth, 'utilisateur').mockReturnValue({ ...auth.utilisateur()!, cabinetId: '1' });
    http = TestBed.inject(HttpTestingController);
    fixture = TestBed.createComponent(DashboardComptable);
    component = fixture.componentInstance;
    fixture.detectChanges();
    http.expectOne((r) => r.url.endsWith('/cabinets/1/statistiques')).flush({ status: 'success', message: '', data });
    await fixture.whenStable();
    fixture.detectChanges();
    return fixture.nativeElement as HTMLElement;
  }

  afterEach(() => {
    sessionStorage.clear();
    localStorage.clear();
    vi.restoreAllMocks();
  });

  it('cartes : chiffre d’affaires du mois en FCFA sans décimales, rendez-vous, nouveaux patients ; pas de panier moyen', async () => {
    const el = await afficher(donnees());
    const texte = (s: string) => el.querySelector(`[data-carte=${s}]`)?.textContent?.replace(/\s+/g, ' ') ?? '';

    expect(texte('chiffre-affaires')).toContain('154 000 FCFA');
    expect(texte('rendez-vous')).toContain('12');
    expect(texte('rendez-vous')).toContain('ce mois');
    expect(texte('nouveaux-patients')).toContain('2');
    expect(el.textContent).not.toContain('Panier moyen');
    expect(el.textContent).not.toContain("Jours d'affluence");
    expect(el.textContent).not.toMatch(/NaN|undefined|null/);
  });

  it('évolution : « −69,5 % vs mois précédent » avec flèche, quand elle est numérique', async () => {
    const el = await afficher(donnees());
    const bloc = el.querySelector('[data-testid=evolution]');
    expect(bloc?.textContent?.replace(/\s+/g, ' ')).toContain('−69,5 %');
    expect(bloc?.textContent).toContain('arrow_downward');
    expect(bloc?.textContent).toContain('vs mois précédent');
  });

  it('évolution absente, non numérique ou rien à comparer (mois à 0 et mois précédent à 0) : indicateur masqué', async () => {
    let el = await afficher(donnees({ revenus: { ce_mois: 100, mois_precedent: 50, evolution_pourcentage: null } }));
    expect(el.querySelector('[data-testid=evolution]')).toBeNull();
    TestBed.resetTestingModule();

    el = await afficher(donnees({ revenus: { ce_mois: 0, mois_precedent: 0, evolution_pourcentage: 0 } }));
    expect(el.querySelector('[data-testid=evolution]')).toBeNull();
    expect(el.textContent).not.toContain('arrow_');
    expect(el.textContent).not.toMatch(/%\s*vs/);
  });

  it('évolution à 0 avec des données : « 0 % », sans flèche', async () => {
    const el = await afficher(donnees({ revenus: { ce_mois: 100, mois_precedent: 100, evolution_pourcentage: 0 } }));
    const bloc = el.querySelector('[data-testid=evolution]');
    expect(bloc?.textContent?.replace(/\s+/g, ' ')).toContain('0 %');
    expect(bloc?.textContent).not.toContain('arrow_');
  });

  it('sélecteur Jour / Semaine / Mois : ne change que la carte des rendez-vous', async () => {
    const el = await afficher(donnees());
    const carte = () => el.querySelector('[data-carte=rendez-vous]')?.textContent?.replace(/\s+/g, ' ') ?? '';

    component.changerPeriode('jour');
    fixture.detectChanges();
    expect(component.rendezVous()).toBe(1);
    expect(carte()).toContain("aujourd'hui");

    component.changerPeriode('semaine');
    fixture.detectChanges();
    expect(component.rendezVous()).toBe(4);
    expect(carte()).toContain('cette semaine');

    expect(el.querySelector('[data-carte=chiffre-affaires]')?.textContent).toContain('154 000 FCFA');
    http.expectNone((r) => r.url.includes('statistiques')); // aucun rechargement : la période est locale
  });

  it('évolution des revenus : barres avec les mois en français', async () => {
    const el = await afficher(donnees());
    const bloc = el.querySelector('[data-bloc=revenus]');

    expect(el.querySelector('[data-testid=revenus-vide]')).toBeNull();
    expect(bloc?.textContent).toContain('août 2026');
    expect(bloc?.textContent).toContain('septembre 2026');
    expect(bloc?.querySelectorAll('div[title]').length).toBe(3);
  });

  it('revenus à 0 partout ou tendances vides : « Pas encore de données »', async () => {
    let el = await afficher(donnees({ tendances: [{ mois: '2026-10', label: 'Oct 2026', revenus: 0 }] }));
    expect(el.querySelector('[data-testid=revenus-vide]')?.textContent).toContain('Pas encore de données');
    TestBed.resetTestingModule();

    el = await afficher(donnees({ tendances: [] }));
    expect(el.querySelector('[data-testid=revenus-vide]')?.textContent).toContain('Pas encore de données');
  });

  it('distribution par âge : tranches non vides avec effectifs et pourcentages', async () => {
    const el = await afficher(donnees());
    const bloc = el.querySelector('[data-bloc=age]');

    expect(bloc).not.toBeNull();
    expect(bloc?.textContent).toContain('19 – 30 ans');
    expect(bloc?.textContent).toContain('60+ ans');
    expect(bloc?.textContent).not.toContain('31 – 45'); // tranche à 0 : non listée
    expect(component.segmentsAge().reduce((s, x) => s + x.total, 0)).toBe(9);
  });

  it('distribution par âge : bloc retiré quand l’API n’en renvoie pas ou que toutes les tranches valent 0', async () => {
    let el = await afficher(donnees({ patients: { total: 1, nouveaux_ce_mois: 0, tranches_age: { '0-18': 0, non_renseigne: 0 } } }));
    expect(el.querySelector('[data-bloc=age]')).toBeNull();
    TestBed.resetTestingModule();

    el = await afficher(donnees({ patients: { total: 1, nouveaux_ce_mois: 0 } }));
    expect(el.querySelector('[data-bloc=age]')).toBeNull();
  });

  it('chargement propre puis erreur : message du serveur ; 403 : « Accès refusé. »', async () => {
    TestBed.configureTestingModule({
      imports: [DashboardComptable],
      providers: [provideRouter([]), provideHttpClient(), provideHttpClientTesting()],
    });
    const auth = TestBed.inject(Auth);
    auth.simulerConnexion('proprietaire');
    vi.spyOn(auth, 'utilisateur').mockReturnValue({ ...auth.utilisateur()!, cabinetId: '1' });
    http = TestBed.inject(HttpTestingController);
    fixture = TestBed.createComponent(DashboardComptable);
    component = fixture.componentInstance;
    fixture.detectChanges();
    expect(component.chargement()).toBe(true);
    expect((fixture.nativeElement as HTMLElement).textContent).toContain('Chargement des statistiques');

    http.expectOne((r) => r.url.endsWith('/statistiques')).flush({ status: 'error', message: 'Erreur interne' }, { status: 500, statusText: 'Server Error' });
    expect(component.erreur()).toContain('Le serveur répond : Erreur interne');

    component.charger();
    http.expectOne((r) => r.url.endsWith('/statistiques')).flush({ status: 'error', message: 'Accès refusé' }, { status: 403, statusText: 'Forbidden' });
    expect(component.erreur()).toBe('Accès refusé.');
  });
});
