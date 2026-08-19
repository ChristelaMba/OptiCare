import { TestBed } from '@angular/core/testing';

import { FicheConsultation } from './fiche-consultation';

describe('FicheConsultation', () => {
  let service: FicheConsultation;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(FicheConsultation);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
