import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';

import { Auth } from '../../../core/services/auth';
import { GestionEmployes } from './gestion-employes';

function employe(id: number, prenom: string, nom: string, role: string, extra: Record<string, unknown> = {}) {
  return {
    id,
    nom,
    prenom,
    email: null,
    telephone: `+2376000003${id}`,
    ville: 'Douala',
    role,
    poste: role === 'secretaire' ? 'Secretaire' : 'Opticien',
    statut_employe: 'actif',
    is_active: true,
    ...extra,
  };
}

const LISTE = [employe(73, 'Herve', 'Tchinda', 'opticien'), employe(72, 'Nadine', 'Kamga', 'secretaire')];
const ENVELOPPE = (employes: unknown[]) => ({ status: 'success', message: '', data: { employes } });
const url = (suffixe = '') => (r: { url: string }) => r.url.endsWith(`/cabinets/cab-004/personnel${suffixe}`);

describe('GestionEmployes', () => {
  let component: GestionEmployes;
  let fixture: ComponentFixture<GestionEmployes>;
  let http: HttpTestingController;

  async function afficher(reponse: object = ENVELOPPE(LISTE)): Promise<HTMLElement> {
    await TestBed.configureTestingModule({
      imports: [GestionEmployes],
      providers: [provideRouter([]), provideHttpClient(), provideHttpClientTesting()],
    }).compileComponents();
    TestBed.inject(Auth).simulerConnexion('proprietaire');
    http = TestBed.inject(HttpTestingController);
    fixture = TestBed.createComponent(GestionEmployes);
    component = fixture.componentInstance;
    fixture.detectChanges();
    http.expectOne(url()).flush(reponse);
    await fixture.whenStable();
    fixture.detectChanges();
    return fixture.nativeElement as HTMLElement;
  }

  afterEach(() => {
    sessionStorage.clear();
    localStorage.clear();
  });

  function remplir(extra: Record<string, string> = {}): void {
    component.ouvrirFormulaire();
    component.formulaire.patchValue({
      prenom: 'Paul',
      nom: 'Essomba',
      role: 'opticien',
      telephone: '+237600000399',
      ville: 'Douala',
      password: 'motdepasse1',
      password_confirmation: 'motdepasse1',
      ...extra,
    });
  }

  it('liste GET /cabinets/{id}/personnel : noms, rôles, poste', async () => {
    const el = await afficher();
    const texte = el.textContent ?? '';
    expect(texte).toContain('Nadine Kamga');
    expect(texte).toContain('Secrétaire');
    expect(texte).toContain('Herve Tchinda');
    expect(texte).toContain('Opticien');
  });

  it('état vide : message dédié quand il n’y a aucun employé', async () => {
    const el = await afficher(ENVELOPPE([]));
    expect(el.textContent).toContain('Aucun employé pour l');
    expect(el.textContent).not.toContain('ne correspond à cette recherche');
  });

  it('erreur de chargement : message du serveur ; 403 : « Accès refusé. »', async () => {
    await TestBed.configureTestingModule({
      imports: [GestionEmployes],
      providers: [provideRouter([]), provideHttpClient(), provideHttpClientTesting()],
    }).compileComponents();
    TestBed.inject(Auth).simulerConnexion('proprietaire');
    http = TestBed.inject(HttpTestingController);
    fixture = TestBed.createComponent(GestionEmployes);
    component = fixture.componentInstance;
    fixture.detectChanges();
    http.expectOne(url()).flush({ status: 'error', message: 'Erreur interne' }, { status: 500, statusText: 'Server Error' });
    expect(component.erreur()).toContain('Le serveur répond : Erreur interne');

    component.ngOnInit();
    http.expectOne(url()).flush({ status: 'error', message: 'Accès refusé' }, { status: 403, statusText: 'Forbidden' });
    expect(component.erreur()).toBe('Accès refusé.');
  });

  it('désactiver : PUT avec is_active=false, la carte est mise à jour', async () => {
    const el = await afficher();
    const cible = component.employesFiltres().find((e) => e.id === '72')!;

    component.toggleActivation(cible);
    const req = http.expectOne(url('/72'));
    expect(req.request.method).toBe('PUT');
    expect(req.request.body).toEqual({ is_active: false });
    req.flush({ status: 'success', message: '', data: { employe: employe(72, 'Nadine', 'Kamga', 'secretaire', { is_active: false, statut_employe: 'inactif' }) } });
    fixture.detectChanges();

    expect(component.employesFiltres().find((e) => e.id === '72')?.actif).toBe(false);
    expect(el.textContent).toContain('Réactiver');
  });

  it('réactiver : PUT avec is_active=true ; 403 : « Accès refusé. » sans changer la carte', async () => {
    await afficher(ENVELOPPE([employe(72, 'Nadine', 'Kamga', 'secretaire', { is_active: false })]));
    const cible = component.employesFiltres()[0];

    component.toggleActivation(cible);
    const req = http.expectOne(url('/72'));
    expect(req.request.body).toEqual({ is_active: true });
    req.flush({ status: 'error', message: 'Accès refusé' }, { status: 403, statusText: 'Forbidden' });

    expect(component.erreur()).toBe('Accès refusé.');
    expect(component.employesFiltres()[0].actif).toBe(false);
  });

  it('suppression : confirmation d’abord (aucun appel), puis DELETE et retrait de la liste', async () => {
    await afficher();
    const cible = component.employesFiltres().find((e) => e.id === '73')!;

    component.demanderSuppression(cible);
    http.expectNone((r) => r.method === 'DELETE');
    expect(component.employeASupprimer()?.id).toBe('73');

    component.confirmerSuppression();
    const req = http.expectOne((r) => r.method === 'DELETE' && r.url.endsWith('/cabinets/cab-004/personnel/73'));
    req.flush({ status: 'success', message: 'ok', data: null });

    expect(component.employesFiltres().map((e) => e.id)).toEqual(['72']);
    expect(component.employeASupprimer()).toBeNull();
  });

  it('suppression annulée : aucun appel', async () => {
    await afficher();
    component.demanderSuppression(component.employesFiltres()[0]);
    component.annulerSuppression();
    component.confirmerSuppression();

    http.expectNone((r) => r.method === 'DELETE');
    expect(component.employesFiltres().length).toBe(2);
  });

  it('suppression refusée en 403 : « Accès refusé. », l’employé reste', async () => {
    await afficher();
    component.demanderSuppression(component.employesFiltres()[0]);
    component.confirmerSuppression();
    http.expectOne((r) => r.method === 'DELETE').flush({ status: 'error', message: 'Accès refusé' }, { status: 403, statusText: 'Forbidden' });

    expect(component.erreur()).toBe('Accès refusé.');
    expect(component.employesFiltres().length).toBe(2);
  });

  describe('formulaire d’ajout', () => {
    it('rôle limité à opticien et secrétaire ; mot de passe et confirmation demandés', async () => {
      const el = await afficher();
      component.ouvrirFormulaire();
      fixture.detectChanges();

      const options = Array.from(el.querySelectorAll('select[formControlName=role] option')).map((o) => (o as HTMLOptionElement).value);
      expect(options).toEqual(['opticien', 'secretaire']);
      expect(el.querySelectorAll('input[type=password]').length).toBe(2);
    });

    it('mot de passe de moins de 8 caractères ou confirmation différente : refusé sans appel serveur', async () => {
      await afficher();
      remplir({ password: 'court', password_confirmation: 'court' });
      component.soumettreFormulaire();
      http.expectNone((r) => r.method === 'POST');

      remplir({ password: 'motdepasse1', password_confirmation: 'motdepasse2' });
      component.soumettreFormulaire();
      http.expectNone((r) => r.method === 'POST');
      expect(component.formulaire.hasError('confirmation')).toBe(true);
    });

    it('envoie les champs du §12.1 (email, poste, embauche_le seulement si renseignés) et ajoute data.employe', async () => {
      await afficher();
      remplir({ poste: 'Opticien senior', embauche_le: '2026-10-20' });
      component.soumettreFormulaire();

      const req = http.expectOne((r) => r.method === 'POST' && r.url.endsWith('/cabinets/cab-004/personnel'));
      expect(req.request.body).toEqual({
        nom: 'Essomba',
        prenom: 'Paul',
        telephone: '+237600000399',
        ville: 'Douala',
        role: 'opticien',
        poste: 'Opticien senior',
        embauche_le: '2026-10-20',
        password: 'motdepasse1',
        password_confirmation: 'motdepasse1',
      });
      req.flush(
        { status: 'success', message: 'ok', data: { employe: employe(99, 'Paul', 'Essomba', 'opticien') } },
        { status: 201, statusText: 'Created' },
      );

      expect(component.employesFiltres().map((e) => e.id)).toContain('99');
      expect(component.formulaireOuvert()).toBe(false);
    });

    it('422 : les messages du serveur s’affichent champ par champ', async () => {
      const el = await afficher();
      remplir();
      fixture.detectChanges();
      component.soumettreFormulaire();

      http.expectOne((r) => r.method === 'POST').flush(
        {
          status: 'error',
          message: 'Erreur de validation',
          errors: { telephone: ['Ce numéro de téléphone est déjà utilisé.'], password: ['Le mot de passe est trop faible.'] },
        },
        { status: 422, statusText: 'Unprocessable Entity' },
      );
      fixture.detectChanges();

      expect(el.querySelector('[data-champ=telephone]')?.textContent).toContain('déjà utilisé');
      expect(el.querySelector('[data-champ=password]')?.textContent).toContain('trop faible');
      expect(component.formulaireOuvert()).toBe(true);
    });

    it('422 sur un champ inconnu du formulaire (errors.general) : bandeau', async () => {
      await afficher();
      remplir();
      component.soumettreFormulaire();

      http.expectOne((r) => r.method === 'POST').flush(
        { status: 'error', message: 'Erreur', errors: { general: 'Quota de personnel atteint.' } },
        { status: 422, statusText: 'Unprocessable Entity' },
      );

      expect(component.erreurFormulaire()).toBe('Quota de personnel atteint.');
    });

    it('403 : « Accès refusé. » ; 500 : message du serveur', async () => {
      await afficher();
      remplir();
      component.soumettreFormulaire();
      http.expectOne((r) => r.method === 'POST').flush({ status: 'error', message: 'Accès refusé' }, { status: 403, statusText: 'Forbidden' });
      expect(component.erreurFormulaire()).toBe('Accès refusé.');

      component.soumettreFormulaire();
      http.expectOne((r) => r.method === 'POST').flush({ status: 'error', message: 'Erreur interne' }, { status: 500, statusText: 'Server Error' });
      expect(component.erreurFormulaire()).toContain('Le serveur répond : Erreur interne');
    });
  });

  describe('affichage du poste', () => {
    it('poste identique au rôle : non répété (« Opticien · Opticien »)', async () => {
      const el = await afficher();
      const texte = el.textContent ?? '';
      expect(texte).not.toContain('Opticien · Opticien');
      expect(texte).not.toContain('Secrétaire · Secretaire');
      expect(texte).not.toContain('Secrétaire · Secrétaire');
    });

    it('poste différent du rôle : affiché ; poste vide : rien', async () => {
      const el = await afficher(ENVELOPPE([employe(80, 'Paul', 'Essomba', 'opticien', { poste: 'Opticien senior' }), employe(81, 'Rose', 'Ndi', 'secretaire', { poste: null })]));
      const texte = el.textContent ?? '';
      expect(texte).toContain('Opticien · Opticien senior');
      expect(texte).not.toContain('Secrétaire ·');
    });

    it('casse et accents ignorés : « SECRETAIRE » = « Secrétaire »', async () => {
      await afficher();
      const e = component.employesFiltres()[0];
      expect(component.posteAffiche({ ...e, role: 'secretaire', poste: 'SECRETAIRE' })).toBeNull();
      expect(component.posteAffiche({ ...e, role: 'secretaire', poste: 'Secrétaire de direction' })).toBe('Secrétaire de direction');
    });
  });
});
