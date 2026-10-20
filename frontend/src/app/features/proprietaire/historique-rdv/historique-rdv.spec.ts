import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { registerLocaleData } from '@angular/common';
import localeFr from '@angular/common/locales/fr';

import { Auth } from '../../../core/services/auth';
import { HistoriqueRdv } from './historique-rdv';

registerLocaleData(localeFr);

const PATIENT_ALINE = { id: 46, nom: 'Nkeng', prenom: 'Aline', telephone: '+237600000201' };

function rdvBrut(id: number, date: string, heure: string, statut: string, extra: Record<string, unknown> = {}) {
  return {
    id,
    cabinet_id: 6,
    patient_id: 46,
    date: `${date}T00:00:00.000000Z`,
    heure_debut: heure,
    heure_fin: '10:30',
    motif: null,
    statut,
    source: 'en_ligne',
    visiteur_nom: null,
    visiteur_prenom: null,
    visiteur_telephone: null,
    patient: PATIENT_ALINE,
    ...extra,
  };
}

const ENVELOPPE = (rdvs: unknown[]) => ({ status: 'success', message: '', data: { rdvs } });

describe('HistoriqueRdv', () => {
  let component: HistoriqueRdv;
  let fixture: ComponentFixture<HistoriqueRdv>;
  let http: HttpTestingController;

  function afficher(): HTMLElement {
    TestBed.configureTestingModule({
      imports: [HistoriqueRdv],
      providers: [provideRouter([]), provideHttpClient(), provideHttpClientTesting()],
    });
    const auth = TestBed.inject(Auth);
    auth.simulerConnexion('proprietaire');
    http = TestBed.inject(HttpTestingController);
    fixture = TestBed.createComponent(HistoriqueRdv);
    component = fixture.componentInstance;
    fixture.detectChanges();
    return fixture.nativeElement as HTMLElement;
  }

  afterEach(() => {
    sessionStorage.clear();
    localStorage.clear();
  });

  it('appelle GET /cabinets/{id}/rdv sans paramètre date', () => {
    afficher();
    const req = http.expectOne((r) => r.url.endsWith('/cabinets/cab-004/rdv'));
    expect(req.request.method).toBe('GET');
    expect(req.request.params.keys()).toEqual([]);
    expect(req.request.url).not.toContain('rendezvous');
    req.flush(ENVELOPPE([]));
  });

  it('affiche patient, date, heure, statut et motif ; visiteur sans patient via visiteur_*', async () => {
    const el = afficher();
    http.expectOne((r) => r.url.endsWith('/rdv')).flush(
      ENVELOPPE([
        rdvBrut(175, '2026-10-27', '10:00', 'confirme', { motif: 'Controle de la vue' }),
        rdvBrut(177, '2026-10-28', '09:00', 'reserve', {
          patient: null,
          patient_id: null,
          source: 'visiteur',
          visiteur_nom: 'Biyong',
          visiteur_prenom: 'Marc',
          visiteur_telephone: '+237600000202',
        }),
      ]),
    );
    await fixture.whenStable();
    fixture.detectChanges();

    const texte = el.textContent ?? '';
    expect(texte).toContain('Aline Nkeng');
    expect(texte).toContain('Controle de la vue');
    expect(texte).toContain('Marc Biyong');
    expect(texte).toContain('Confirmé');
    expect(texte).toContain('En attente');
    expect(texte).toContain('09:00 - 10:30');
    // le plus récent d'abord
    expect(texte.indexOf('Marc Biyong')).toBeLessThan(texte.indexOf('Aline Nkeng'));
  });

  it("n'affiche ni colonne ni filtre « Opticien(ne) » (l'API ne renvoie pas d'opticien)", async () => {
    const el = afficher();
    http.expectOne((r) => r.url.endsWith('/rdv')).flush(ENVELOPPE([rdvBrut(175, '2026-10-27', '10:00', 'confirme')]));
    await fixture.whenStable();
    fixture.detectChanges();

    expect(el.textContent).not.toContain('Opticien');
    expect(el.querySelectorAll('thead th').length).toBe(4);
  });

  it('état vide : message dédié quand le cabinet n’a aucun rendez-vous', async () => {
    const el = afficher();
    http.expectOne((r) => r.url.endsWith('/rdv')).flush(ENVELOPPE([]));
    await fixture.whenStable();
    fixture.detectChanges();

    expect(el.textContent).toContain('Aucun rendez-vous pour ce cabinet pour l');
    expect(el.textContent).not.toContain('Aucun rendez-vous ne correspond');
  });

  it('erreur serveur : le message du serveur est affiché', async () => {
    const el = afficher();
    http.expectOne((r) => r.url.endsWith('/rdv')).flush(
      { status: 'error', message: 'Erreur interne' },
      { status: 500, statusText: 'Server Error' },
    );
    await fixture.whenStable();
    fixture.detectChanges();

    expect(component.erreur()).toContain('Le serveur répond : Erreur interne');
    expect(el.textContent).toContain('Le serveur répond : Erreur interne');
  });

  it('erreur 403 : « Accès refusé. »', () => {
    afficher();
    http.expectOne((r) => r.url.endsWith('/rdv')).flush({ status: 'error', message: 'Accès refusé' }, { status: 403, statusText: 'Forbidden' });
    expect(component.erreur()).toBe('Accès refusé.');
  });

  it('le CSV exporte uniquement les lignes affichées (filtre statut), sans colonne opticien', async () => {
    afficher();
    http.expectOne((r) => r.url.endsWith('/rdv')).flush(
      ENVELOPPE([rdvBrut(175, '2026-10-27', '10:00', 'confirme'), rdvBrut(177, '2026-10-28', '09:00', 'reserve')]),
    );
    component.filtreStatut.set('reserve');

    let contenu = '';
    const creer = vi.spyOn(URL, 'createObjectURL').mockImplementation((blob: Blob | MediaSource) => {
      void (blob as Blob).text().then((t) => (contenu = t));
      return 'blob:test';
    });
    vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => undefined);
    vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => undefined);

    component.exporterCsv();
    await new Promise((r) => setTimeout(r, 0));

    expect(creer).toHaveBeenCalled();
    const lignes = contenu.replace('﻿', '').split('\n');
    expect(lignes.length).toBe(2);
    expect(lignes[0]).not.toContain('Opticien');
    expect(lignes[1]).toContain('28/10/2026');
    expect(lignes[1]).toContain('En attente');
  });

  it('le sous-titre dit « passés et à venir » (la liste contient aussi les rendez-vous à venir)', async () => {
    const el = afficher();
    http.expectOne((r) => r.url.endsWith('/rdv')).flush(ENVELOPPE([]));
    await fixture.whenStable();
    fixture.detectChanges();

    expect(el.textContent).toContain('passés et à venir');
    expect(el.textContent).not.toContain('rendez-vous passés de la clinique');
  });
});
