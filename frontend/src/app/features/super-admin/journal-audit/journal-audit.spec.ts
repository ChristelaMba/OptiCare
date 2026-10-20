import { ComponentFixture, TestBed } from '@angular/core/testing';
import { registerLocaleData } from '@angular/common';
import { provideRouter } from '@angular/router';
import localeFr from '@angular/common/locales/fr';

import { JournalAudit } from './journal-audit';

registerLocaleData(localeFr);

/** `SuperAdminDemo` applique un `delay()` de 250 ms : on attend un peu plus. */
const LATENCE_DEMO_MS = 320;

describe('JournalAudit', () => {
  let component: JournalAudit;
  let fixture: ComponentFixture<JournalAudit>;

  async function afficher(): Promise<HTMLElement> {
    TestBed.configureTestingModule({
      imports: [JournalAudit],
      providers: [provideRouter([])],
    });
    fixture = TestBed.createComponent(JournalAudit);
    component = fixture.componentInstance;
    fixture.detectChanges();
    await new Promise((r) => setTimeout(r, LATENCE_DEMO_MS));
    fixture.detectChanges();
    return fixture.nativeElement as HTMLElement;
  }

  const lignes = (el: HTMLElement) => Array.from(el.querySelectorAll('tbody tr'));

  it('should create', async () => {
    await afficher();
    expect(component).toBeTruthy();
  });

  it('affiche les colonnes horodatage, utilisateur, action, ressource, IP, sévérité', async () => {
    const el = await afficher();

    const entetes = Array.from(el.querySelectorAll('thead th')).map((th) => th.textContent?.trim());
    expect(entetes).toEqual(['Horodatage', 'Utilisateur', 'Action', 'Ressource', 'Adresse IP', 'Sévérité']);

    expect(lignes(el).length).toBeGreaterThan(0);
    expect(el.textContent).toContain('Adresse IP');
    expect(el.textContent).not.toMatch(/NaN|undefined|null/);
  });

  it('le compteur d’événements critiques est calculé', async () => {
    const el = await afficher();
    expect(component.totalCritiques()).toBeGreaterThan(0);
    expect(el.textContent).toContain('Critiques');
  });

  it('filtre par sévérité', async () => {
    await afficher();

    component.filtreSeverite.set('critique');
    fixture.detectChanges();

    const restants = component.evenementsPage();
    expect(restants.length).toBeGreaterThan(0);
    expect(restants.every((e) => e.severite === 'critique')).toBe(true);
  });

  it('filtre par type d’événement', async () => {
    await afficher();

    component.filtreType.set('connexion');
    fixture.detectChanges();

    const restants = component.evenementsPage();
    expect(restants.length).toBeGreaterThan(0);
    expect(restants.every((e) => e.type === 'connexion')).toBe(true);
  });

  it('filtre par date (bornes du et au)', async () => {
    await afficher();

    component.dateDebut.set('2026-10-19');
    component.dateFin.set('2026-10-19');
    fixture.detectChanges();

    const restants = component.evenementsPage();
    expect(restants.length).toBeGreaterThan(0);
    expect(restants.every((e) => {
      const t = e.horodatage.getTime();
      return t >= new Date('2026-10-19T00:00:00').getTime() && t <= new Date('2026-10-19T23:59:59').getTime();
    })).toBe(true);
  });

  it('recherche libre (texte vide puis filtre actif)', async () => {
    const el = await afficher();

    component.texteRecherche.set('zzz-introuvable');
    fixture.detectChanges();
    expect(lignes(el)[0].textContent).toContain('Aucun événement ne correspond');

    component.reinitialiserFiltres();
    fixture.detectChanges();
    expect(component.filtreActif()).toBe(false);
    expect(component.totalResultats()).toBe(component.totalEvenements());
  });
});
