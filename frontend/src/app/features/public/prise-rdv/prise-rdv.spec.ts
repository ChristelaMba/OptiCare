import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap, provideRouter } from '@angular/router';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';

import { PriseRdv } from './prise-rdv';
import { Auth } from '../../../core/services/auth';

const SLOT = (heure: string, etat: { reserve?: boolean; pause?: boolean } = {}) => ({
  heure_debut: heure,
  heure_fin: heure,
  disponible: !etat.reserve && !etat.pause,
  est_dans_pause: !!etat.pause,
  est_reserve: !!etat.reserve,
});

function reponseSlots(date: string, slots: unknown[]): object {
  return { status: 'success', message: '', data: { date, slots } };
}

describe('PriseRdv — créneaux, erreurs de réservation', () => {
  let component: PriseRdv;
  let fixture: ComponentFixture<PriseRdv>;
  let http: HttpTestingController;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PriseRdv],
      providers: [provideRouter([]), provideHttpClient(), provideHttpClientTesting()],
    }).compileComponents();

    fixture = TestBed.createComponent(PriseRdv);
    component = fixture.componentInstance;
    http = TestBed.inject(HttpTestingController);
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

  function afficherCreneaux(slots: unknown[]): HTMLElement {
    component.cabinetId = '8';
    component.selectionnerJour(JOUR);

    const req = http.expectOne((r) => r.url.endsWith('/cabinets/8/slots'));
    expect(req.request.params.get('date')).toBe('2026-10-22');
    req.flush(reponseSlots('2026-10-22', slots));
    fixture.detectChanges();
    return fixture.nativeElement as HTMLElement;
  }

  it('créneaux réels : états libre / réservé / pause, sans aucune liste locale ni bandeau « indicatifs »', () => {
    const el = afficherCreneaux([SLOT('08:00'), SLOT('08:30', { reserve: true }), SLOT('12:30', { pause: true })]);

    expect(component.creneaux()).toEqual([
      { heure: '08:00', etat: 'libre' },
      { heure: '08:30', etat: 'reserve' },
      { heure: '12:30', etat: 'pause' },
    ]);
    expect(el.textContent).not.toContain('Horaires indicatifs');
    expect(el.textContent).not.toContain('09:00');
    expect(el.textContent).not.toContain('15:30');
  });

  it('un créneau en pause ou réservé est désactivé : bouton `disabled` (donc ni clic ni clavier), mention affichée', () => {
    const el = afficherCreneaux([SLOT('08:00'), SLOT('08:30', { reserve: true }), SLOT('12:30', { pause: true })]);
    const boutons = [...el.querySelectorAll('.slot-button')] as HTMLButtonElement[];

    expect(boutons.map((b) => b.disabled)).toEqual([false, true, true]);
    expect(boutons[1].getAttribute('aria-disabled')).toBe('true');
    expect(boutons[1].textContent).toContain('Réservé');
    expect(boutons[2].textContent).toContain('Pause');

    boutons[1].click();
    boutons[2].click();
    expect(component.heureSelectionnee).toBe('');
    component.selectionnerHeure('12:30'); // même appel direct (clavier/code) : refusé
    expect(component.heureSelectionnee).toBe('');

    boutons[0].click();
    expect(component.heureSelectionnee).toBe('08:00');
  });

  it("plages présentes mais aucun créneau ce jour-là : « Aucun créneau disponible ce jour-là. »", () => {
    component.plages.set([{ jourSemaine: 4, heureDebut: '08:00', heureFin: '17:00', estActif: true }]);
    const el = afficherCreneaux([]);

    expect(el.textContent).toContain('Aucun créneau disponible ce jour-là.');
    expect(el.querySelector('.slot-button')).toBeNull();
    expect(el.textContent).not.toContain("pas encore ouvert");
  });

  it('erreur serveur sur les créneaux : message d\'erreur, pas de liste locale de repli', () => {
    component.cabinetId = '8';
    component.selectionnerJour(JOUR);
    http.expectOne((r) => r.url.endsWith('/cabinets/8/slots')).flush('boom', { status: 500, statusText: 'Server Error' });
    fixture.detectChanges();

    expect(component.erreurCreneaux()).toContain('Impossible de charger les créneaux');
    expect(component.creneaux()).toEqual([]);
    expect(component.chargementCreneaux()).toBe(false);
    expect((fixture.nativeElement as HTMLElement).querySelector('.slot-button')).toBeNull();
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
      http.expectOne((r) => r.url.endsWith('/cabinets/10/slots')).flush(reponseSlots('2026-10-29', []));
      expect(component.heureSelectionnee).toBe('');
    });
  }

  it('403 : « Accès refusé. »', () => {
    preparerReservation();

    component.confirmerRendezVous();
    http.expectOne((r) => r.url.endsWith('/rdv') && r.method === 'POST').flush(
      { status: 'error', message: 'Accès refusé' },
      { status: 403, statusText: 'Forbidden' },
    );

    expect(component.erreurSoumission()).toBe('Accès refusé.');
  });

  it('erreur sans détail (500) : message générique', () => {
    preparerReservation();

    component.confirmerRendezVous();
    http.expectOne((r) => r.url.endsWith('/rdv') && r.method === 'POST').flush('boom', { status: 500, statusText: 'Server Error' });

    expect(component.erreurSoumission()).toContain("Impossible d'enregistrer votre rendez-vous");
  });
});

describe('PriseRdv — cabinet 10 : plages, jours fermés, garde-fou du patient', () => {
  let component: PriseRdv;
  let fixture: ComponentFixture<PriseRdv>;
  let http: HttpTestingController;

  const CABINET = {
    id: 10, nom: 'Cabinet Vision Bonanjo', adresse: 'Rue Joss, Bonanjo', ville: 'Douala', quartier: 'Bonanjo',
    telephone: '+237600000111', email: 'c@example.com', whatsapp_numero: null, slogan: null, description: null,
    logo_url: null, photos: null, site_web: null, facebook: null, instagram: null, tiktok: null,
    abonnement_premium: false, note_moyenne: 0, nb_avis: 0, status: 'valide', created_at: '2026-10-01T00:00:00Z',
    proprietaire: null,
  };

  const PLAGE = (jour: string, debut = '08:00', fin = '17:00') => ({
    id: 1, cabinet_id: 10, jour_semaine: jour, heure_debut: debut, heure_fin: fin, duree_rdv: 30,
    pause_debut: '12:30', pause_fin: '13:30', est_actif: true,
  });

  const PLAGES_DEMO = ['lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi'].map((j) => PLAGE(j));

  function creer(options: { patient?: boolean } = {}): void {
    sessionStorage.clear();
    localStorage.clear();

    TestBed.configureTestingModule({
      imports: [PriseRdv],
      providers: [
        provideRouter([]),
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: ActivatedRoute, useValue: { snapshot: { paramMap: convertToParamMap({ id: '10' }) } } },
      ],
    });
    http = TestBed.inject(HttpTestingController);
    if (options.patient) {
      TestBed.inject(Auth).simulerConnexion('patient');
    }
    fixture = TestBed.createComponent(PriseRdv);
    component = fixture.componentInstance;
    fixture.detectChanges();
  }

  function repondrePlages(plages: unknown[]): void {
    http.expectOne((r) => r.url.endsWith('/cabinets/10')).flush({ status: 'success', message: '', data: { cabinet: CABINET } });
    http.expectOne((r) => r.url.endsWith('/cabinets/10/creneaux')).flush({ status: 'success', message: '', data: { creneaux: plages } });
    fixture.detectChanges();
  }

  afterEach(() => {
    sessionStorage.clear();
    localStorage.clear();
  });

  function joursDuMoisSuivant() {
    component.moisSuivant();
    return component.joursCalendrier().filter((j) => !j.horsMois);
  }

  it('jours fermés : dimanche désactivé, jours avec plage actifs (mois suivant, donc entièrement dans le futur)', () => {
    creer();
    repondrePlages(PLAGES_DEMO);
    const jours = joursDuMoisSuivant();

    const dimanches = jours.filter((j) => j.dateComplete.getDay() === 0);
    const autres = jours.filter((j) => j.dateComplete.getDay() !== 0);

    expect(dimanches.length).toBeGreaterThan(0);
    expect(dimanches.every((j) => !j.disponible)).toBe(true);
    expect(autres.every((j) => j.disponible)).toBe(true);
  });

  it('un jour de la semaine sans plage active est désactivé (cabinet ouvert lundi uniquement)', () => {
    creer();
    repondrePlages([PLAGE('lundi')]);
    const jours = joursDuMoisSuivant();

    expect(jours.filter((j) => j.dateComplete.getDay() === 1).every((j) => j.disponible)).toBe(true);
    expect(jours.filter((j) => j.dateComplete.getDay() !== 1).every((j) => !j.disponible)).toBe(true);
  });

  it('les cases désactivées du calendrier sont des boutons `disabled` (non sélectionnables, clavier compris)', () => {
    creer();
    repondrePlages(PLAGES_DEMO);
    component.moisSuivant();
    fixture.detectChanges();
    const el = fixture.nativeElement as HTMLElement;
    const desactives = [...el.querySelectorAll('.calendar-day')].filter((b) => (b as HTMLButtonElement).disabled);

    expect(desactives.length).toBeGreaterThan(0);
    const dimanche = component.joursCalendrier().find((j) => !j.horsMois && j.dateComplete.getDay() === 0)!;
    component.selectionnerJour(dimanche);
    expect(component.dateSelectionnee).toBeNull();
  });

  it("cabinet sans aucune plage : message « n'a pas encore ouvert ses créneaux », téléphone du cabinet, aucun jour ni liste locale", () => {
    creer();
    repondrePlages([]);
    const el = fixture.nativeElement as HTMLElement;

    expect(component.aucunePlage()).toBe(true);
    expect(el.textContent).toContain("Ce cabinet n'a pas encore ouvert ses créneaux. Contactez-le");
    expect(el.querySelector('a[href="tel:+237600000111"]')).not.toBeNull();
    expect(el.textContent).not.toContain('Horaires indicatifs');
    expect(joursDuMoisSuivant().every((j) => !j.disponible)).toBe(true);
    expect(el.querySelector('.slot-button')).toBeNull();
  });

  it('plages présentes : pas de message « cabinet sans plage »', () => {
    creer();
    repondrePlages(PLAGES_DEMO);

    expect(component.aucunePlage()).toBe(false);
    expect((fixture.nativeElement as HTMLElement).textContent).not.toContain("pas encore ouvert");
  });

  it('échec du chargement des plages : message + « Réessayer », calendrier fermé', () => {
    creer();
    http.expectOne((r) => r.url.endsWith('/cabinets/10')).flush({ status: 'success', message: '', data: { cabinet: CABINET } });
    http.expectOne((r) => r.url.endsWith('/cabinets/10/creneaux')).flush('boom', { status: 500, statusText: 'Server Error' });
    fixture.detectChanges();

    expect(component.erreurPlages()).toContain('Impossible de charger les horaires');
    expect((fixture.nativeElement as HTMLElement).querySelector('.slots-retry')).not.toBeNull();
    expect(joursDuMoisSuivant().every((j) => !j.disponible)).toBe(true);
  });

  // ---- garde-fou « Déjà réservé par vous » (patient connecté uniquement) ----

  const RDV_BRUT = (id: number, cabinet: number, date: string, heure: string, statut: string) => ({
    id, cabinet_id: cabinet, patient_id: 19, date: `${date}T00:00:00.000000Z`, heure_debut: heure, heure_fin: heure,
    motif: null, statut, cabinet: { id: cabinet, nom: 'X' },
  });

  function connecterPatientAvecRdv(rdvs: unknown[]): void {
    creer({ patient: true });
    // session de test sans patientId : récupéré par GET /user puis GET /patients/{id}/rdv
    http.expectOne((r) => r.url.endsWith('/user')).flush({
      id: 31, nom: 'Nkeng', prenom: 'Aline', email: null, telephone: '+237600000201', ville: 'Douala',
      role: 'patient', cabinet_id: null, is_active: true, created_at: '2026-10-19T00:00:00Z', patient: { id: 19 },
    });
    http.expectOne((r) => r.url.endsWith('/patients/19/rdv')).flush({ status: 'success', message: '', data: { rdvs } });
    repondrePlages(PLAGES_DEMO);
  }

  function afficherJeudi29(): HTMLElement {
    component.selectionnerJour({ jour: 29, dateComplete: new Date(2026, 9, 29), disponible: true, horsMois: false, estAujourdhui: false });
    http.expectOne((r) => r.url.endsWith('/cabinets/10/slots')).flush(
      reponseSlots('2026-10-29', [SLOT('10:30'), SLOT('11:00'), SLOT('11:30')]),
    );
    fixture.detectChanges();
    return fixture.nativeElement as HTMLElement;
  }

  it('patient connecté : le créneau où il a déjà un RDV non annulé (même cabinet, date, heure) est désactivé « Déjà réservé par vous »', () => {
    connecterPatientAvecRdv([RDV_BRUT(13, 10, '2026-10-29', '11:00', 'confirme')]);
    const el = afficherJeudi29();

    expect(component.creneaux().map((c) => c.etat)).toEqual(['libre', 'deja-vous', 'libre']);
    const bouton = el.querySelectorAll('.slot-button')[1] as HTMLButtonElement;
    expect(bouton.disabled).toBe(true);
    expect(bouton.textContent).toContain('Déjà réservé par vous');
  });

  it('le garde-fou ignore un RDV annulé, un autre cabinet, une autre date ou une autre heure', () => {
    connecterPatientAvecRdv([
      RDV_BRUT(1, 10, '2026-10-29', '11:00', 'annule'),
      RDV_BRUT(2, 11, '2026-10-29', '11:00', 'confirme'),
      RDV_BRUT(3, 10, '2026-10-30', '11:00', 'confirme'),
      RDV_BRUT(4, 10, '2026-10-29', '10:00', 'confirme'),
    ]);
    afficherJeudi29();

    expect(component.creneaux().map((c) => c.etat)).toEqual(['libre', 'libre', 'libre']);
  });

  it("visiteur : aucun appel à GET /patients/{id}/rdv, aucun créneau marqué « Déjà réservé par vous »", () => {
    creer();
    repondrePlages(PLAGES_DEMO);
    afficherJeudi29();

    http.expectNone((r) => r.url.includes('/patients/'));
    http.expectNone((r) => r.url.endsWith('/user'));
    expect(component.creneaux().every((c) => c.etat === 'libre')).toBe(true);
  });
});
