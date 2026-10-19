import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';

import { Auth } from '../../../core/services/auth';
import { Agenda } from './agenda';

function rdvBrut(id: number, date: string, heure: string, statut: string, extra: Record<string, unknown> = {}) {
  return {
    id,
    cabinet_id: 6,
    patient_id: 46,
    date: `${date}T00:00:00.000000Z`,
    heure_debut: heure,
    heure_fin: '10:30',
    motif: 'Controle',
    statut,
    source: 'en_ligne',
    patient: { id: 46, nom: 'Nkeng', prenom: 'Aline', telephone: '+237600000201' },
    ...extra,
  };
}

const ENVELOPPE = (rdvs: unknown[]) => ({ status: 'success', message: '', data: { rdvs } });

describe('Agenda', () => {
  let component: Agenda;
  let fixture: ComponentFixture<Agenda>;
  let http: HttpTestingController;

  function creer(): void {
    TestBed.configureTestingModule({ imports: [Agenda], providers: [provideHttpClient(), provideHttpClientTesting()] });
    TestBed.inject(Auth).simulerConnexion('secretaire');
    http = TestBed.inject(HttpTestingController);
    fixture = TestBed.createComponent(Agenda);
    component = fixture.componentInstance;
    fixture.detectChanges();
  }

  function charger(rdvs: unknown[]): void {
    creer();
    http.expectOne((r) => r.url.endsWith('/cabinets/cab-004/rdv')).flush(ENVELOPPE(rdvs));
  }

  afterEach(() => {
    sessionStorage.clear();
    localStorage.clear();
  });

  it('charge GET /cabinets/{id}/rdv (plus /rendezvous) et filtre le jour affiché dans le navigateur', () => {
    creer();
    const req = http.expectOne((r) => r.url.endsWith('/cabinets/cab-004/rdv'));
    expect(req.request.params.keys()).toEqual([]);
    req.flush(ENVELOPPE([rdvBrut(175, '2026-10-27', '10:00', 'confirme'), rdvBrut(177, '2026-10-28', '09:00', 'reserve')]));

    component.dateActuelle.set(new Date(2026, 9, 27));
    expect(component.rendezVous().map((r) => r.id)).toEqual(['175']);
    expect(component.nombreConfirmes()).toBe(1);

    component.dateActuelle.set(new Date(2026, 9, 28));
    expect(component.rendezVous().map((r) => r.id)).toEqual(['177']);
    expect(component.nombreAttente()).toBe(1);
    expect(component.nomAffiche(component.rendezVous()[0])).toBe('Aline Nkeng');
  });

  const ACTIONS: [string, () => void, string, string][] = [
    ['confirmer', () => component.confirmerRendezVous(), 'reserve', 'confirme'],
    ['terminer', () => component.marquerHonore(), 'confirme', 'termine'],
    ['non-honore', () => component.marquerAbsent(), 'confirme', 'non_honore'],
    ['annuler', () => component.annulerRendezVous(), 'confirme', 'annule'],
  ];

  for (const [route, declencher, depart, arrivee] of ACTIONS) {
    it(`action « ${arrivee} » : PUT /rdv/{id}/${route}, jamais PATCH /rendezvous`, () => {
      charger([rdvBrut(175, '2026-10-27', '10:00', depart)]);
      component.dateActuelle.set(new Date(2026, 9, 27));
      component.ouvrirDetails(component.rendezVous()[0]);

      declencher();
      const req = http.expectOne((r) => r.url.endsWith(`/rdv/175/${route}`));
      expect(req.request.method).toBe('PUT');
      req.flush({ status: 'success', message: '', data: { rdv: rdvBrut(175, '2026-10-27', '10:00', arrivee) } });

      expect(component.rendezVousActif()?.statut).toBe(arrivee);
      expect(component.rendezVous()[0].statut).toBe(arrivee);
      expect(component.erreurAction()).toBeNull();
      http.verify();
    });
  }

  it('422 : errors.rdv[0] du serveur affiché, le statut local ne change pas', () => {
    charger([rdvBrut(175, '2026-10-27', '10:00', 'confirme')]);
    component.dateActuelle.set(new Date(2026, 9, 27));
    component.ouvrirDetails(component.rendezVous()[0]);

    component.annulerRendezVous();
    http.expectOne((r) => r.url.endsWith('/rdv/175/annuler')).flush(
      { status: 'error', message: 'Action impossible', errors: { rdv: ['Ce RDV est déjà annulé.'] } },
      { status: 422, statusText: 'Unprocessable Entity' },
    );

    expect(component.erreurAction()).toBe('Ce RDV est déjà annulé.');
    expect(component.rendezVous()[0].statut).toBe('confirme');
    expect(component.erreur()).toBeNull();
    expect(component.actionEnCours()).toBe(false);
  });

  it('403 : « Accès refusé. »', () => {
    charger([rdvBrut(175, '2026-10-27', '10:00', 'reserve')]);
    component.dateActuelle.set(new Date(2026, 9, 27));
    component.ouvrirDetails(component.rendezVous()[0]);

    component.confirmerRendezVous();
    http.expectOne((r) => r.url.endsWith('/rdv/175/confirmer')).flush(
      { status: 'error', message: 'Accès refusé' },
      { status: 403, statusText: 'Forbidden' },
    );

    expect(component.erreurAction()).toBe('Accès refusé.');
  });

  it('erreur de chargement : le message du serveur est affiché', () => {
    creer();
    http.expectOne((r) => r.url.endsWith('/rdv')).flush({ status: 'error', message: 'Erreur interne' }, { status: 500, statusText: 'Server Error' });

    expect(component.erreur()).toContain('Le serveur répond : Erreur interne');
    expect(component.chargement()).toBe(false);
  });
});
