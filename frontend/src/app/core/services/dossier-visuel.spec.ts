import { TestBed } from '@angular/core/testing';

import { DossierVisuel } from './dossier-visuel';

describe('DossierVisuel', () => {
  let service: DossierVisuel;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(DossierVisuel);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
