import { ComponentFixture, TestBed } from '@angular/core/testing';

import { PriseRdv } from './prise-rdv';

describe('PriseRdv', () => {
  let component: PriseRdv;
  let fixture: ComponentFixture<PriseRdv>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PriseRdv],
    }).compileComponents();

    fixture = TestBed.createComponent(PriseRdv);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
