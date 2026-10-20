import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideHttpClient } from '@angular/common/http';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';

import { Auth } from '../../../core/services/auth';
import { cleDate } from '../../../core/utils/periode-filtre';
import { PatientsCabinetProprietaire } from './patients-cabinet';

/** Dates relatives à « aujourd'hui » : robustes quel que soit le jour d'exécution des tests. */
const AUJOURDHUI = cleDate(new Date());
const IL_Y_A_UN_AN = cleDate(new Date(new Date().getFullYear(), 0, 1));

const PATIENTS = [
  { id: 46, nom: 'Nkeng', prenom: 'Aline', telephone: '+237600000201', email: null, ville: 'Douala', created_at: `${AUJOURDHUI}T00:00:00.000000Z` },
  { id: 47, nom: 'Biyong', prenom: 'Marc', telephone: '+237600000202', email: 'marc@exemple.cm', ville: null, created_at: `${IL_Y_A_UN_AN}T00:00:00.000000Z` },
];

const ENVELOPPE = (patients: unknown[]) => ({ status: 'success', message: '', data: { patients } });

describe('PatientsCabinetProprietaire', () => {
  let component: PatientsCabinetProprietaire;
  let fixture: ComponentFixture<PatientsCabinetProprietaire>;
  let http: HttpTestingController;

  function afficher(): HTMLElement {
    TestBed.configureTestingModule({
      imports: [PatientsCabinetProprietaire],
      providers: [provideRouter([]), provideHttpClient(), provideHttpClientTesting()],
    });
    const auth = TestBed.inject(Auth);
    auth.simulerConnexion('proprietaire');
    http = TestBed.inject(HttpTestingController);
    fixture = TestBed.createComponent(PatientsCabinetProprietaire);
    component = fixture.componentInstance;
    fixture.detectChanges();
    return fixture.nativeElement as HTMLElement;
  }

  afterEach(() => {
    http.verify();
    sessionStorage.clear();
    localStorage.clear();
  });

  it('appelle GET /cabinets/{id}/patients sans paramètre quand la recherche est vide', () => {
    afficher();
    const req = http.expectOne((r) => r.url.endsWith('/cabinets/cab-004/patients'));
    expect(req.request.method).toBe('GET');
    expect(req.request.params.keys()).toEqual([]);
    req.flush(ENVELOPPE([]));
  });

  it('affiche la liste des patients (nom, date d’inscription, téléphone, ville, email)', async () => {
    const el = afficher();
    http.expectOne((r) => r.url.endsWith('/patients')).flush(ENVELOPPE(PATIENTS));
    await fixture.whenStable();
    fixture.detectChanges();

    const texte = el.textContent ?? '';
    expect(texte).toContain('Aline Nkeng');
    expect(texte).toContain('Marc Biyong');
    expect(texte).toContain('+237600000201');
    expect(texte).toContain('Douala');
    expect(texte).toContain('marc@exemple.cm');
    // Date d'inscription exposée et formatée (JJ/MM/AAAA)
    const attendu = AUJOURDHUI.split('-').reverse().join('/');
    expect(texte).toContain(attendu);
    expect(texte).toContain('Date d’inscription');
    expect(component.patients().length).toBe(2);
  });

  it('ne propose aucune action d’écriture (pas de « Nouveau patient », pas de suppression)', async () => {
    const el = afficher();
    http.expectOne((r) => r.url.endsWith('/patients')).flush(ENVELOPPE(PATIENTS));
    await fixture.whenStable();
    fixture.detectChanges();

    const texte = el.textContent ?? '';
    expect(texte).not.toContain('Nouveau patient');
    expect(texte).not.toContain('Supprimer');
    expect(texte).not.toContain('Modifier');
    // Les seuls boutons sont ceux de l'interface (filtres, recherche, déconnexion) : aucun bouton d'écriture.
    const boutonsEcriture = Array.from(el.querySelectorAll('button')).filter((b) =>
      /nouveau|ajouter|créer|enregistrer|supprimer|modifier/i.test(b.textContent ?? ''),
    );
    expect(boutonsEcriture).toEqual([]);
    expect(el.querySelector('form')).toBeNull();
  });

  it('la recherche est déléguée au serveur via le paramètre `search`', async () => {
    afficher();
    http.expectOne((r) => r.url.endsWith('/patients')).flush(ENVELOPPE(PATIENTS));
    await fixture.whenStable();

    component.recherche.set('Aline');
    component.rechercher();
    const req = http.expectOne((r) => r.url.endsWith('/patients'));
    expect(req.request.params.get('search')).toBe('Aline');
    req.flush(ENVELOPPE([PATIENTS[0]]));
    await fixture.whenStable();

    expect(component.patients().length).toBe(1);
  });

  it('distingue « aucun patient » de « aucun résultat pour cette recherche »', async () => {
    const el = afficher();
    http.expectOne((r) => r.url.endsWith('/patients')).flush(ENVELOPPE([]));
    await fixture.whenStable();
    fixture.detectChanges();
    expect(el.textContent).toContain('Aucun patient n’est encore rattaché à ce cabinet');

    component.recherche.set('zzz');
    component.rechercher();
    http.expectOne((r) => r.url.endsWith('/patients')).flush(ENVELOPPE([]));
    await fixture.whenStable();
    fixture.detectChanges();
    expect(el.textContent).toContain('Aucun patient ne correspond à cette recherche');
  });

  it('erreur 403 : « Accès refusé. »', async () => {
    const el = afficher();
    http
      .expectOne((r) => r.url.endsWith('/patients'))
      .flush({ status: 'error', message: 'Accès refusé' }, { status: 403, statusText: 'Forbidden' });
    await fixture.whenStable();
    fixture.detectChanges();

    expect(component.erreur()).toBe('Accès refusé.');
    expect(el.textContent).toContain('Accès refusé.');
  });

  describe('métriques', () => {
    it('carte « Total patients suivis » = effectif du cabinet, indépendant de la période', async () => {
      const el = afficher();
      http.expectOne((r) => r.url.endsWith('/patients')).flush(ENVELOPPE(PATIENTS));
      await fixture.whenStable();
      fixture.detectChanges();

      expect(component.totalPatients()).toBe(2);
      expect(el.querySelector('[data-carte="total-patients"]')?.textContent).toContain('Total patients suivis');
      expect(el.querySelector('[data-carte="total-patients"]')?.textContent).toContain('2');
    });

    it('carte « Nouveaux inscrits » suit la période choisie', async () => {
      afficher();
      http.expectOne((r) => r.url.endsWith('/patients')).flush(ENVELOPPE(PATIENTS));
      await fixture.whenStable();

      // « Tous » retombe sur l'effectif total.
      expect(component.periode()).toBe('tous');
      expect(component.nouveauxSurPeriode()).toBe(2);

      // Aline est inscrite aujourd'hui : « Aujourd'hui » en compte une.
      component.changerPeriode('jour');
      expect(component.nouveauxSurPeriode()).toBe(1);

      // Aline (aujourd'hui) et Marc (1er janvier de l'année) : deux sur l'année.
      component.changerPeriode('annee');
      expect(component.nouveauxSurPeriode()).toBe(2);
    });
  });

  describe('filtre de période (côté navigateur, sur la date d’inscription)', () => {
    it('filtre la liste affichée sans nouvel appel serveur', async () => {
      const el = afficher();
      http.expectOne((r) => r.url.endsWith('/patients')).flush(ENVELOPPE(PATIENTS));
      await fixture.whenStable();
      fixture.detectChanges();

      component.changerPeriode('annee');
      fixture.detectChanges();
      // Aucun nouvel appel : le filtre est local.
      http.expectNone((r) => r.url.endsWith('/patients'));
      expect(el.querySelectorAll('tbody tr').length).toBe(2);
    });

    it('une période sans inscription peut vider la liste et affiche un message dédié', async () => {
      const el = afficher();
      // Deux patients anciens : hors des bornes « Aujourd'hui ».
      http.expectOne((r) => r.url.endsWith('/patients')).flush(
        ENVELOPPE([
          { id: 1, nom: 'Ancien', prenom: 'Un', telephone: '+237600000301', created_at: `${IL_Y_A_UN_AN}T00:00:00.000000Z` },
          { id: 2, nom: 'Ancien', prenom: 'Deux', telephone: '+237600000302', created_at: `${IL_Y_A_UN_AN}T00:00:00.000000Z` },
        ]),
      );
      await fixture.whenStable();
      fixture.detectChanges();

      expect(el.querySelectorAll('tbody tr').length).toBe(2);
      component.changerPeriode('jour');
      fixture.detectChanges();
      expect(el.querySelectorAll('tbody tr').length).toBe(1);
      expect(el.textContent).toContain('Aucun patient inscrit sur cette période');
    });

    it('une date d’inscription absente est exclue dès qu’une période est active', async () => {
      afficher();
      http
        .expectOne((r) => r.url.endsWith('/patients'))
        .flush(ENVELOPPE([{ id: 99, nom: 'Sans', prenom: 'Date', telephone: '+237600000299', created_at: null }]));
      await fixture.whenStable();

      component.changerPeriode('annee');
      expect(component.patientsFiltres().length).toBe(0);
    });
  });
});
