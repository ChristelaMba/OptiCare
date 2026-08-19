import { TestBed } from '@angular/core/testing';

import { Ordonnance } from './ordonnance';

describe('Ordonnance', () => {
  let service: Ordonnance;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(Ordonnance);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
