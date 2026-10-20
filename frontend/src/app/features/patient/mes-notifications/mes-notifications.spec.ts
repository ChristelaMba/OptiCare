import { ComponentFixture, TestBed } from '@angular/core/testing';
import { registerLocaleData } from '@angular/common';
import { provideRouter } from '@angular/router';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import localeFr from '@angular/common/locales/fr';

import { MesNotifications } from './mes-notifications';

// Le template utilise `| date:…:'fr'` : locale à enregistrer avant le rendu (NG0701).
registerLocaleData(localeFr);

const NOTIFICATIONS = [
  {
    id: 21,
    type: 'rdv_annule',
    title: '❌ RDV annulé',
    message: 'Votre RDV du 2026-10-23 00:00:00 à 09:00 a été annulé.',
    data: { rdv_id: 7 },
    is_read: false,
    read_at: null,
    created_at: '2026-10-19T04:13:19.000000Z',
  },
  {
    id: 19,
    type: 'rdv_confirme',
    title: '📅 RDV confirmé',
    message: 'Votre RDV du 2026-10-23 00:00:00 à 09:00 est confirmé.',
    data: { rdv_id: 7 },
    is_read: true,
    read_at: '2026-10-19T05:00:00.000000Z',
    created_at: '2026-10-19T04:12:52.000000Z',
  },
];

describe('MesNotifications', () => {
  let component: MesNotifications;
  let fixture: ComponentFixture<MesNotifications>;
  let http: HttpTestingController;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      providers: [provideRouter([]), provideHttpClient(), provideHttpClientTesting()],
      imports: [MesNotifications],
    }).compileComponents();

    fixture = TestBed.createComponent(MesNotifications);
    component = fixture.componentInstance;
    http = TestBed.inject(HttpTestingController);
  });

  async function repondre(corps: object, status = 200): Promise<HTMLElement> {
    http.expectOne((r) => r.url.endsWith('/notifications')).flush(corps, { status, statusText: 'x' });
    fixture.detectChanges();
    await fixture.whenStable();
    return fixture.nativeElement as HTMLElement;
  }

  function reponseListe(notifications: unknown[], nonLues: number): object {
    return { status: 'success', message: '', data: { notifications, non_lu_count: nonLues } };
  }

  it('should create', () => {
    fixture.detectChanges();
    http.expectOne((r) => r.url.endsWith('/notifications'));
    expect(component).toBeTruthy();
  });

  it('affiche les notifications réelles et le compteur du serveur, aucune donnée inventée', async () => {
    const el = await repondre(reponseListe(NOTIFICATIONS, 1));
    const texte = el.textContent ?? '';

    expect(component.notifications().length).toBe(2);
    expect(component.notificationsNonLues()).toBe(1);
    expect(texte).toContain('RDV annulé');
    expect(texte).not.toContain('Jean Mbarga');
    expect(texte).not.toContain('10 septembre');
  });

  it("le titre perd l'emoji de l'API et le type est ramené aux types d'affichage", async () => {
    await repondre(reponseListe(NOTIFICATIONS, 1));

    expect(component.notifications()[0].titre).toBe('RDV annulé');
    expect(component.notifications()[0].type).toBe('rendez-vous');
    expect(component.notifications()[0].lue).toBe(false);
  });

  it('liste vide : état vide honnête, compteur à 0', async () => {
    const el = await repondre(reponseListe([], 0));

    expect(component.notificationsNonLues()).toBe(0);
    expect(el.textContent).toContain("Vous n'avez aucune notification");
  });

  it("erreur serveur : message d'erreur, pas de liste inventée", async () => {
    await repondre({ message: 'boom' }, 500);

    expect(component.erreur()).toContain('Impossible de charger vos notifications');
    expect(component.notifications()).toEqual([]);
  });

  it('marquer comme lue : PUT /notifications/{id}/read, puis la notification est lue et le compteur baisse', async () => {
    await repondre(reponseListe(NOTIFICATIONS, 1));

    component.marquerCommeLue(component.notifications()[0]);

    const req = http.expectOne((r) => r.url.endsWith('/notifications/21/read'));
    expect(req.request.method).toBe('PUT');
    expect(component.notifications()[0].lue).toBe(false);
    req.flush({ status: 'success', message: 'Notification marquée comme lue.', data: null });

    expect(component.notifications()[0].lue).toBe(true);
    expect(component.notificationsNonLues()).toBe(0);
    expect(component.erreurAction()).toBeNull();
  });

  it("échec du marquage : rien ne change à l'écran, message d'erreur", async () => {
    await repondre(reponseListe(NOTIFICATIONS, 1));

    component.marquerCommeLue(component.notifications()[0]);
    http.expectOne((r) => r.url.endsWith('/notifications/21/read')).flush({ message: 'boom' }, { status: 500, statusText: 'x' });

    expect(component.notifications()[0].lue).toBe(false);
    expect(component.notificationsNonLues()).toBe(1);
    expect(component.erreurAction()).toContain('Impossible de marquer');
  });

  it('tout marquer comme lu : PUT /notifications/read-all, tout est lu, compteur à 0', async () => {
    await repondre(reponseListe(NOTIFICATIONS, 1));

    component.toutMarquerCommeLu();

    const req = http.expectOne((r) => r.url.endsWith('/notifications/read-all'));
    expect(req.request.method).toBe('PUT');
    req.flush({ status: 'success', message: 'ok', data: null });

    expect(component.notifications().every((n) => n.lue)).toBe(true);
    expect(component.notificationsNonLues()).toBe(0);
  });

  it('une notification déjà lue ne déclenche aucun appel', async () => {
    await repondre(reponseListe(NOTIFICATIONS, 1));

    component.marquerCommeLue(component.notifications()[1]);

    http.expectNone((r) => r.url.includes('/read'));
    expect(component.notifications()[1].lue).toBe(true);
  });

  it('plus de suppression locale (aucune route de suppression)', async () => {
    const el = await repondre(reponseListe(NOTIFICATIONS, 1));

    expect(el.querySelector('.delete-btn')).toBeNull();
    expect(el.querySelector('.clear-button')).toBeNull();
  });

  it('dates brutes du serveur écrites en français à l’affichage, donnée reçue intacte', async () => {
    const el = await repondre(reponseListe(NOTIFICATIONS, 1));
    const texte = el.textContent ?? '';

    expect(texte).toContain('Votre RDV du 23 octobre 2026 à 09:00 a été annulé.');
    expect(texte).toContain('Votre RDV du 23 octobre 2026 à 09:00 est confirmé.');
    expect(texte).not.toMatch(/\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}/);
    // la donnée reçue n'est pas modifiée (seul l'affichage l'est)
    expect(component.notifications()[0].message).toBe('Votre RDV du 2026-10-23 00:00:00 à 09:00 a été annulé.');
  });
});
