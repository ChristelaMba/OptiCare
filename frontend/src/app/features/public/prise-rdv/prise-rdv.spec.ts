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
});
