import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';

import { Avis } from './avis';

describe('Avis', () => {
  let service: Avis;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(Avis);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    http.verify();
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('listerParCabinetAvecAgregat() : GET /cabinets/{id}/avis, renvoie data (avis + moyenne + total + repartition)', () => {
    let resultat: unknown;
    service.listerParCabinetAvecAgregat('8').subscribe((r) => (resultat = r));

    const req = http.expectOne((r) => r.url.endsWith('/cabinets/8/avis'));
    expect(req.request.method).toBe('GET');
    req.flush({
      status: 'success',
      message: '',
      data: {
        avis: [{ id: 1, note: 5, commentaire: 'ok', created_at: '2026-10-10T00:00:00Z', patient: null }],
        moyenne: 4.5,
        total: 10,
        repartition: { '1': 0, '2': 1, '3': 2, '4': 3, '5': 4 },
      },
    });

    expect(resultat).toMatchObject({
      moyenne: 4.5,
      total: 10,
      repartition: { '5': 4 },
    });
    expect((resultat as { avis: unknown[] }).avis).toHaveLength(1);
  });

  it('listerParCabinet() : GET /cabinets/{id}/avis, ne garde que la liste data.avis', () => {
    let resultat: unknown;
    service.listerParCabinet('8').subscribe((r) => (resultat = r));

    const req = http.expectOne((r) => r.url.endsWith('/cabinets/8/avis'));
    expect(req.request.method).toBe('GET');
    req.flush({
      status: 'success',
      message: '',
      data: {
        avis: [{ id: 1, note: 5, commentaire: 'ok', created_at: '2026-10-10T00:00:00Z', patient: null }],
        moyenne: 5,
        total: 1,
        repartition: {},
      },
    });

    expect(resultat).toHaveLength(1);
  });

  it('listerMesAvis() : GET /patient/avis, renvoie data.avis[]', () => {
    let resultat: unknown;
    service.listerMesAvis().subscribe((r) => (resultat = r));

    const req = http.expectOne((r) => r.url.endsWith('/patient/avis'));
    expect(req.request.method).toBe('GET');
    req.flush({
      status: 'success',
      message: '',
      data: {
        avis: [
          { id: 4, note: 4, commentaire: 'Bien', created_at: '2026-10-12T00:00:00Z', cabinet: { id: 6, nom: 'Vision Plus' } },
        ],
      },
    });

    expect(resultat).toEqual([
      { id: 4, note: 4, commentaire: 'Bien', created_at: '2026-10-12T00:00:00Z', cabinet: { id: 6, nom: 'Vision Plus' } },
    ]);
  });

  it('creer() : POST /avis, corps consultation_id/note/commentaire, lit data.avis', () => {
    let resultat: unknown;
    service
      .creer({ consultation_id: 114, note: 5, commentaire: 'Parfait' })
      .subscribe((r) => (resultat = r));

    const req = http.expectOne((r) => r.url.endsWith('/avis'));
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual({ consultation_id: 114, note: 5, commentaire: 'Parfait' });
    req.flush({
      status: 'success',
      message: 'Merci pour votre avis !',
      data: { avis: { id: 12, note: 5, commentaire: 'Parfait', created_at: '2026-10-20T00:00:00Z', cabinet: { id: 6, nom: 'Vision Plus' } } },
    });

    expect(resultat).toMatchObject({ id: 12, note: 5 });
  });

  it('modifier() : PATCH /avis/{id}', () => {
    let resultat: unknown;
    service.modifier('12', { note: 3, commentaire: 'Moyen' }).subscribe((r) => (resultat = r));

    const req = http.expectOne((r) => r.url.endsWith('/avis/12'));
    expect(req.request.method).toBe('PATCH');
    expect(req.request.body).toEqual({ note: 3, commentaire: 'Moyen' });
    req.flush({
      status: 'success',
      message: '',
      data: { avis: { id: 12, note: 3, commentaire: 'Moyen', created_at: '2026-10-20T00:00:00Z' } },
    });

    expect(resultat).toMatchObject({ id: 12, note: 3 });
  });

  it('supprimer() : DELETE /avis/{id}', () => {
    let termine = false;
    service.supprimer('12').subscribe(() => (termine = true));

    const req = http.expectOne((r) => r.url.endsWith('/avis/12'));
    expect(req.request.method).toBe('DELETE');
    req.flush({ status: 'success', message: 'Avis supprimé avec succès.', data: null });

    expect(termine).toBe(true);
  });
});
