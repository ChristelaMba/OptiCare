import { TestBed } from '@angular/core/testing';

import { Facture } from './facture';

describe('Facture', () => {
  let service: Facture;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(Facture);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
