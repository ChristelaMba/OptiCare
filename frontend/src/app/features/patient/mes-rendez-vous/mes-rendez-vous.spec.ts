import { ComponentFixture, TestBed } from '@angular/core/testing';
import { registerLocaleData } from '@angular/common';
import localeFr from '@angular/common/locales/fr';
import { provideRouter } from '@angular/router';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';

import { MesRendezVous } from './mes-rendez-vous';
import { RendezVous } from '../../../models/rendez-vous.model';
import { Auth } from '../../../core/services/auth';

// Le template utilise `| date:…:'fr'` : locale à enregistrer avant le rendu (NG0701).
registerLocaleData(localeFr);

describe('MesRendezVous', () => {
  let component: MesRendezVous;
  let fixture: ComponentFixture<MesRendezVous>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [MesRendezVous],
      providers: [provideRouter([]), provideHttpClient(), provideHttpClientTesting()],
    }).compileComponents();

    fixture = TestBed.createComponent(MesRendezVous);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  function rdv(id: string, motif: string): RendezVous {
    return {
      id,
      cabinetId: '8',
      cabinetNom: 'Cabinet TEST-DIAG 1',
      cabinetAdresse: 'Rue TEST, Douala',
      motif,
      date: '2099-01-15',
      heureDebut: '10:00',
      heureFin: '10:30',
      statut: 'confirme',
    };
  }

  async function afficher(rdvs: RendezVous[]): Promise<HTMLElement> {
    component.rendezVous.set(rdvs);
    component.erreur.set(null);
    component.chargement.set(false);
    fixture.detectChanges();
    await fixture.whenStable();
    return fixture.nativeElement as HTMLElement;
  }

  it('affiche le motif réel du rendez-vous, plus un libellé fixe', async () => {
    const el = await afficher([rdv('1', 'test')]);
    const type = el.querySelector('.rdv-type')?.textContent ?? '';

    expect(type).toContain('test');
    expect(el.textContent).not.toContain('OPHTALMOLOGIQUE');
  });

  it('libellé neutre uniquement quand le motif est vide', async () => {
    const el = await afficher([rdv('2', '')]);

    expect(el.querySelector('.rdv-type')?.textContent).toContain('Consultation');
  });

  it("affiche l'adresse issue de l'API et un lien de carte construit dessus", async () => {
    const el = await afficher([rdv('3', 'test')]);
    const lien = el.querySelector('.info-item a') as HTMLAnchorElement;

    expect(el.textContent).toContain('Rue TEST, Douala');
    expect(lien.getAttribute('href')).toBe(
      'https://www.google.com/maps/search/?api=1&query=Rue%20TEST%2C%20Douala',
    );
  });

  const REPONSE_ANNULATION = {
    status: 'success',
    message: 'RDV annulé avec succès.',
    data: {
      rdv: {
        id: 7,
        cabinet_id: 8,
        patient_id: 3,
        date: '2099-01-15T00:00:00.000000Z',
        heure_debut: '10:00',
        heure_fin: '10:30',
        motif: 'test',
        statut: 'annule',
      },
    },
  };

  it("annulation : PUT /rdv/{id}/annuler, le RDV passe en annulé et rejoint l'historique", async () => {
    const http = TestBed.inject(HttpTestingController);
    await afficher([rdv('7', 'test')]);

    component.annulerRendezVous(component.rendezVous()[0]);

    const req = http.expectOne((r) => r.url.endsWith('/rdv/7/annuler'));
    expect(req.request.method).toBe('PUT');
    req.flush(REPONSE_ANNULATION);

    expect(component.rendezVous()[0].statut).toBe('annule');
    expect(component.rendezVousAVenir().length).toBe(0);
    expect(component.rendezVousPasses().length).toBe(1);
    expect(component.erreurAnnulation()).toBeNull();
  });

  it("échec d'annulation : la liste reste visible, message dédié, pas le bloc « impossible de charger »", async () => {
    const http = TestBed.inject(HttpTestingController);
    const el = await afficher([rdv('7', 'test')]);

    component.annulerRendezVous(component.rendezVous()[0]);
    http.expectOne((r) => r.url.endsWith('/rdv/7/annuler')).flush(
      { status: 'error', message: 'Erreur', errors: { general: 'Ce RDV est déjà annulé.' } },
      { status: 500, statusText: 'Server Error' },
    );
    fixture.detectChanges();
    await fixture.whenStable();

    expect(component.erreur()).toBeNull();
    expect(component.erreurAnnulation()).toContain("Impossible d'annuler ce rendez-vous");
    expect(component.erreurAnnulation()).toContain('Ce RDV est déjà annulé.');
    expect(component.rendezVous()[0].statut).toBe('confirme');
    expect(el.querySelector('.cancel-error')?.textContent).toContain("Impossible d'annuler");
    expect(el.querySelector('.error-state')).toBeNull();
    expect(el.querySelector('.rdv-type')).not.toBeNull();
  });

  it("« Consultations passées » ne compte pas les rendez-vous annulés (ils restent dans l'historique)", async () => {
    const passe = (id: string, statut: RendezVous['statut']): RendezVous => ({ ...rdv(id, 'x'), date: '2020-01-10', statut });

    const el = await afficher([passe('1', 'termine'), passe('2', 'annule'), passe('3', 'annule')]);

    expect(component.rendezVousPasses().length).toBe(3);
    expect(component.nombreConsultationsPassees()).toBe(1);
    expect(el.querySelector('.stat-content strong')).not.toBeNull();
  });

  it("« Ajouter au calendrier » télécharge un fichier .ics, sans appel API", async () => {
    const http = TestBed.inject(HttpTestingController);
    const creerUrl = vi.fn().mockReturnValue('blob:test');
    const revoquer = vi.fn();
    URL.createObjectURL = creerUrl;
    URL.revokeObjectURL = revoquer;

    await afficher([rdv('9', 'test')]);
    const bouton = [...(fixture.nativeElement as HTMLElement).querySelectorAll('.action-btn')].find((b) =>
      b.textContent?.includes('Ajouter au calendrier'),
    ) as HTMLButtonElement;

    bouton.click();

    expect(creerUrl).toHaveBeenCalledTimes(1);
    const blob = creerUrl.mock.calls[0][0] as Blob;
    expect(blob.type).toContain('text/calendar');
    expect(await blob.text()).toContain('BEGIN:VCALENDAR\r\n');
    expect(revoquer).toHaveBeenCalledWith('blob:test');
    http.expectNone((r) => r.url.includes('/rdv/9'));
  });

  it('« Reprogrammer » est désactivé avec la mention « Bientôt »', async () => {
    const el = await afficher([rdv('9', 'test')]);
    const bouton = [...el.querySelectorAll('.action-btn')].find((b) =>
      b.textContent?.includes('Reprogrammer'),
    ) as HTMLButtonElement;

    expect(bouton.disabled).toBe(true);
    expect(bouton.getAttribute('aria-disabled')).toBe('true');
    expect(bouton.textContent).toContain('Bientôt');
  });

  it("annulation refusée en 422 : errors.rdv[0] du serveur affiché, la liste reste visible", async () => {
    const http = TestBed.inject(HttpTestingController);
    const el = await afficher([rdv('7', 'test')]);

    component.annulerRendezVous(component.rendezVous()[0]);
    http.expectOne((r) => r.url.endsWith('/rdv/7/annuler')).flush(
      { status: 'error', message: 'Action impossible', errors: { rdv: ['Ce RDV est déjà annulé.'] } },
      { status: 422, statusText: 'Unprocessable Entity' },
    );
    fixture.detectChanges();

    expect(component.erreurAnnulation()).toContain('Ce RDV est déjà annulé.');
    expect(component.erreur()).toBeNull();
    expect(el.querySelector('.rdv-type')).not.toBeNull();
  });

  it('annulation refusée en 403 : « Accès refusé. »', async () => {
    const http = TestBed.inject(HttpTestingController);
    await afficher([rdv('7', 'test')]);

    component.annulerRendezVous(component.rendezVous()[0]);
    http.expectOne((r) => r.url.endsWith('/rdv/7/annuler')).flush(
      { status: 'error', message: 'Accès refusé', errors: { rdv: ["Vous n'êtes pas autorisé à accéder à ce RDV."] } },
      { status: 403, statusText: 'Forbidden' },
    );

    expect(component.erreurAnnulation()).toBe('Accès refusé.');
  });

  it('session sans patientId : il est récupéré par GET /user, plus de message « reconnectez-vous »', () => {
    const http = TestBed.inject(HttpTestingController);
    const auth = TestBed.inject(Auth);
    auth.simulerConnexion('patient');
    expect(auth.utilisateur()?.patientId).toBeUndefined();
    http.match(() => true); // requêtes déjà émises à l'initialisation du composant

    component.chargerRendezVous();

    http.expectOne((r) => r.url.endsWith('/user')).flush({
      id: 7, nom: 'Test', prenom: 'Patient', email: null, telephone: '+237600000000', ville: 'Douala',
      role: 'patient', cabinet_id: null, is_active: true, created_at: '2026-09-07T04:59:03.000000Z', patient: { id: 3 },
    });
    http.expectOne((r) => r.url.endsWith('/patients/3/rdv')).flush({ status: 'success', message: '', data: { rdvs: [] } });

    expect(component.erreur()).toBeNull();
    expect(component.chargement()).toBe(false);
  });

  it("échec de GET /user (session sans patientId) : message neutre, sans « reconnectez-vous »", () => {
    const http = TestBed.inject(HttpTestingController);
    TestBed.inject(Auth).simulerConnexion('patient');
    http.match(() => true); // requêtes déjà émises à l'initialisation du composant

    component.chargerRendezVous();
    http.expectOne((r) => r.url.endsWith('/user')).flush('boom', { status: 500, statusText: 'Server Error' });

    expect(component.erreur()).toBe('Impossible de charger vos rendez-vous.');
    expect(component.erreur()).not.toContain('reconnect');
  });

  it('le nom du cabinet n’apparaît qu’une seule fois par carte', async () => {
    const el = await afficher([rdv('7', 'Contrôle')]);
    const carte = el.querySelector('.rdv-type')?.closest('article, .rdv-card, li, div[class*=card]') ?? el;
    const occurrences = (carte.textContent ?? '').split('Cabinet TEST-DIAG 1').length - 1;
    expect(occurrences).toBe(1);
    expect((el.textContent ?? '').split('Établissement').length - 1).toBe(0);
  });

  describe('confirmation avant annulation', () => {
    it('« Annuler » ouvre la confirmation, sans appel API', async () => {
      const http = TestBed.inject(HttpTestingController);
      const el = await afficher([rdv('7', 'test')]);

      component.demanderAnnulation(component.rendezVous()[0]);
      fixture.detectChanges();

      http.expectNone((r) => r.url.includes('/annuler'));
      const boite = el.querySelector('[role=alertdialog]');
      expect(boite?.textContent).toContain('Voulez-vous vraiment annuler ce rendez-vous ?');
      expect(Array.from(boite?.querySelectorAll('button') ?? []).map((b) => b.textContent?.trim())).toEqual(['Garder', 'Annuler le rendez-vous']);
    });

    it('« Garder » : fermeture, aucun appel, le rendez-vous reste confirmé', async () => {
      const http = TestBed.inject(HttpTestingController);
      const el = await afficher([rdv('7', 'test')]);
      component.demanderAnnulation(component.rendezVous()[0]);
      fixture.detectChanges();

      const garder = Array.from(el.querySelectorAll('[role=alertdialog] button')).find((b) => b.textContent?.trim() === 'Garder') as HTMLButtonElement;
      garder.click();
      fixture.detectChanges();

      http.expectNone((r) => r.url.includes('/annuler'));
      expect(el.querySelector('[role=alertdialog]')).toBeNull();
      expect(component.rendezVous()[0].statut).toBe('confirme');
    });

    it('« Annuler le rendez-vous » : PUT /rdv/{id}/annuler seulement après confirmation', async () => {
      const http = TestBed.inject(HttpTestingController);
      await afficher([rdv('7', 'test')]);
      component.demanderAnnulation(component.rendezVous()[0]);
      component.confirmerAnnulation();

      const req = http.expectOne((r) => r.url.endsWith('/rdv/7/annuler'));
      expect(req.request.method).toBe('PUT');
      req.flush(REPONSE_ANNULATION);
      expect(component.rendezVous()[0].statut).toBe('annule');
      expect(component.rdvAConfirmer()).toBeNull();
    });

    it('les boutons « Annuler » de la carte passent par la confirmation (aucun appel au clic)', async () => {
      const http = TestBed.inject(HttpTestingController);
      const el = await afficher([rdv('7', 'test')]);
      const bouton = Array.from(el.querySelectorAll('.action-btn.danger')).find((b) => b.textContent?.includes('Annuler')) as HTMLButtonElement;

      bouton.click();
      fixture.detectChanges();

      http.expectNone((r) => r.url.includes('/annuler'));
      expect(component.rdvAConfirmer()?.id).toBe('7');
    });
  });
});
