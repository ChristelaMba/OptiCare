import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';

import { GestionComptes } from './gestion-comptes';

function user(id: number, nom: string, role: string, extra: Record<string, unknown> = {}) {
  return {
    id,
    nom,
    prenom: 'Test',
    email: null,
    telephone: `+2376000000${id}`,
    ville: 'Douala',
    role,
    cabinet_id: null,
    is_active: true,
    cabinet: null,
    ...extra,
  };
}

const USERS = [
  user(11, 'Mballa', 'proprietaire', { cabinet: { id: 6, nom: 'Cabinet Vision Bonanjo', ville: 'Douala' } }),
  user(12, 'Nkeng', 'patient'),
  user(13, 'Kamga', 'secretaire', { is_active: false, cabinet: { id: 6, nom: 'Cabinet Vision Bonanjo', ville: 'Douala' } }),
];
const STATS = { total: 3, super_admin: 0, proprietaire: 1, opticien: 0, secretaire: 1, patient: 1, actifs: 2, inactifs: 1 };
const ENVELOPPE = { status: 'success', message: '', data: { users: USERS, stats: STATS } };

describe('GestionComptes', () => {
  let component: GestionComptes;
  let fixture: ComponentFixture<GestionComptes>;
  let http: HttpTestingController;

  async function afficher(reponse: object = ENVELOPPE): Promise<HTMLElement> {
    await TestBed.configureTestingModule({
      imports: [GestionComptes],
      providers: [provideRouter([]), provideHttpClient(), provideHttpClientTesting()],
    }).compileComponents();
    http = TestBed.inject(HttpTestingController);
    fixture = TestBed.createComponent(GestionComptes);
    component = fixture.componentInstance;
    fixture.detectChanges();
    http.expectOne((r) => r.url.endsWith('/admin/users')).flush(reponse);
    await fixture.whenStable();
    fixture.detectChanges();
    return fixture.nativeElement as HTMLElement;
  }

  const lignes = (el: HTMLElement) => Array.from(el.querySelectorAll('tbody tr'));

  it('charge GET /admin/users et affiche utilisateur, rôle, cabinet (ou tiret), statut et stats', async () => {
    const el = await afficher();

    expect(lignes(el).length).toBe(3);
    const texte = el.textContent ?? '';
    expect(texte).toContain('Test Mballa');
    expect(texte).toContain('Propriétaire');
    expect(texte).toContain('Cabinet Vision Bonanjo');
    expect(lignes(el)[1].textContent).toContain('—');
    expect(texte).toContain('Actif');
    expect(texte).toContain('Inactif');
    expect(el.querySelector('[data-testid=stats]')?.textContent).toContain('3 comptes : 2 actifs, 1 inactifs');
  });

  it("ne propose que les statuts « Actif » et « Inactif »", async () => {
    const el = await afficher();
    const options = Array.from(el.querySelectorAll('select')[1].querySelectorAll('option')).map((o) => o.textContent?.trim());
    expect(options).toEqual(['Tous les statuts', 'Actif', 'Inactif']);
  });

  it('recherche (nom, téléphone, cabinet) et filtre par rôle', async () => {
    const el = await afficher();

    component.texteRecherche.set('nkeng');
    fixture.detectChanges();
    expect(lignes(el).length).toBe(1);
    expect(lignes(el)[0].textContent).toContain('Nkeng');

    component.texteRecherche.set('bonanjo');
    fixture.detectChanges();
    expect(lignes(el).length).toBe(2);

    component.texteRecherche.set('');
    component.filtreRole.set('secretaire');
    fixture.detectChanges();
    expect(lignes(el).length).toBe(1);
    expect(lignes(el)[0].textContent).toContain('Kamga');

    component.filtreRole.set('proprietaire');
    component.filtreStatut.set('inactif');
    fixture.detectChanges();
    expect(lignes(el)[0].textContent).toContain('Aucun compte ne correspond');
  });

  it('état vide : « Aucun compte. »', async () => {
    const el = await afficher({ status: 'success', message: '', data: { users: [], stats: { ...STATS, total: 0 } } });
    expect(lignes(el)[0].textContent).toContain('Aucun compte.');
  });

  it('erreur de chargement : message du serveur affiché', async () => {
    await TestBed.configureTestingModule({
      imports: [GestionComptes],
      providers: [provideRouter([]), provideHttpClient(), provideHttpClientTesting()],
    }).compileComponents();
    http = TestBed.inject(HttpTestingController);
    fixture = TestBed.createComponent(GestionComptes);
    component = fixture.componentInstance;
    fixture.detectChanges();
    http.expectOne((r) => r.url.endsWith('/admin/users')).flush(
      { status: 'error', message: 'Erreur interne' },
      { status: 500, statusText: 'Server Error' },
    );
    await fixture.whenStable();
    fixture.detectChanges();

    expect(component.erreur()).toContain('Le serveur répond : Erreur interne');
    expect((fixture.nativeElement as HTMLElement).textContent).toContain('Le serveur répond : Erreur interne');
  });

  it('erreur 403 au chargement : « Accès refusé. »', async () => {
    await TestBed.configureTestingModule({
      imports: [GestionComptes],
      providers: [provideRouter([]), provideHttpClient(), provideHttpClientTesting()],
    }).compileComponents();
    http = TestBed.inject(HttpTestingController);
    fixture = TestBed.createComponent(GestionComptes);
    component = fixture.componentInstance;
    fixture.detectChanges();
    http.expectOne((r) => r.url.endsWith('/admin/users')).flush({ status: 'error', message: 'Accès refusé' }, { status: 403, statusText: 'Forbidden' });
    expect(component.erreur()).toBe('Accès refusé.');
  });

  it("toggle-active : la ligne et les compteurs sont mis à jour avec la réponse du serveur", async () => {
    const el = await afficher();
    const cible = component.utilisateursPage().find((u) => u.id === '13')!;

    component.toggleActivation(cible);
    const req = http.expectOne((r) => r.url.endsWith('/admin/users/13/toggle-active'));
    expect(req.request.method).toBe('PUT');
    req.flush({ status: 'success', message: '', data: { user: { id: 13, is_active: true } } });
    fixture.detectChanges();

    expect(component.utilisateursPage().find((u) => u.id === '13')?.actif).toBe(true);
    expect(component.stats()).toMatchObject({ actifs: 3, inactifs: 0 });
    expect(el.textContent).not.toContain('Inactif</span>');
    expect(component.actionEnCours()).toBeNull();
  });

  it('toggle-active en 403 : « Accès refusé. », la ligne ne change pas', async () => {
    await afficher();
    const cible = component.utilisateursPage().find((u) => u.id === '11')!;

    component.toggleActivation(cible);
    http.expectOne((r) => r.url.endsWith('/admin/users/11/toggle-active')).flush({ status: 'error', message: 'Accès refusé' }, { status: 403, statusText: 'Forbidden' });

    expect(component.erreurAction()).toBe('Accès refusé.');
    expect(component.utilisateursPage().find((u) => u.id === '11')?.actif).toBe(true);
  });

  describe('réinitialisation du mot de passe', () => {
    beforeEach(async () => {
      await afficher();
      component.ouvrirReinitialisation(component.utilisateursPage()[0]);
      fixture.detectChanges();
    });

    it('demande un nouveau mot de passe et sa confirmation (formulaire affiché)', () => {
      const el = fixture.nativeElement as HTMLElement;
      expect(el.querySelectorAll('[role=dialog] input[type=password]').length).toBe(2);
    });

    it('moins de 8 caractères : refusé sans appel serveur', () => {
      component.nouveauMotDePasse.set('court');
      component.confirmationMotDePasse.set('court');
      component.confirmerReinitialisation();

      expect(component.erreurReinit()).toContain('8 caractères');
      http.expectNone((r) => r.url.includes('reset-password'));
    });

    it('confirmation différente : refusée sans appel serveur', () => {
      component.nouveauMotDePasse.set('longmotdepasse');
      component.confirmationMotDePasse.set('autremotdepasse');
      component.confirmerReinitialisation();

      expect(component.erreurReinit()).toContain('ne correspond pas');
      http.expectNone((r) => r.url.includes('reset-password'));
    });

    it('valide : PUT reset-password, formulaire vidé et fermé, message de succès', () => {
      component.nouveauMotDePasse.set('longmotdepasse');
      component.confirmationMotDePasse.set('longmotdepasse');
      component.confirmerReinitialisation();

      const req = http.expectOne((r) => r.url.endsWith('/admin/users/11/reset-password'));
      expect(req.request.method).toBe('PUT');
      expect(req.request.body).toEqual({ password: 'longmotdepasse', password_confirmation: 'longmotdepasse' });
      req.flush({ status: 'success', message: 'ok', data: null });

      expect(component.compteReinit()).toBeNull();
      expect(component.nouveauMotDePasse()).toBe('');
      expect(component.succesReinit()).toContain('réinitialisé');
    });

    it('422 du serveur : erreur affichée, formulaire conservé', () => {
      component.nouveauMotDePasse.set('longmotdepasse');
      component.confirmationMotDePasse.set('longmotdepasse');
      component.confirmerReinitialisation();

      http.expectOne((r) => r.url.endsWith('/reset-password')).flush(
        { status: 'error', message: 'Erreur de validation', errors: { password: ['Le mot de passe est trop faible.'] } },
        { status: 422, statusText: 'Unprocessable Entity' },
      );

      expect(component.erreurReinit()).toBe('Le mot de passe est trop faible.');
      expect(component.compteReinit()).not.toBeNull();
    });

    it('403 : « Accès refusé. »', () => {
      component.nouveauMotDePasse.set('longmotdepasse');
      component.confirmationMotDePasse.set('longmotdepasse');
      component.confirmerReinitialisation();

      http.expectOne((r) => r.url.endsWith('/reset-password')).flush({ status: 'error', message: 'Accès refusé' }, { status: 403, statusText: 'Forbidden' });
      expect(component.erreurReinit()).toBe('Accès refusé.');
    });
  });
});
