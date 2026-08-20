import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';

import { InscriptionPatient } from './inscription-patient';

describe('InscriptionPatient', () => {
  let component: InscriptionPatient;
  let fixture: ComponentFixture<InscriptionPatient>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [InscriptionPatient],
      providers: [provideRouter([])],
    }).compileComponents();

    fixture = TestBed.createComponent(InscriptionPatient);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
