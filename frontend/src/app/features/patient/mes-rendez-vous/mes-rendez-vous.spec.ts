import { ComponentFixture, TestBed } from '@angular/core/testing';
import { registerLocaleData } from '@angular/common';
import localeFr from '@angular/common/locales/fr';
import { provideRouter } from '@angular/router';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';

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
});
