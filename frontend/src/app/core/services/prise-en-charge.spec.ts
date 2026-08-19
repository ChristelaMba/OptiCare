import { TestBed } from '@angular/core/testing';

import { PriseEnCharge } from './prise-en-charge';

describe('PriseEnCharge', () => {
  let service: PriseEnCharge;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(PriseEnCharge);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
