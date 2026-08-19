import { ComponentFixture, TestBed } from '@angular/core/testing';

import { EnregistrementPatient } from './enregistrement-patient';

describe('EnregistrementPatient', () => {
  let component: EnregistrementPatient;
  let fixture: ComponentFixture<EnregistrementPatient>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [EnregistrementPatient],
    }).compileComponents();

    fixture = TestBed.createComponent(EnregistrementPatient);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
