import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ValidationCabinets } from './validation-cabinets';

describe('ValidationCabinets', () => {
  let component: ValidationCabinets;
  let fixture: ComponentFixture<ValidationCabinets>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ValidationCabinets],
    }).compileComponents();

    fixture = TestBed.createComponent(ValidationCabinets);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
