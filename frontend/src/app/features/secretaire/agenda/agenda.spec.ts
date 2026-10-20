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

  describe('confirmation avant annulation, honoré, absent', () => {
    async function ouvrir(statut: string): Promise<HTMLElement> {
      charger([rdvBrut(175, '2026-10-27', '10:00', statut)]);
      component.dateActuelle.set(new Date(2026, 9, 27));
      component.ouvrirDetails(component.rendezVous()[0]);
      fixture.detectChanges();
      return fixture.nativeElement as HTMLElement;
    }

    it('« Annuler » ouvre « Voulez-vous vraiment annuler ce rendez-vous ? » : aucun appel API avant la confirmation', async () => {
      const el = await ouvrir('confirme');

      component.demanderAnnulation();
      fixture.detectChanges();

      http.expectNone((r) => r.method === 'PUT');
      const boite = el.querySelector('[role=alertdialog]');
      expect(boite?.textContent).toContain('Voulez-vous vraiment annuler ce rendez-vous ?');
      const boutons = Array.from(boite?.querySelectorAll('button') ?? []).map((b) => b.textContent?.trim());
      expect(boutons).toEqual(['Garder', 'Annuler le rendez-vous']);
    });

    it('« Garder » : la fenêtre se ferme, aucun appel, le statut ne change pas', async () => {
      const el = await ouvrir('confirme');
      component.demanderAnnulation();
      fixture.detectChanges();

      const garder = Array.from(el.querySelectorAll('[role=alertdialog] button')).find((b) => b.textContent?.trim() === 'Garder') as HTMLButtonElement;
      garder.click();
      fixture.detectChanges();

      http.expectNone((r) => r.method === 'PUT');
      expect(el.querySelector('[role=alertdialog]')).toBeNull();
      expect(component.rendezVous()[0].statut).toBe('confirme');
    });

    it('« Annuler le rendez-vous » : PUT /rdv/{id}/annuler seulement à ce moment', async () => {
      await ouvrir('confirme');
      component.demanderAnnulation();
      component.confirmerAction();

      const req = http.expectOne((r) => r.method === 'PUT' && r.url.endsWith('/rdv/175/annuler'));
      req.flush({ status: 'success', message: '', data: { rdv: rdvBrut(175, '2026-10-27', '10:00', 'annule') } });
      expect(component.rendezVous()[0].statut).toBe('annule');
      expect(component.confirmation()).toBeNull();
    });

    it('« Marquer honoré » et « Marquer absent » demandent aussi une confirmation', async () => {
      await ouvrir('confirme');

      component.demanderHonore();
      http.expectNone((r) => r.method === 'PUT');
      component.refuserConfirmation();

      component.demanderAbsent();
      http.expectNone((r) => r.method === 'PUT');
      component.confirmerAction();
      http.expectOne((r) => r.method === 'PUT' && r.url.endsWith('/rdv/175/non-honore')).flush({
        status: 'success', message: '', data: { rdv: rdvBrut(175, '2026-10-27', '10:00', 'non_honore') },
      });
      expect(component.rendezVous()[0].statut).toBe('non_honore');
    });

    it('les boutons de la fenêtre de détails ouvrent la confirmation (jamais d’appel direct)', async () => {
      const el = await ouvrir('confirme');
      const boutons = Array.from(el.querySelectorAll('.modal-actions button'));
      const annuler = boutons.find((b) => b.textContent?.includes('Annuler')) as HTMLButtonElement;
      annuler.click();
      fixture.detectChanges();

      http.expectNone((r) => r.method === 'PUT');
      expect(component.confirmation()).toBe('annuler');
    });
  });

  describe('statut : une seule couleur par statut', () => {
    it('le badge de la fenêtre de détails porte la même classe de statut que la carte de la liste', () => {
      for (const [statut, classe] of [['annule', 'status-cancelled'], ['reserve', 'status-pending'], ['confirme', 'status-confirmed'], ['termine', 'status-completed'], ['non_honore', 'status-noshow']] as const) {
        TestBed.resetTestingModule();
        charger([rdvBrut(175, '2026-10-27', '10:00', statut)]);
        component.dateActuelle.set(new Date(2026, 9, 27));
        component.ouvrirDetails(component.rendezVous()[0]);
        fixture.detectChanges();
        const el = fixture.nativeElement as HTMLElement;

        expect(el.querySelector('article.appointment-card')?.classList.contains(classe)).toBe(true);
        expect(el.querySelector('.details-grid .status-badge')?.classList.contains(classe)).toBe(true);
      }
    });
  });

  describe('vue Semaine', () => {
    function semaine(): HTMLElement {
      charger([
        rdvBrut(1, '2026-11-09', '09:00', 'confirme'), // lundi
        rdvBrut(2, '2026-11-12', '14:00', 'reserve'), // jeudi
        rdvBrut(3, '2026-11-12', '08:30', 'annule'), // jeudi, plus tôt
        rdvBrut(4, '2026-11-16', '10:00', 'confirme'), // lundi suivant : hors semaine
      ]);
      component.dateActuelle.set(new Date(2026, 10, 12)); // jeudi 12 novembre
      component.changerVue('semaine');
      fixture.detectChanges();
      return fixture.nativeElement as HTMLElement;
    }

    it('7 jours à partir du lundi de la date affichée, rendez-vous regroupés par jour et triés par heure', () => {
      semaine();

      const jours = component.semaine();
      expect(jours.length).toBe(7);
      expect(jours[0].cle).toBe('2026-11-09');
      expect(jours[6].cle).toBe('2026-11-15');
      expect(jours[0].rdvs.map((r) => r.id)).toEqual(['1']);
      expect(jours[3].rdvs.map((r) => r.id)).toEqual(['3', '2']);
      expect(component.rendezVousAffiches().map((r) => r.id)).toEqual(['1', '3', '2']);
    });

    it('titre adapté, plage de dates, jours listés, statistiques de la semaine', () => {
      const el = semaine();
      const texte = el.textContent ?? '';

      expect(component.dateFormatee()).toBe('Semaine du 9 novembre au 15 novembre 2026');
      expect(texte).toContain('Rendez-vous de la semaine');
      expect(el.querySelectorAll('.week-day').length).toBe(7);
      expect(texte).toContain('jeudi 12 novembre');
      expect(el.querySelectorAll('article.appointment-card').length).toBe(3);
      expect(component.nombreConfirmes()).toBe(1);
      expect(component.nombreAttente()).toBe(1);
      expect(component.nombreAnnules()).toBe(1);
    });

    it('navigation par semaine (±7 jours) et retour à la vue Jour', () => {
      semaine();
      component.changerJour(1);
      expect(component.dateFormatee()).toBe('Semaine du 16 novembre au 22 novembre 2026');
      expect(component.rendezVousAffiches().map((r) => r.id)).toEqual(['4']);

      component.changerJour(-2);
      expect(component.dateFormatee()).toContain('Semaine du 2 novembre');

      component.changerVue('jour');
      expect(component.dateFormatee()).toContain('novembre 2026');
      expect(component.dateFormatee()).not.toContain('Semaine');
    });

    it('semaine vide : « Aucun rendez-vous » par jour, sans grand encart en bas ; la vue Jour garde son encart', () => {
      charger([]);
      component.changerVue('semaine');
      fixture.detectChanges();
      const el = fixture.nativeElement as HTMLElement;

      expect(el.querySelectorAll('.week-empty').length).toBe(7);
      expect(el.querySelector('.empty-agenda')).toBeNull();
      expect(el.textContent).not.toContain("Aucun rendez-vous n'est programmé");

      component.changerVue('jour');
      fixture.detectChanges();
      expect(el.querySelector('.empty-agenda')?.textContent).toContain("Aucun rendez-vous n'est programmé pour cette journée.");
      expect(el.querySelectorAll('.week-empty').length).toBe(0);
    });

    it('la fenêtre de détails affiche la date du rendez-vous, pas celle du jour affiché', () => {
      const el = semaine();
      component.ouvrirDetails(component.semaine()[0].rdvs[0]);
      fixture.detectChanges();

      expect(el.querySelector('.details-grid')?.textContent).toContain('lundi 9 novembre 2026');
    });

    it('semaine commençant un dimanche : le lundi précédent est pris', () => {
      charger([]);
      component.dateActuelle.set(new Date(2026, 10, 15)); // dimanche
      component.changerVue('semaine');
      expect(component.semaine()[0].cle).toBe('2026-11-09');
    });
  });
});
