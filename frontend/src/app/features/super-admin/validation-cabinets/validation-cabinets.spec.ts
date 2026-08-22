import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { provideHttpClientTesting } from '@angular/common/http/testing';

import { ValidationCabinets } from './validation-cabinets';

describe('ValidationCabinets', () => {
  let component: ValidationCabinets;
  let fixture: ComponentFixture<ValidationCabinets>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ValidationCabinets],
      providers: [provideRouter([]), provideHttpClientTesting()],
    }).compileComponents();

    fixture = TestBed.createComponent(ValidationCabinets);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
