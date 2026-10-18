import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';

import { RendezVousService } from './rendez-vous';
import { Auth } from './auth';
import { NouveauRendezVousPayload } from '../../models/rendez-vous.model';

const PAYLOAD: NouveauRendezVousPayload = {
  cabinetId: '8',
  date: '2026-10-21',
  heure: '10:00',
  motif: 'TEST-DIAG',
  nomComplet: 'Jean Pierre Dupont',
  telephone: '600000000',
  email: 'visiteur@example.com',
};

const RDV_BRUT = {
  id: 2,
  cabinet_id: 8,
  patient_id: 13,
  date: '2026-10-21T00:00:00.000000Z',
  heure_debut: '10:00',
  heure_fin: '10:30',
  motif: null,
  statut: 'confirme',
  cabinet: { id: 8, nom: 'Cabinet TEST-DIAG 1', adresse: 'Rue TEST', ville: 'Douala' },
};

describe('RendezVousService', () => {
  let service: RendezVousService;
  let http: HttpTestingController;

  function configurer(role: 'patient' | null): void {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    const auth = TestBed.inject(Auth);
    if (role) {
      auth.simulerConnexion(role);
    }
    service = TestBed.inject(RendezVousService);
    http = TestBed.inject(HttpTestingController);
  }

  afterEach(() => {
    http.verify();
    sessionStorage.clear();
    localStorage.clear();
  });

  it('should be created', () => {
    configurer(null);
    expect(service).toBeTruthy();
  });

  it('creer() visiteur : POST /rdv avec les champs visiteur_* et le nom scindé', () => {
    configurer(null);
    service.creer(PAYLOAD).subscribe();

    const req = http.expectOne((r) => r.url.endsWith('/rdv'));
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual({
      cabinet_id: 8,
      date: '2026-10-21',
      heure_debut: '10:00',
      motif: 'TEST-DIAG',
      visiteur_nom: 'Pierre Dupont',
      visiteur_prenom: 'Jean',
      visiteur_telephone: '600000000',
      visiteur_email: 'visiteur@example.com',
    });
    req.flush({ status: 'success', message: '', data: { rdv: RDV_BRUT, statut: 'reserve' } });
  });

  it('creer() patient connecté : aucun champ visiteur_* n\'est envoyé', () => {
    configurer('patient');
    service.creer(PAYLOAD).subscribe();

    const req = http.expectOne((r) => r.url.endsWith('/rdv'));
    expect(req.request.body).toEqual({
      cabinet_id: 8,
      date: '2026-10-21',
      heure_debut: '10:00',
      motif: 'TEST-DIAG',
    });
    req.flush({ status: 'success', message: '', data: { rdv: RDV_BRUT, statut: 'confirme' } });
  });

  it('listerCreneaux() : un créneau réservé ou en pause n\'est pas disponible', () => {
    configurer(null);
    let resultat: unknown;
    service.listerCreneaux('8', '2026-10-22').subscribe((r) => (resultat = r));

    http.expectOne((r) => r.url.endsWith('/cabinets/8/slots')).flush({
      status: 'success',
      message: '',
      data: {
        date: '2026-10-22',
        slots: [
          { heure_debut: '09:00', heure_fin: '09:30', disponible: true, est_dans_pause: false, est_reserve: false },
          { heure_debut: '09:30', heure_fin: '10:00', disponible: true, est_dans_pause: false, est_reserve: true },
          { heure_debut: '12:00', heure_fin: '12:30', disponible: true, est_dans_pause: true, est_reserve: false },
        ],
      },
    });

    expect(resultat).toEqual([
      { heure: '09:00', disponible: true },
      { heure: '09:30', disponible: false },
      { heure: '12:00', disponible: false },
    ]);
  });

  it('getMesRendezVous() mappe la forme réelle (snake_case, date ISO, cabinet imbriqué)', () => {
    configurer('patient');
    let resultat: unknown;
    service.getMesRendezVous('13').subscribe((r) => (resultat = r));

    const req = http.expectOne((r) => r.url.endsWith('/patients/13/rdv'));
    req.flush({ status: 'success', message: '', data: { rdvs: [RDV_BRUT] } });

    expect(resultat).toEqual([
      {
        id: '2',
        cabinetId: '8',
        cabinetNom: 'Cabinet TEST-DIAG 1',
        cabinetAdresse: 'Rue TEST, Douala',
        motif: '',
        date: '2026-10-21',
        heureDebut: '10:00',
        heureFin: '10:30',
        statut: 'confirme',
      },
    ]);
  });
});
