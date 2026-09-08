import { TestBed } from '@angular/core/testing';

import { Cabinet } from './cabinet';

describe('Cabinet', () => {
  let service: Cabinet;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(Cabinet);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
