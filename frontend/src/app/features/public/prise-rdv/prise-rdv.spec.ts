import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';

import { PriseRdv } from './prise-rdv';

describe('PriseRdv', () => {
  let component: PriseRdv;
  let fixture: ComponentFixture<PriseRdv>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PriseRdv],
      providers: [provideRouter([]), provideHttpClient(), provideHttpClientTesting()],
    }).compileComponents();

    fixture = TestBed.createComponent(PriseRdv);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  const JOUR = {
    jour: 22,
    dateComplete: new Date(2026, 9, 22),
    disponible: true,
    horsMois: false,
    estAujourdhui: false,
  };

  it('aucun créneau réel : repli sur la liste locale, marquée indicative', () => {
    const http = TestBed.inject(HttpTestingController);
    component.cabinetId = '8';

    component.selectionnerJour(JOUR);

    const req = http.expectOne((r) => r.url.endsWith('/cabinets/8/slots'));
    expect(req.request.params.get('date')).toBe('2026-10-22');
    req.flush({ status: 'success', message: '', data: { date: '2026-10-22', slots: [] } });

    expect(component.creneauxIndicatifs()).toBe(true);
    expect(component.creneaux()).toContain('09:00');
  });

  it('créneaux réels : ils remplacent la liste locale, les indisponibles sont désactivés', () => {
    const http = TestBed.inject(HttpTestingController);
    component.cabinetId = '8';

    component.selectionnerJour(JOUR);

    http.expectOne((r) => r.url.endsWith('/cabinets/8/slots')).flush({
      status: 'success',
      message: '',
      data: {
        date: '2026-10-22',
        slots: [
          { heure_debut: '08:00', heure_fin: '08:30', disponible: true, est_dans_pause: false, est_reserve: false },
          { heure_debut: '08:30', heure_fin: '09:00', disponible: false, est_dans_pause: false, est_reserve: true },
        ],
      },
    });

    expect(component.creneauxIndicatifs()).toBe(false);
    expect(component.creneaux()).toEqual(['08:00', '08:30']);
    expect(component.creneauxIndisponibles()).toEqual(['08:30']);
  });

  it('erreur serveur sur les créneaux : repli sur la liste locale indicative', () => {
    const http = TestBed.inject(HttpTestingController);
    component.cabinetId = '8';

    component.selectionnerJour(JOUR);

    http.expectOne((r) => r.url.endsWith('/cabinets/8/slots')).flush('boom', { status: 500, statusText: 'Server Error' });

    expect(component.creneauxIndicatifs()).toBe(true);
    expect(component.chargementCreneaux()).toBe(false);
  });

  function preparerReservation(): void {
    component.cabinetId = '10';
    component.dateSelectionnee = new Date(2026, 9, 29);
    component.heureSelectionnee = '11:00';
    component.form.patchValue({
      nomComplet: 'Marc Biyong',
      telephone: '+237600000202',
      accepteConditions: true,
    });
  }

  const MESSAGES_422 = [
    'Ce créneau est déjà réservé.',
    "Aucune plage horaire active pour ce créneau. Le cabinet n'accepte pas de RDV à cette heure.",
    'Le numéro de téléphone est obligatoire pour un visiteur.',
  ];

  for (const message of MESSAGES_422) {
    it(`422 « ${message.slice(0, 40)}… » : le message du serveur est affiché tel quel`, () => {
      const http = TestBed.inject(HttpTestingController);
      preparerReservation();

      component.confirmerRendezVous();
      http.expectOne((r) => r.url.endsWith('/rdv') && r.method === 'POST').flush(
        { status: 'error', message: 'Erreur lors de la prise de RDV', errors: { general: message } },
        { status: 422, statusText: 'Unprocessable Entity' },
      );

      expect(component.erreurSoumission()).toBe(message);
      expect(component.reservationConfirmee()).toBe(false);
      expect(component.enSoumission()).toBe(false);

      // le créneau pris est re-demandé au serveur (liste rafraîchie), sans créer de rendez-vous
      http.expectOne((r) => r.url.endsWith('/cabinets/10/slots')).flush({
        status: 'success',
        message: '',
        data: { date: '2026-10-29', slots: [] },
      });
      expect(component.heureSelectionnee).toBe('');
    });
  }

  it('403 : « Accès refusé. »', () => {
    const http = TestBed.inject(HttpTestingController);
    preparerReservation();

    component.confirmerRendezVous();
    http.expectOne((r) => r.url.endsWith('/rdv') && r.method === 'POST').flush(
      { status: 'error', message: 'Accès refusé' },
      { status: 403, statusText: 'Forbidden' },
    );

    expect(component.erreurSoumission()).toBe('Accès refusé.');
  });

  it('erreur sans détail (500) : message générique', () => {
    const http = TestBed.inject(HttpTestingController);
    preparerReservation();

    component.confirmerRendezVous();
    http.expectOne((r) => r.url.endsWith('/rdv') && r.method === 'POST').flush('boom', { status: 500, statusText: 'Server Error' });

    expect(component.erreurSoumission()).toContain("Impossible d'enregistrer votre rendez-vous");
  });
});
