import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideHttpClient } from '@angular/common/http';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';

import { Auth } from '../../../core/services/auth';
import { cleDate } from '../../../core/utils/periode-filtre';
import { FacturesProprietaire } from './factures';

/** Dates relatives à « aujourd'hui » : robustes quel que soit le jour d'exécution des tests. */
const AUJOURDHUI = cleDate(new Date());
const ANCIENNE = cleDate(new Date(new Date().getFullYear(), 0, 1));

/** Forme réelle : montants en chaînes avec décimales, patient imbriqué (facture 88). */
const FACTURES = [
  {
    id: 88,
    numero: 'FAC-2026-00088',
    commande_id: 65,
    patient_id: 46,
    type: 'acompte',
    montant: '20000.00',
    montant_paye: '10000.00',
    solde_restant: 10000,
    statut: 'partiel',
    date_emission: `${AUJOURDHUI}T00:00:00.000000Z`,
    patient: { id: 46, nom: 'Nkeng', prenom: 'Aline' },
  },
  {
    id: 89,
    numero: 'FAC-2026-00089',
    commande_id: 66,
    patient_id: 47,
    type: 'unique',
    montant: '5000.00',
    montant_paye: '0.00',
    solde_restant: 5000,
    statut: 'impaye',
    date_emission: `${ANCIENNE}T00:00:00.000000Z`,
    patient: { id: 47, nom: 'Biyong', prenom: 'Marc' },
  },
];

const ENVELOPPE = (factures: unknown[]) => ({ status: 'success', message: '', data: { factures } });

describe('FacturesProprietaire', () => {
  let component: FacturesProprietaire;
  let fixture: ComponentFixture<FacturesProprietaire>;
  let http: HttpTestingController;

  function afficher(): HTMLElement {
    TestBed.configureTestingModule({
      imports: [FacturesProprietaire],
      providers: [provideRouter([]), provideHttpClient(), provideHttpClientTesting()],
    });
    const auth = TestBed.inject(Auth);
    auth.simulerConnexion('proprietaire');
    http = TestBed.inject(HttpTestingController);
    fixture = TestBed.createComponent(FacturesProprietaire);
    component = fixture.componentInstance;
    fixture.detectChanges();
    return fixture.nativeElement as HTMLElement;
  }

  afterEach(() => {
    http.verify();
    sessionStorage.clear();
    localStorage.clear();
  });

  it('appelle GET /cabinets/{id}/factures sans filtre au départ', () => {
    afficher();
    const req = http.expectOne((r) => r.url.endsWith('/cabinets/cab-004/factures'));
    expect(req.request.method).toBe('GET');
    expect(req.request.params.keys()).toEqual([]);
    req.flush(ENVELOPPE([]));
  });

  it('affiche le détail : numéro, patient, montant, payé, solde et statut', async () => {
    const el = afficher();
    http.expectOne((r) => r.url.endsWith('/factures')).flush(ENVELOPPE(FACTURES));
    await fixture.whenStable();
    fixture.detectChanges();

    const texte = el.textContent ?? '';
    expect(texte).toContain('FAC-2026-00088');
    expect(texte).toContain('Aline Nkeng');
    expect(texte).toContain('20 000 FCFA');
    expect(texte).toContain('10 000 FCFA');
    expect(texte).toContain('Partielle');
    expect(texte).toContain('Impayée');
    // la plus récente d'abord (id décroissant)
    expect(texte.indexOf('FAC-2026-00089')).toBeLessThan(texte.indexOf('FAC-2026-00088'));
  });

  it('calcule la synthèse : total facturé, encaissé et en attente', async () => {
    afficher();
    http.expectOne((r) => r.url.endsWith('/factures')).flush(ENVELOPPE(FACTURES));
    await fixture.whenStable();

    expect(component.totalFacture()).toBe(25000);
    expect(component.totalEncaisse()).toBe(10000);
    expect(component.totalEnAttente()).toBe(15000);
  });

  it('exclut les factures annulées de la synthèse', async () => {
    afficher();
    http
      .expectOne((r) => r.url.endsWith('/factures'))
      .flush(
        ENVELOPPE([
          ...FACTURES,
          {
            id: 90,
            numero: 'FAC-2026-00090',
            commande_id: 67,
            patient_id: 46,
            type: 'unique',
            montant: '4000.00',
            montant_paye: '0.00',
            solde_restant: 4000,
            statut: 'annule',
            patient: null,
            date_emission: `${AUJOURDHUI}T00:00:00.000000Z`,
          },
        ]),
      );
    await fixture.whenStable();

    expect(component.totalFacture()).toBe(25000);
    expect(component.totalEnAttente()).toBe(15000);
  });

  it('le filtre statut est délégué au serveur', async () => {
    afficher();
    http.expectOne((r) => r.url.endsWith('/factures')).flush(ENVELOPPE(FACTURES));
    await fixture.whenStable();

    component.filtrerStatut('impaye');
    const req = http.expectOne((r) => r.url.endsWith('/factures'));
    expect(req.request.params.get('statut')).toBe('impaye');
    req.flush(ENVELOPPE([FACTURES[1]]));
    await fixture.whenStable();

    expect(component.factures().length).toBe(1);
  });

  it('ne propose aucune action d’écriture (ni création, ni paiement)', async () => {
    const el = afficher();
    http.expectOne((r) => r.url.endsWith('/factures')).flush(ENVELOPPE(FACTURES));
    await fixture.whenStable();
    fixture.detectChanges();

    const texte = el.textContent ?? '';
    expect(texte).not.toContain('Nouvelle facture');
    expect(texte).not.toContain('Enregistrer un paiement');
    expect(el.querySelector('form')).toBeNull();
  });

  it('état vide : message dédié quand le cabinet n’a aucune facture', async () => {
    const el = afficher();
    http.expectOne((r) => r.url.endsWith('/factures')).flush(ENVELOPPE([]));
    await fixture.whenStable();
    fixture.detectChanges();

    expect(el.textContent).toContain('Aucune facture pour ce cabinet pour l’instant');
  });

  it('erreur 403 : « Accès refusé. »', async () => {
    const el = afficher();
    http
      .expectOne((r) => r.url.endsWith('/factures'))
      .flush({ status: 'error', message: 'Accès refusé' }, { status: 403, statusText: 'Forbidden' });
    await fixture.whenStable();
    fixture.detectChanges();

    expect(component.erreur()).toBe('Accès refusé.');
    expect(el.textContent).toContain('Accès refusé.');
  });

  describe('filtres de période sur la date d’émission (côté navigateur)', () => {
    it('« Ce mois » restreint la liste sans nouvel appel serveur', async () => {
      afficher();
      http.expectOne((r) => r.url.endsWith('/factures')).flush(ENVELOPPE(FACTURES));
      await fixture.whenStable();

      component.changerMode('mois');
      http.expectNone((r) => r.url.endsWith('/factures'));
      // FAC-88 est émise aujourd'hui (dans le mois courant), FAC-89 en janvier : une seule reste.
      expect(component.facturesAffichees().length).toBe(1);
      expect(component.totalFacture()).toBe(20000);
      expect(component.totalEnAttente()).toBe(10000);
    });

    it('« Cette année » garde les deux factures de l’année', async () => {
      afficher();
      http.expectOne((r) => r.url.endsWith('/factures')).flush(ENVELOPPE(FACTURES));
      await fixture.whenStable();

      component.changerMode('annee');
      expect(component.facturesAffichees().length).toBe(2);
    });

    it('date précise : une seule journée', async () => {
      afficher();
      http.expectOne((r) => r.url.endsWith('/factures')).flush(ENVELOPPE(FACTURES));
      await fixture.whenStable();

      component.changerMode('date');
      component.datePrecise.set(ANCIENNE);
      expect(component.facturesAffichees().length).toBe(1);
      expect(component.facturesAffichees()[0].numero).toBe('FAC-2026-00089');
    });

    it('plage de dates : bornes inclusives, saisie à l’envers remise dans l’ordre', async () => {
      afficher();
      http.expectOne((r) => r.url.endsWith('/factures')).flush(ENVELOPPE(FACTURES));
      await fixture.whenStable();

      component.changerMode('plage');
      component.debutPlage.set(ANCIENNE);
      component.finPlage.set(AUJOURDHUI);
      expect(component.facturesAffichees().length).toBe(2);

      // Inversée, la plage donne le même résultat.
      component.debutPlage.set(AUJOURDHUI);
      component.finPlage.set(ANCIENNE);
      expect(component.facturesAffichees().length).toBe(2);
    });

    it('plage incomplète : aucun blocage, la liste reste entière', async () => {
      afficher();
      http.expectOne((r) => r.url.endsWith('/factures')).flush(ENVELOPPE(FACTURES));
      await fixture.whenStable();

      component.changerMode('plage');
      component.debutPlage.set(ANCIENNE);
      expect(component.bornes()).toBeNull();
      expect(component.facturesAffichees().length).toBe(2);
    });

    it('le libellé de période figure sur les cartes', async () => {
      const el = afficher();
      http.expectOne((r) => r.url.endsWith('/factures')).flush(ENVELOPPE(FACTURES));
      await fixture.whenStable();
      fixture.detectChanges();

      component.changerMode('mois');
      fixture.detectChanges();
      expect(el.querySelector('[data-carte="total-facture"]')?.textContent).toContain('Ce mois');
    });

    it('réinitialiser les filtres remet la période sur « tous »', async () => {
      afficher();
      http.expectOne((r) => r.url.endsWith('/factures')).flush(ENVELOPPE(FACTURES));
      await fixture.whenStable();

      component.changerMode('mois');
      component.reinitialiserFiltres();
      http.expectOne((r) => r.url.endsWith('/factures')).flush(ENVELOPPE(FACTURES));
      await fixture.whenStable();

      expect(component.modePeriode()).toBe('tous');
      expect(component.bornes()).toBeNull();
      expect(component.facturesAffichees().length).toBe(2);
    });
  });
});
