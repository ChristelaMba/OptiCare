import { ComponentFixture, TestBed } from '@angular/core/testing';
import { registerLocaleData } from '@angular/common';
import { provideRouter } from '@angular/router';
import localeFr from '@angular/common/locales/fr';

import { DashboardGlobal } from './dashboard-global';
import { SuperAdminDemo } from '../../../core/services/super-admin-demo';

registerLocaleData(localeFr);

/**
 * Le dashboard est alimenté par `SuperAdminDemo` (données de démonstration,
 * avec un `delay()` de 250 ms). On attend donc un court instant réel pour
 * laisser la donnée arriver, capturez dans les helpers existants du projet
 * (voir `historique-rdv.spec.ts`).
 */
const LATENCE_DEMO_MS = 320;

describe('DashboardGlobal', () => {
  let component: DashboardGlobal;
  let fixture: ComponentFixture<DashboardGlobal>;

  async function afficher(): Promise<HTMLElement> {
    TestBed.configureTestingModule({
      imports: [DashboardGlobal],
      providers: [provideRouter([])],
    });
    fixture = TestBed.createComponent(DashboardGlobal);
    component = fixture.componentInstance;
    fixture.detectChanges();
    await new Promise((r) => setTimeout(r, LATENCE_DEMO_MS));
    fixture.detectChanges();
    return fixture.nativeElement as HTMLElement;
  }

  it('should create', async () => {
    await afficher();
    expect(component).toBeTruthy();
  });

  it('affiche les 4 cartes KPI (cabinets, comptes, consultations, demandes en attente)', async () => {
    const el = await afficher();

    const kpis = el.querySelector('[data-testid=kpis]') as HTMLElement;
    const cartes = kpis.querySelectorAll('[data-carte]');
    expect(cartes.length).toBe(4);
    expect(kpis.querySelector('[data-carte=cabinets]')?.textContent).toContain('Cabinets enregistrés');
    expect(kpis.querySelector('[data-carte=comptes]')?.textContent).toContain('Comptes utilisateurs');
    expect(kpis.querySelector('[data-carte=consultations]')?.textContent).toContain('Consultations du mois');
    expect(kpis.querySelector('[data-carte=attente]')?.textContent).toContain('Demandes en attente');
  });

  it('la carte des comptes porte le décompte de démonstration (78) et sa ventilation', async () => {
    const el = await afficher();
    const texte = el.querySelector('[data-carte=comptes]')?.textContent?.replace(/\s+/g, ' ') ?? '';
    expect(texte).toContain(String(SuperAdminDemo.TOTAL_COMPTES));
    expect(texte).toContain('Patients');
    expect(texte).toContain('Super Admin');
  });

  it('la carte « Demandes en attente » renvoie vers la validation des cabinets', async () => {
    const el = await afficher();
    const lien = el.querySelector('[data-carte=attente]') as HTMLAnchorElement;
    expect(lien).toBeTruthy();
    expect(lien.getAttribute('href')).toBe('/cabinets/validation');
  });

  it('blocs graphiques : inscriptions, consultations, rôles et villes présents', async () => {
    const el = await afficher();
    expect(el.querySelector('[data-bloc=inscriptions]')).toBeTruthy();
    expect(el.querySelector('[data-bloc=consultations]')).toBeTruthy();
    expect(el.querySelector('[data-bloc=roles]')).toBeTruthy();
    expect(el.querySelector('[data-bloc=villes]')).toBeTruthy();
    expect(el.textContent).not.toMatch(/NaN|undefined|null/);
  });

  it('les 5 dernières activités et le lien vers le journal d’audit sont affichés', async () => {
    const el = await afficher();
    const bloc = el.querySelector('[data-bloc=activites]') as HTMLElement;
    expect(bloc.querySelectorAll('li').length).toBe(5);
    const lien = bloc.querySelector('a[href="/audit-logs"]');
    expect(lien).toBeTruthy();
  });

  it('indicateur de statut « Plateforme opérationnelle » une fois chargé', async () => {
    const el = await afficher();
    expect(el.textContent).toContain('Plateforme opérationnelle');
    expect(component.chargement()).toBe(false);
  });
});
