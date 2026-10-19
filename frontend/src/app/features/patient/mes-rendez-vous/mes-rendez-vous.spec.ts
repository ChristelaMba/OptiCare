import { ComponentFixture, TestBed } from '@angular/core/testing';
import { registerLocaleData } from '@angular/common';
import localeFr from '@angular/common/locales/fr';
import { provideRouter } from '@angular/router';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';

import { MesRendezVous } from './mes-rendez-vous';
import { RendezVous } from '../../../models/rendez-vous.model';

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
});
