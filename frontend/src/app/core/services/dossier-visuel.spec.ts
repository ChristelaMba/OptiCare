import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';

import { DossierVisuelService } from './dossier-visuel';

describe('DossierVisuelService', () => {
  let service: DossierVisuelService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(DossierVisuelService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
