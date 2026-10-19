import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';

import { Notification } from './notification';

describe('Notification', () => {
  let service: Notification;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(Notification);
    http = TestBed.inject(HttpTestingController);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('lister() : GET /notifications, renvoie la liste et le compteur de non lues du serveur', () => {
    let resultat: unknown;
    service.lister().subscribe((r) => (resultat = r));

    const req = http.expectOne((r) => r.url.endsWith('/notifications'));
    expect(req.request.method).toBe('GET');
    req.flush({ status: 'success', message: '', data: { notifications: [], non_lu_count: 3 } });

    expect(resultat).toEqual({ notifications: [], nonLues: 3 });
  });
});
