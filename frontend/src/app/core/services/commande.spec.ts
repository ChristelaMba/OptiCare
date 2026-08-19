import { TestBed } from '@angular/core/testing';

import { Commande } from './commande';

describe('Commande', () => {
  let service: Commande;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(Commande);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
