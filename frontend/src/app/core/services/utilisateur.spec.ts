import { TestBed } from '@angular/core/testing';

import { Utilisateur } from './utilisateur';

describe('Utilisateur', () => {
  let service: Utilisateur;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(Utilisateur);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
