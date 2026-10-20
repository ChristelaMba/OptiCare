import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';

import { MesAvis } from './mes-avis';
import { Auth } from '../../../core/services/auth';
import { Utilisateur } from '../../../models/utilisateur.model';

/**
 * `Auth` est remplacé par un stub : le patient de test a un `patientId`, ce que
 * le `simulerConnexion('patient')` réel ne fournit pas. Seul `utilisateur` est
 * utilisé par l'écran, pour retrouver les consultations du patient.
 */
const PATIENT: Utilisateur = {
  id: 'u-3',
  role: 'patient',
  nom: 'Test',
  prenom: 'Patient',
  email: 'patient@dev.local',
  telephone: '+237600000000',
  ville: 'Douala',
  patientId: '3',
  actif: true,
  dateCreation: new Date(),
};

describe('MesAvis', () => {
  let component: MesAvis;
  let fixture: ComponentFixture<MesAvis>;
  let http: HttpTestingController;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [MesAvis],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: Auth, useValue: { utilisateur: () => PATIENT } },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(MesAvis);
    component = fixture.componentInstance;
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    http.verify();
  });

  /** Répond à `GET /patient/avis` (appelé au démarrage). */
  function repondreAvis(avis: unknown[] = []): void {
    http.expectOne((r) => r.url.endsWith('/patient/avis')).flush({
      status: 'success',
      message: '',
      data: { avis },
    });
  }

  /** Répond à `GET /patients/3/consultations` ; renvoie le patient aux tests. */
  function repondreConsultations(consultations: unknown[] = []): void {
    http.expectOne((r) => r.url.endsWith('/patients/3/consultations')).flush({
      status: 'success',
      message: '',
      data: { consultations },
    });
  }

  function repondreCabinets(cabinets: unknown[] = []): void {
    http.expectOne((r) => r.url.endsWith('/cabinets')).flush({
      status: 'success',
      message: '',
      data: { cabinets },
    });
  }

  const CONSULTATION_TERMINEE = {
    id: 114,
    patient_id: 3,
    cabinet_id: 6,
    opticien_id: null,
    rdv_id: null,
    date_consultation: '2026-10-01T00:00:00Z',
    motif: null,
    plaintes: null,
    ecart_pupillaire: null,
    prescription: null,
    observations: null,
    statut: 'terminee',
    verrouillee: true,
    is_modifiable: false,
  };

  it('should create', async () => {
    repondreAvis();
    repondreConsultations();
    await fixture.whenStable();
    expect(component).toBeTruthy();
  });

  it('aucun établissement inventé : pas d\'« OptiCare Centre », pas de bouton « Laisser un avis »', async () => {
    repondreAvis();
    repondreConsultations();
    await fixture.whenStable();

    const el = fixture.nativeElement as HTMLElement;

    expect(component.cabinetsEligibles()).toEqual([]);
    expect(el.textContent).not.toContain('OptiCare Centre');
    expect(el.textContent).not.toContain('Laisser un avis');
    expect(el.querySelector('.cabinet-card')).toBeNull();
  });

  it('état vide honnête : un avis est possible après une consultation terminée', async () => {
    repondreAvis();
    repondreConsultations();
    await fixture.whenStable();

    const el = fixture.nativeElement as HTMLElement;

    expect(el.textContent).toContain('Vous pourrez laisser un avis après une consultation terminée.');
  });

  it('charge les avis publiés via GET /patient/avis', async () => {
    repondreAvis([
      { id: 4, note: 4, commentaire: 'Bon accueil', created_at: '2026-10-12T00:00:00Z', cabinet: { id: 6, nom: 'Vision Plus' } },
    ]);
    repondreConsultations();
    await fixture.whenStable();

    expect(component.avisPublies()).toHaveLength(1);
    expect(component.avisPublies()[0]).toMatchObject({ id: '4', cabinetNom: 'Vision Plus', note: 4 });
  });

  it('éligibles : consultation terminée non notée → cabinet proposé (nom via GET /cabinets)', async () => {
    repondreAvis();
    repondreConsultations([CONSULTATION_TERMINEE]);
    repondreCabinets([{ id: 6, nom: 'Vision Plus', ville: 'Douala' }]);

    await fixture.whenStable();

    expect(component.cabinetsEligibles()).toEqual([
      { id: '6', nom: 'Vision Plus', dateVisite: '01/10/2026', consultationId: '114' },
    ]);
  });

  it('éligibles : une consultation non terminée ne propose aucun cabinet', async () => {
    repondreAvis();
    repondreConsultations([{ ...CONSULTATION_TERMINEE, statut: 'en_cours' }]);

    await fixture.whenStable();

    expect(component.cabinetsEligibles()).toEqual([]);
  });

  it('supprimer() : DELETE /avis/{id} retire la carte après succès', async () => {
    repondreAvis([
      { id: 4, note: 4, commentaire: 'Bon accueil', created_at: '2026-10-12T00:00:00Z', cabinet: { id: 6, nom: 'Vision Plus' } },
    ]);
    repondreConsultations();
    await fixture.whenStable();

    component.supprimer(component.avisPublies()[0]);

    const req = http.expectOne((r) => r.url.endsWith('/avis/4'));
    expect(req.request.method).toBe('DELETE');
    req.flush({ status: 'success', message: 'Avis supprimé avec succès.', data: null });

    expect(component.avisPublies()).toEqual([]);
  });

  it('publier() : POST /avis avec consultation_id, note et commentaire', async () => {
    repondreAvis();
    repondreConsultations([CONSULTATION_TERMINEE]);
    repondreCabinets([{ id: 6, nom: 'Vision Plus', ville: 'Douala' }]);
    await fixture.whenStable();

    component.ouvrirFormulaire(component.cabinetsEligibles()[0]);
    component.choisirNote(5);
    component.commentaireSaisi = 'Excellent';
    component.publier();

    const req = http.expectOne((r) => r.url.endsWith('/avis'));
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual({ consultation_id: 114, note: 5, commentaire: 'Excellent' });
    req.flush({
      status: 'success',
      message: 'Merci pour votre avis !',
      data: { avis: { id: 12, note: 5, commentaire: 'Excellent', created_at: '2026-10-20T00:00:00Z', cabinet: { id: 6, nom: 'Vision Plus' } } },
    });

    expect(component.avisPublies()).toHaveLength(1);
    // La consultation ne peut plus recevoir d'avis : elle quitte la liste d'attente.
    expect(component.cabinetsEligibles()).toEqual([]);
  });

  it('commentaire trop long : formulaire invalide, aucun appel réseau', async () => {
    repondreAvis();
    repondreConsultations([CONSULTATION_TERMINEE]);
    repondreCabinets([{ id: 6, nom: 'Vision Plus', ville: 'Douala' }]);
    await fixture.whenStable();

    component.ouvrirFormulaire(component.cabinetsEligibles()[0]);
    component.choisirNote(4);
    component.commentaireSaisi = 'a'.repeat(1001);

    expect(component.commentaireTropLong).toBe(true);
    expect(component.formulaireValide).toBe(false);

    component.publier();

    // Aucune requête POST ne part : le backend aurait renvoyé 422.
    http.expectNone((r) => r.url.endsWith('/avis'));
  });

  it('échec 500 (règle métier) : le message du serveur est affiché', async () => {
    repondreAvis();
    repondreConsultations([CONSULTATION_TERMINEE]);
    repondreCabinets([{ id: 6, nom: 'Vision Plus', ville: 'Douala' }]);
    await fixture.whenStable();

    component.ouvrirFormulaire(component.cabinetsEligibles()[0]);
    component.choisirNote(5);
    component.commentaireSaisi = 'Très bien';
    component.publier();

    http.expectOne((r) => r.url.endsWith('/avis')).flush(
      { status: 'error', message: 'Cette consultation ne peut plus recevoir d’avis.' },
      { status: 500, statusText: 'Server Error' },
    );

    expect(component.erreurAction()).toBe('Cette consultation ne peut plus recevoir d’avis.');
    expect(component.avisPublies()).toEqual([]);
  });

  it('échec 422 (validation) : le message du serveur prime, sinon un message d’aide', async () => {
    repondreAvis();
    repondreConsultations([CONSULTATION_TERMINEE]);
    repondreCabinets([{ id: 6, nom: 'Vision Plus', ville: 'Douala' }]);
    await fixture.whenStable();

    component.ouvrirFormulaire(component.cabinetsEligibles()[0]);
    component.choisirNote(5);
    component.commentaireSaisi = 'Bien';
    component.publier();

    http.expectOne((r) => r.url.endsWith('/avis')).flush(
      { status: 'error', message: 'La note doit être entre 1 et 5.' },
      { status: 422, statusText: 'Unprocessable Entity' },
    );

    expect(component.erreurAction()).toBe('La note doit être entre 1 et 5.');
    expect(component.avisPublies()).toEqual([]);
  });
});
