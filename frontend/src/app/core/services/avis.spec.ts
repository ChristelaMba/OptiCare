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

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('listerParCabinet() : GET /cabinets/{id}/avis, renvoie data.avis', () => {
    let resultat: unknown;
    service.listerParCabinet('8').subscribe((r) => (resultat = r));

    const req = http.expectOne((r) => r.url.endsWith('/cabinets/8/avis'));
    expect(req.request.method).toBe('GET');
    req.flush({
      status: 'success',
      message: '',
      data: { avis: [{ id: 1, note: 5, commentaire: 'ok', created_at: '2026-10-10T00:00:00Z', patient: null }], moyenne: 5, total: 1, repartition: {} },
    });

    expect(resultat).toHaveLength(1);
  });
});
